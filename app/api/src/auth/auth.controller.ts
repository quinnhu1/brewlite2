import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiAuthRequired, ApiConflict, ApiValidationError } from '../common/api-docs.js';
import { RateLimit, RateLimitGuard } from '../common/rate-limit.guard.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { AuthUser } from './jwt-auth.guard.js';
import { Public } from './public.decorator.js';

@ApiTags('auth')
@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản khách (role luôn là customer)' })
  @ApiValidationError('phone phải gồm 10 chữ số và bắt đầu bằng 0.')
  @ApiConflict('Trùng số điện thoại hoặc email.', 'Số điện thoại hoặc email đã được sử dụng.')
  @RateLimit({ limit: 5, windowMs: 10 * 60_000 })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Đăng nhập bằng email hoặc số điện thoại, nhận accessToken (Bearer)' })
  @ApiAuthRequired()
  @RateLimit({ limit: 10, windowMs: 60_000 })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiAuthRequired()
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Patch('me')
  @ApiBearerAuth()
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.auth.updateProfile(user.user_id, dto);
  }

  @Post('change-password')
  @HttpCode(200)
  @ApiBearerAuth()
  @RateLimit({ limit: 10, windowMs: 10 * 60_000 })
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(user.user_id, dto);
  }
}
