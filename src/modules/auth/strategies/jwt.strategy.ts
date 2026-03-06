import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'medeffects_jwt_secret_key_2025',
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.userModel
      .findById(payload.sub)
      .select('-password -refreshToken')
      .lean();

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Update lastActivity so the refresh-token idle check knows the user is active.
    // Fire-and-forget to avoid blocking the request.
    this.userModel.updateOne({ _id: payload.sub }, { lastActivity: new Date() }).exec();

    return {
      _id: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
