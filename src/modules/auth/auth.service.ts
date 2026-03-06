import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../users/schemas/user.schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

// HIPAA: Increased bcrypt rounds for stronger password hashing
const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existing = await this.userModel.findOne({ email: registerDto.email.toLowerCase() });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, BCRYPT_ROUNDS);
    const user = await this.userModel.create({
      ...registerDto,
      email: registerDto.email.toLowerCase(),
      password: hashedPassword,
      role: registerDto.role || 'patient',
    });

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userModel.findOne({ email: loginDto.email.toLowerCase() });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // HIPAA: Check account lockout
    const maxAttempts = parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS || '5', 10);
    const lockoutDurationMs = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION || '1800000', 10); // 30 min

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const lockedUntil = new Date(user.lockedUntil).toISOString();
      throw new UnauthorizedException(
        `Account is temporarily locked due to too many failed login attempts. Try again after ${lockedUntil}`,
      );
    }

    // If lock has expired, reset the counter
    if (user.lockedUntil && new Date(user.lockedUntil) <= new Date()) {
      await this.userModel.findByIdAndUpdate(user._id, {
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      // HIPAA: Track failed login attempt
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateData: any = { failedLoginAttempts: newFailedAttempts };

      if (newFailedAttempts >= maxAttempts) {
        updateData.lockedUntil = new Date(Date.now() + lockoutDurationMs);
      }

      await this.userModel.findByIdAndUpdate(user._id, updateData);
      throw new UnauthorizedException('Invalid email or password');
    }

    // HIPAA: Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await this.userModel.findByIdAndUpdate(user._id, {
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    // Track last activity for HIPAA session timeout
    await this.userModel.findByIdAndUpdate(user._id, { lastActivity: new Date() });

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'medeffects_jwt_refresh_secret_key_2025',
      });

      const user = await this.userModel.findById(payload.sub);
      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // HIPAA: Check idle timeout (default 15 minutes of inactivity)
      const idleTimeoutMs = parseInt(process.env.SESSION_IDLE_TIMEOUT || '900000', 10); // 15 min
      if (user.lastActivity) {
        const idleTime = Date.now() - new Date(user.lastActivity).getTime();
        if (idleTime > idleTimeoutMs) {
          // Clear refresh token — force re-login
          await this.userModel.findByIdAndUpdate(user._id, { refreshToken: null });
          throw new UnauthorizedException('Session expired due to inactivity');
        }
      }

      const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user);
      await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

      // Update last activity on token refresh
      await this.userModel.findByIdAndUpdate(user._id, { lastActivity: new Date() });

      return tokens;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password = await bcrypt.hash(changePasswordDto.newPassword, BCRYPT_ROUNDS);
    await user.save();

    return { message: 'Password changed successfully' };
  }

  private async generateTokens(user: UserDocument) {
    const payload = { sub: user._id.toString(), email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'medeffects_jwt_secret_key_2025',
        expiresIn: (process.env.JWT_EXPIRY || '15m') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'medeffects_jwt_refresh_secret_key_2025',
        expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userModel.findByIdAndUpdate(userId, { refreshToken: hashedRefreshToken });
  }

  private sanitizeUser(user: UserDocument) {
    const obj = user.toObject();
    delete obj.password;
    delete obj.refreshToken;
    return obj;
  }
}
