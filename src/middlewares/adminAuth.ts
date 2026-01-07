import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './errorHandler';
import AppDataSource from '../config/database';
import { Admin, AdminRole } from '../entities/Admin';

export interface AdminJwtPayload {
  adminId: string;
  email: string;
  role: AdminRole;
  iat: number;
  exp: number;
}

export interface AdminRequest extends Request {
  admin?: AdminJwtPayload;
  currentAdmin?: Admin;
}

/**
 * Authenticate admin using JWT token
 */
export const authenticateAdmin = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No admin token provided', 401, 'NO_TOKEN');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as AdminJwtPayload;

    // Check if admin exists and is active
    const adminRepository = AppDataSource.getRepository(Admin);
    const admin = await adminRepository.findOne({
      where: { id: decoded.adminId, isActive: true },
    });

    if (!admin) {
      throw new AppError('Admin not found or inactive', 401, 'ADMIN_NOT_FOUND');
    }

    // Attach admin to request
    req.admin = decoded;
    req.currentAdmin = admin;

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid admin token', 401, 'INVALID_TOKEN'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Admin token has expired', 401, 'TOKEN_EXPIRED'));
    }
    next(error);
  }
};

/**
 * Authorize specific admin roles
 */
export const authorizeAdmin = (...roles: AdminRole[]) => {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return next(new AppError('Admin authentication required', 401, 'AUTH_REQUIRED'));
    }

    if (!roles.includes(req.admin.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN')
      );
    }

    next();
  };
};

/**
 * Generate admin JWT token
 */
export const generateAdminToken = (admin: Admin): string => {
  const payload: Omit<AdminJwtPayload, 'iat' | 'exp'> = {
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: '24h',
  });
};

/**
 * Generate admin refresh token
 */
export const generateAdminRefreshToken = (admin: Admin): string => {
  const payload: Omit<AdminJwtPayload, 'iat' | 'exp'> = {
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
  };

  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: '7d',
  });
};

export default {
  authenticateAdmin,
  authorizeAdmin,
  generateAdminToken,
  generateAdminRefreshToken,
};
