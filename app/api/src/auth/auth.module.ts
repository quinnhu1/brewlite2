import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AdminGuard } from './admin.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { StaffGuard } from './staff.guard.js';

@Module({
  imports: [
    PrismaModule,
    // registerAsync so the secret is read when the module is instantiated, after
    // tests or dotenv have populated process.env.
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: {
          expiresIn: Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 604800),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, AdminGuard, StaffGuard],
  exports: [AuthService, JwtAuthGuard, AdminGuard, StaffGuard],
})
export class AuthModule {}
