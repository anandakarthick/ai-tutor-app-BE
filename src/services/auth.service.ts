import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import AppDataSource from '../config/database';
import { User, UserRole, AuthProvider } from '../entities/User';
import { Otp, OtpPurpose } from '../entities/Otp';
import { config } from '../config';
import { AppError } from '../middlewares/errorHandler';
import { cacheService, redisClient } from '../config/redis';
import { logger } from '../utils/logger';

interface RegisterDto {
  fullName: string;
  phone: string;
  email?: string;
  password?: string;
  role?: UserRole;
  authProvider?: AuthProvider;
  googleId?: string;
  facebookId?: string;
}

interface LoginDto {
  phone: string;
  password?: string;
  otp?: string;
}

interface TokenPayload {
  userId: string;
  email?: string;
  phone: string;
  role: UserRole;
}

export class AuthService {
  private userRepository: Repository<User>;
  private otpRepository: Repository<Otp>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.otpRepository = AppDataSource.getRepository(Otp);
  }

  /**
   * Generate OTP
   */
  async generateOtp(phone: string, purpose: OtpPurpose = OtpPurpose.LOGIN): Promise<string> {
    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + config.otp.expiryMinutes);

    // Save OTP
    const otp = this.otpRepository.create({
      identifier: phone,
      code,
      purpose,
      expiresAt,
    });
    await this.otpRepository.save(otp);

    // In production, send OTP via SMS
    logger.info(`OTP generated for ${phone}: ${code}`);

    return code;
  }

  /**
   * Verify OTP (just validates, doesn't mark as used)
   */
  async verifyOtp(phone: string, code: string, purpose: OtpPurpose = OtpPurpose.LOGIN): Promise<boolean> {
    const otp = await this.otpRepository.findOne({
      where: {
        identifier: phone,
        code,
        purpose,
        isUsed: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (!otp) {
      throw new AppError('Invalid OTP', 400, 'INVALID_OTP');
    }

    if (new Date() > otp.expiresAt) {
      throw new AppError('OTP has expired', 400, 'OTP_EXPIRED');
    }

    if (otp.attempts >= 3) {
      throw new AppError('Too many attempts. Please request a new OTP', 400, 'TOO_MANY_ATTEMPTS');
    }

    // Increment attempts but DON'T mark as used yet
    // OTP will be marked as used when login/register completes
    otp.attempts += 1;
    await this.otpRepository.save(otp);

    return true;
  }

  /**
   * Consume OTP (mark as used after successful login/register)
   */
  private async consumeOtp(phone: string, code: string, purpose: OtpPurpose = OtpPurpose.LOGIN): Promise<void> {
    const otp = await this.otpRepository.findOne({
      where: {
        identifier: phone,
        code,
        purpose,
        isUsed: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (otp) {
      otp.isUsed = true;
      otp.usedAt = new Date();
      await this.otpRepository.save(otp);
    }
  }

  /**
   * Verify and consume OTP in one step (for endpoints that don't need separate verify)
   */
  async verifyAndConsumeOtp(phone: string, code: string, purpose: OtpPurpose = OtpPurpose.LOGIN): Promise<boolean> {
    await this.verifyOtp(phone, code, purpose);
    await this.consumeOtp(phone, code, purpose);
    return true;
  }

  /**
   * Register new user
   */
  async register(data: RegisterDto): Promise<{ user: User; tokens: { accessToken: string; refreshToken: string } }> {
    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: [
        { phone: data.phone },
        ...(data.email ? [{ email: data.email }] : []),
      ],
    });

    if (existingUser) {
      throw new AppError('User with this phone or email already exists', 400, 'USER_EXISTS');
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 12);
    }

    // Create user
    const user = this.userRepository.create({
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      password: hashedPassword,
      role: data.role || UserRole.PARENT,
      authProvider: data.authProvider || AuthProvider.LOCAL,
      googleId: data.googleId,
      facebookId: data.facebookId,
      isPhoneVerified: true, // Assuming OTP was verified before registration
    });

    await this.userRepository.save(user);

    // Mark OTP as used after successful registration
    await this.consumeOtp(data.phone, '', OtpPurpose.REGISTRATION);

    // Generate tokens
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });

    // Save refresh token
    user.refreshToken = tokens.refreshToken;
    await this.userRepository.save(user);

    // Remove sensitive data
    delete (user as any).password;
    delete (user as any).refreshToken;

    return { user, tokens };
  }

  /**
   * Login with phone and OTP
   */
  async loginWithOtp(data: LoginDto): Promise<{ user: User; tokens: { accessToken: string; refreshToken: string } }> {
    const { phone, otp } = data;

    if (!otp) {
      throw new AppError('OTP is required', 400, 'OTP_REQUIRED');
    }

    // Find user first (before consuming OTP)
    let user = await this.userRepository.findOne({ where: { phone } });

    if (!user) {
      throw new AppError('User not found. Please register first.', 404, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated', 403, 'ACCOUNT_INACTIVE');
    }

    // Verify and consume OTP
    await this.verifyAndConsumeOtp(phone, otp);

    // Update last login
    user.lastLoginAt = new Date();
    user.isPhoneVerified = true;

    // Generate tokens
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });

    user.refreshToken = tokens.refreshToken;
    await this.userRepository.save(user);

    // Remove sensitive data
    delete (user as any).password;
    delete (user as any).refreshToken;

    return { user, tokens };
  }

  /**
   * Login with email and password
   */
  async loginWithPassword(email: string, password: string): Promise<{ user: User; tokens: { accessToken: string; refreshToken: string } }> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'phone', 'password', 'role', 'isActive', 'fullName'],
    });

    if (!user || !user.password) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated', 403, 'ACCOUNT_INACTIVE');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Update last login
    user.lastLoginAt = new Date();

    // Generate tokens
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });

    user.refreshToken = tokens.refreshToken;
    await this.userRepository.save(user);

    // Remove sensitive data
    delete (user as any).password;
    delete (user as any).refreshToken;

    return { user, tokens };
  }

  /**
   * Social login (Google/Facebook)
   */
  async socialLogin(
    provider: AuthProvider,
    profile: { id: string; email?: string; name: string; phone?: string }
  ): Promise<{ user: User; tokens: { accessToken: string; refreshToken: string }; isNewUser: boolean }> {
    let user: User | null = null;
    let isNewUser = false;

    // Find existing user
    if (provider === AuthProvider.GOOGLE) {
      user = await this.userRepository.findOne({ where: { googleId: profile.id } });
    } else if (provider === AuthProvider.FACEBOOK) {
      user = await this.userRepository.findOne({ where: { facebookId: profile.id } });
    }

    // If not found by provider ID, try email
    if (!user && profile.email) {
      user = await this.userRepository.findOne({ where: { email: profile.email } });
      if (user) {
        // Link social account
        if (provider === AuthProvider.GOOGLE) {
          user.googleId = profile.id;
        } else if (provider === AuthProvider.FACEBOOK) {
          user.facebookId = profile.id;
        }
      }
    }

    // Create new user if not found
    if (!user) {
      isNewUser = true;
      user = this.userRepository.create({
        fullName: profile.name,
        email: profile.email,
        phone: profile.phone || '',
        authProvider: provider,
        googleId: provider === AuthProvider.GOOGLE ? profile.id : undefined,
        facebookId: provider === AuthProvider.FACEBOOK ? profile.id : undefined,
        isEmailVerified: true,
      });
    }

    user.lastLoginAt = new Date();

    // Generate tokens
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });

    user.refreshToken = tokens.refreshToken;
    await this.userRepository.save(user);

    // Remove sensitive data
    delete (user as any).password;
    delete (user as any).refreshToken;

    return { user, tokens, isNewUser };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as TokenPayload;

      const user = await this.userRepository.findOne({
        where: { id: decoded.userId },
        select: ['id', 'email', 'phone', 'role', 'refreshToken', 'isActive'],
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }

      if (!user.isActive) {
        throw new AppError('Your account has been deactivated', 403, 'ACCOUNT_INACTIVE');
      }

      // Generate new tokens
      const tokens = this.generateTokens({
        userId: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
      });

      // Update refresh token
      user.refreshToken = tokens.refreshToken;
      await this.userRepository.save(user);

      // Blacklist old refresh token
      await this.blacklistToken(refreshToken, 'refresh');

      return tokens;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Refresh token has expired', 401, 'REFRESH_TOKEN_EXPIRED');
      }
      throw error;
    }
  }

  /**
   * Logout
   */
  async logout(userId: string, accessToken: string, refreshToken?: string): Promise<void> {
    // Blacklist access token
    await this.blacklistToken(accessToken, 'access');

    // Blacklist refresh token if provided
    if (refreshToken) {
      await this.blacklistToken(refreshToken, 'refresh');
    }

    // Clear refresh token from user
    await this.userRepository.update(userId, { refreshToken: undefined });
  }

  /**
   * Update FCM token
   */
  async updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    await this.userRepository.update(userId, { fcmToken });
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(payload: TokenPayload): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Blacklist token
   */
  private async blacklistToken(token: string, type: 'access' | 'refresh'): Promise<void> {
    if (!redisClient) return;

    const prefix = type === 'refresh' ? 'blacklist:refresh:' : 'blacklist:';
    const ttl = type === 'refresh' ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60; // 30 days or 7 days

    await redisClient.setex(`${prefix}${token}`, ttl, '1');
  }
}

export default new AuthService();
