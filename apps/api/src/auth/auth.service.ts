import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './DTO/login.dto.js';
import { RegisterDto } from './DTO/register.dto.js';
import { UpdateProfileDto } from './DTO/update-profile.dto.js';

// Độ "nặng" của bcrypt khi băm mật khẩu.
// Số càng lớn càng an toàn nhưng càng chậm. 10 là mức thông dụng.
const SALT_ROUNDS = 10;

// Các cột được phép trả cho FE. Cố ý KHÔNG có "password".

const publicUserSelect = {
  user_id: true,
  email: true,
  name: true,
  phone: true,
  point: true,
  role: true,
} as const;

@Injectable()
export class AuthService {
  // NestJS tự đưa PrismaService (DB) và JwtService (ký token) vào đây.
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // ===================== ĐĂNG KÝ (POST /auth/register) =====================
  async register(dto: RegisterDto) {
    // Kiểm tra sớm cho thông báo dễ đọc; unique lower(email) ở DB chặn cả race condition.
    const emailExists = await this.prisma.users.findFirst({
      where: { email: { equals: dto.email, mode: 'insensitive' } },
      select: { user_id: true },
    });
    if (emailExists) {
      throw new ConflictException('Email đã được đăng ký'); // HTTP 409
    }

    // Băm mật khẩu. DB chỉ lưu chuỗi băm, KHÔNG lưu mật khẩu thật.
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    try {
      return await this.prisma.users.create({
        data: {
          email: dto.email,
          name: dto.name,
          phone: dto.phone,
          password: passwordHash, // cột "password" lưu chuỗi ĐÃ BĂM
        },
        select: publicUserSelect,
      });
    } catch (e) {
      // P2002 = vi phạm unique phone hoặc email chuẩn hóa.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Email hoặc số điện thoại đã được đăng ký');
      }
      throw e; // lỗi khác: ném lại, không che giấu
    }
  }

  // ===================== ĐĂNG NHẬP (POST /auth/login) =====================
  async login(dto: LoginDto) {
    // Hỗ trợ cả email lẫn số điện thoại như nhãn trên giao diện.
    const user = await this.prisma.users.findFirst({
      where: {
        OR: [
          { email: { equals: dto.identifier, mode: 'insensitive' } },
          { phone: dto.identifier },
        ],
      },
    });

    // So sánh mật khẩu nhập vào với chuỗi đã băm trong cột "password".
    const passwordOk =
      user !== null && (await bcrypt.compare(dto.password, user.password));

    // Sai email hoặc sai mật khẩu: cùng một thông báo (không lộ email nào tồn tại).
    if (!user || !passwordOk) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng'); // 401
    }

    // Ký token. Token lưu user_id, cùng tên với cột trong DB.
    const accessToken = await this.jwt.signAsync({ user_id: user.user_id });

    return {
      accessToken,
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        point: user.point,
        role: user.role,
      },
    };
  }

  // ===================== LẤY THÔNG TIN MÌNH (GET /auth/me) =====================
  // user_id lấy từ token (do JwtAuthGuard gắn vào), là UUID nên kiểu string.
  async me(user_id: string) {
    const user = await this.prisma.users.findUnique({
      where: { user_id },
      select: publicUserSelect,
    });

    // Token còn hạn nhưng tài khoản có thể đã bị xóa.
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  // ===================== CẬP NHẬT HỒ SƠ (PATCH /auth/profile) =====================
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: { name?: string; phone?: string; password?: string } = {};

    if (dto.name !== undefined) data.name = dto.name;

    if (dto.phone !== undefined) {
      const phoneExists = await this.prisma.users.findFirst({
        where: { phone: dto.phone, user_id: { not: userId } },
        select: { user_id: true },
      });
      if (phoneExists) {
        throw new ConflictException('Số điện thoại đã được đăng ký');
      }
      data.phone = dto.phone;
    }

    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    try {
      return await this.prisma.users.update({
        where: { user_id: userId },
        data,
        select: publicUserSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Số điện thoại đã được đăng ký');
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      )
        throw new UnauthorizedException('Tài khoản không còn tồn tại');
      throw error;
    }
  }
}
