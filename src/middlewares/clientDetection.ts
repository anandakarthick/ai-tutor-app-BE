import { Request, Response, NextFunction } from 'express';

export type ClientType = 'web' | 'mobile' | 'unknown';
export type ClientPlatform = 'ios' | 'android' | 'web' | 'unknown';

export interface ClientInfo {
  type: ClientType;
  platform: ClientPlatform;
  version?: string;
  userAgent?: string;
}

export interface ClientRequest extends Request {
  clientInfo?: ClientInfo;
}

/**
 * Middleware to detect client type (web/mobile) based on headers and user agent
 */
export const detectClientType = (
  req: ClientRequest,
  res: Response,
  next: NextFunction
) => {
  const clientTypeHeader = req.headers['x-client-type'] as string | undefined;
  const clientVersion = req.headers['x-client-version'] as string | undefined;
  const userAgent = req.headers['user-agent'] || '';

  let type: ClientType = 'unknown';
  let platform: ClientPlatform = 'unknown';

  // 1. Check explicit client type header (preferred)
  if (clientTypeHeader) {
    const lowerClientType = clientTypeHeader.toLowerCase();
    
    if (['web', 'browser'].includes(lowerClientType)) {
      type = 'web';
      platform = 'web';
    } else if (['ios', 'iphone', 'ipad'].includes(lowerClientType)) {
      type = 'mobile';
      platform = 'ios';
    } else if (['android'].includes(lowerClientType)) {
      type = 'mobile';
      platform = 'android';
    } else if (['mobile', 'react-native'].includes(lowerClientType)) {
      type = 'mobile';
      // Try to detect platform from user agent
      platform = detectPlatformFromUserAgent(userAgent);
    }
  }

  // 2. Fallback to user agent detection
  if (type === 'unknown') {
    const detectedInfo = detectFromUserAgent(userAgent);
    type = detectedInfo.type;
    platform = detectedInfo.platform;
  }

  // Attach client info to request
  req.clientInfo = {
    type,
    platform,
    version: clientVersion,
    userAgent,
  };

  // Add client type to response headers for debugging
  res.setHeader('X-Client-Detected', `${type}/${platform}`);

  next();
};

/**
 * Detect client type and platform from user agent string
 */
function detectFromUserAgent(userAgent: string): { type: ClientType; platform: ClientPlatform } {
  const ua = userAgent.toLowerCase();

  // Check for React Native
  if (ua.includes('react-native') || ua.includes('expo')) {
    const platform = detectPlatformFromUserAgent(ua);
    return { type: 'mobile', platform };
  }

  // Check for mobile apps
  if (ua.includes('okhttp') || ua.includes('dalvik')) {
    return { type: 'mobile', platform: 'android' };
  }

  if (ua.includes('cfnetwork') || ua.includes('darwin')) {
    return { type: 'mobile', platform: 'ios' };
  }

  // Check for mobile browsers
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    if (ua.includes('android')) {
      return { type: 'mobile', platform: 'android' };
    }
    if (ua.includes('iphone') || ua.includes('ipad')) {
      return { type: 'mobile', platform: 'ios' };
    }
    return { type: 'mobile', platform: 'unknown' };
  }

  // Check for web browsers
  if (
    ua.includes('mozilla') ||
    ua.includes('chrome') ||
    ua.includes('safari') ||
    ua.includes('firefox') ||
    ua.includes('edge') ||
    ua.includes('opera')
  ) {
    return { type: 'web', platform: 'web' };
  }

  return { type: 'unknown', platform: 'unknown' };
}

/**
 * Detect mobile platform from user agent
 */
function detectPlatformFromUserAgent(userAgent: string): ClientPlatform {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('android') || ua.includes('okhttp') || ua.includes('dalvik')) {
    return 'android';
  }
  
  if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad') || ua.includes('darwin')) {
    return 'ios';
  }
  
  return 'unknown';
}

/**
 * Middleware to require specific client type
 */
export const requireClientType = (...allowedTypes: ClientType[]) => {
  return (req: ClientRequest, res: Response, next: NextFunction) => {
    const clientType = req.clientInfo?.type || 'unknown';
    
    if (!allowedTypes.includes(clientType) && !allowedTypes.includes('unknown')) {
      return res.status(403).json({
        success: false,
        message: `This endpoint is not available for ${clientType} clients`,
        allowedTypes,
      });
    }
    
    next();
  };
};

/**
 * Helper to check if request is from web client
 */
export const isWebClient = (req: ClientRequest): boolean => {
  return req.clientInfo?.type === 'web';
};

/**
 * Helper to check if request is from mobile client
 */
export const isMobileClient = (req: ClientRequest): boolean => {
  return req.clientInfo?.type === 'mobile';
};

export default { detectClientType, requireClientType, isWebClient, isMobileClient };
