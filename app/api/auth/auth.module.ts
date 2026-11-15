import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { AdminGuard } from './admin.guard.js';
import { StaffGuard } from './staff.guard.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          // Báo lỗi rõ ngay khi khởi động, thay vì chạy với khóa rỗng (rất nguy hiểm)
          throw new Error('Thiếu JWT_SECRET trong file .env');
        }
        return {
          secret,
          signOptions: {
            expiresIn: Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 604800),
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, StaffGuard, AdminGuard],
  // Cho module khác (orders, payments) dùng guard bằng imports: [AuthModule]
  exports: [JwtModule, JwtAuthGuard, StaffGuard, AdminGuard],
})
export class AuthModule {}
