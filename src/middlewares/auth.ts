import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './errorHandler';
import AppDataSource from '../config/database';
import { User, UserRole } from '../entities/User';
import { redisClient } from '../config/redis';
import { ClientRequest, isWebClient } from './clientDetection';

export interface JwtPayload {
  userId: string;
  email?: string;
  phone: string;
  role: UserRole;
  sessionId: string;
  clientType?: 'web' | 'mobile';
  iat: number;
  exp: number;
}

export interface AuthRequest extends ClientRequest {
  user?: JwtPayload;
  currentUser?: User;
}

/**
 * Cookie configuration for web clients
 */
export const getCookieOptions = (maxAge?: number) => ({
  httpOnly: true,
  secure: config.web.cookieSecure,
  sameSite: 'lax' as const,
  domain: config.nodeEnv === 'production' ? config.web.cookieDomain : undefined,
  maxAge: maxAge || config.web.cookieMaxAge,
  path: '/',
});

/**
 * Set auth cookies for web clients
 */
export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  // Access token cookie (shorter expiry)
  res.cookie('access_token', accessToken, {
    ...getCookieOptions(24 * 60 * 60 * 1000), // 24 hours
  });

  // Refresh token cookie (longer expiry)
  res.cookie('refresh_token', refreshToken, {
    ...getCookieOptions(30 * 24 * 60 * 60 * 1000), // 30 days
  });
};

/**
 * Clear auth cookies for web clients
 */
export const clearAuthCookies = (res: Response) => {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
};

/**
 * Extract token from request (supports both header and cookie)
 */
const extractToken = (req: AuthRequest): string | null => {
  // 1. Check Authorization header first (mobile and web)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  // 2. Check cookies for web clients
  if (isWebClient(req) && req.cookies?.access_token) {
    return req.cookies.access_token;
  }

  // 3. Check query parameter (for WebSocket connections)
  if (req.query?.token && typeof req.query.token === 'string') {
    return req.query.token;
  }

  return null;
};

/**
 * Authenticate user using JWT token (supports both mobile and web)
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header, cookie, or query
    const token = extractToken(req);
    
    if (!token) {
      throw new AppError('No token provided', 401, 'NO_TOKEN');
    }

    // Check if token is blacklisted
    if (redisClient) {
      const isBlacklisted = await redisClient.get(`blacklist:${token}`);
      if (isBlacklisted) {
        // Clear cookies if web client
        if (isWebClient(req)) {
          clearAuthCookies(res);
        }
        throw new AppError('Token has been revoked', 401, 'TOKEN_REVOKED');
      }
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    
    // Check if user exists and is active
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: decoded.userId, isActive: true },
    });

    if (!user) {
      if (isWebClient(req)) {
        clearAuthCookies(res);
      }
      throw new AppError('User not found or inactive', 401, 'USER_NOT_FOUND');
    }

    // Check if session is still valid (single device login check)
    if (decoded.sessionId && user.activeSessionId) {
      if (decoded.sessionId !== user.activeSessionId) {
        if (isWebClient(req)) {
          clearAuthCookies(res);
        }
        throw new AppError(
          'Your session has been terminated because you logged in on another device.',
          401,
          'SESSION_TERMINATED'
        );
      }
    }

    // Check if session is invalidated in Redis
    if (decoded.sessionId && redisClient) {
      const isSessionInvalidated = await redisClient.get(`session:invalidated:${decoded.sessionId}`);
      if (isSessionInvalidated) {
        if (isWebClient(req)) {
          clearAuthCookies(res);
        }
        throw new AppError(
          'Your session has been terminated because you logged in on another device.',
          401,
          'SESSION_TERMINATED'
        );
      }
    }

    // Attach user to request
    req.user = decoded;
    req.currentUser = user;

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      if (isWebClient(req)) {
        clearAuthCookies(res);
      }
      return next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
    }
    if (error.name === 'TokenExpiredError') {
      if (isWebClient(req)) {
        clearAuthCookies(res);
      }
      return next(new AppError('Token has expired', 401, 'TOKEN_EXPIRED'));
    }
    next(error);
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return next();
    }

    // Check if token is blacklisted
    if (redisClient) {
      const isBlacklisted = await redisClient.get(`blacklist:${token}`);
      if (isBlacklisted) {
        return next();
      }
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: decoded.userId, isActive: true },
    });

    if (user) {
      req.user = decoded;
      req.currentUser = user;
    }

    next();
  } catch (error) {
    // Silently continue without authentication
    next();
  }
};

/**
 * Authorize specific roles
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN')
      );
    }

    next();
  };
};

/**
 * Verify refresh token (supports both cookie and body)
 */
export const verifyRefreshToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get refresh token from body or cookie
    let refreshToken = req.body.refreshToken;
    
    // For web clients, also check cookies
    if (!refreshToken && isWebClient(req) && req.cookies?.refresh_token) {
      refreshToken = req.cookies.refresh_token;
    }

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400, 'NO_REFRESH_TOKEN');
    }

    // Check if refresh token is blacklisted
    if (redisClient) {
      const isBlacklisted = await redisClient.get(`blacklist:refresh:${refreshToken}`);
      if (isBlacklisted) {
        if (isWebClient(req)) {
          clearAuthCookies(res);
        }
        throw new AppError('Refresh token has been revoked', 401, 'TOKEN_REVOKED');
      }
    }

    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as JwtPayload;

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: decoded.userId, isActive: true },
      select: ['id', 'email', 'phone', 'role', 'refreshToken', 'activeSessionId'],
    });

    if (!user || user.refreshToken !== refreshToken) {
      if (isWebClient(req)) {
        clearAuthCookies(res);
      }
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Check session validity
    if (decoded.sessionId && user.activeSessionId && decoded.sessionId !== user.activeSessionId) {
      if (isWebClient(req)) {
        clearAuthCookies(res);
      }
      throw new AppError(
        'Your session has been terminated because you logged in on another device.',
        401,
        'SESSION_TERMINATED'
      );
    }

    req.user = decoded;
    req.currentUser = user;

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      if (isWebClient(req)) {
        clearAuthCookies(res);
      }
      return next(new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN'));
    }
    if (error.name === 'TokenExpiredError') {
      if (isWebClient(req)) {
        clearAuthCookies(res);
      }
      return next(new AppError('Refresh token has expired', 401, 'REFRESH_TOKEN_EXPIRED'));
    }
    next(error);
  }
};

/**
 * Web-only middleware (rejects mobile clients)
 */
export const webOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!isWebClient(req)) {
    return next(new AppError('This endpoint is only available for web clients', 403, 'WEB_ONLY'));
  }
  next();
};

/**
 * Mobile-only middleware (rejects web clients)
 */
export const mobileOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (isWebClient(req)) {
    return next(new AppError('This endpoint is only available for mobile clients', 403, 'MOBILE_ONLY'));
  }
  next();
};

export default { 
  authenticate, 
  optionalAuth, 
  authorize, 
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  getCookieOptions,
  webOnly,
  mobileOnly,
};
