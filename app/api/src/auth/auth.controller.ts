import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RateLimit, RateLimitGuard } from '../common/rate-limit.guard.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
<<<<<<< HEAD
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { AuthUser } from './jwt-auth.guard.js';
import { Public } from './public.decorator.js';
=======
import { LoginDto } from './DTO/login.dto.js';
import { RegisterDto } from './DTO/register.dto.js';
import { UpdateProfileDto } from './DTO/update-profile.dto.js';
import { JwtAuthGuard, type AuthUser } from './jwt-auth.guard.js';
>>>>>>> 578391e (cập nhật forder ath)

@ApiTags('auth')
@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

<<<<<<< HEAD
  @Public()
=======
  // POST /auth/register
>>>>>>> 578391e (cập nhật forder ath)
  @Post('register')
  @RateLimit({ limit: 5, windowMs: 10 * 60_000 })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

<<<<<<< HEAD
  @Public()
=======
  // POST /auth/login (trả 200 thay vì 201 vì không tạo gì mới)
>>>>>>> 578391e (cập nhật forder ath)
  @Post('login')
  @HttpCode(200)
  @RateLimit({ limit: 10, windowMs: 60_000 })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  // GET /auth/me: cần token
  @Get('me')
  @ApiBearerAuth()
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.user_id);
  }

  // PATCH /auth/profile: cập nhật hồ sơ người đang đăng nhập.
  @Patch('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.user_id, dto);
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
