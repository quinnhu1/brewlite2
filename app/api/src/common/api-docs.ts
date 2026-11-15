import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

/**
 * Idempotency-Key header for POST /orders and POST /payments.
 * Named exactly like the @Headers('idempotency-key') parameter so Swagger shows ONE header, not two.
 */
export function ApiIdempotencyKey(purpose: string) {
  return ApiHeader({
    name: 'idempotency-key',
    required: true,
    description:
      `Khóa chống gửi lặp cho ${purpose}. 8–200 ký tự gồm chữ, số, "_", ".", ":" hoặc "-". ` +
      'Gửi lại CÙNG khóa với CÙNG nội dung sẽ nhận lại đúng kết quả cũ (không tạo bản ghi mới, không giữ kho/thu tiền lần hai). ' +
      'Dùng lại khóa cho nội dung khác hoặc tài khoản khác bị 409. Nên sinh mới bằng UUID cho mỗi thao tác của người dùng.',
    schema: {
      type: 'string',
      minLength: 8,
      maxLength: 200,
      pattern: '^[A-Za-z0-9_.:-]{8,200}$',
      example: 'checkout-6b1f2c7e-3d4a-4c1b-9e0f-2a7d5c8b1e40',
    },
  });
}

const example = (statusCode: number, message: string | string[], error: string) => ({
  schema: { example: { statusCode, message, error } },
});

export const ApiValidationError = (message: string | string[]) =>
  ApiBadRequestResponse({
    description: 'Dữ liệu không hợp lệ (sai kiểu, thiếu trường, trường lạ như price/cost, header sai định dạng).',
    ...example(400, message, 'Bad Request'),
  });

export const ApiAuthRequired = () =>
  ApiUnauthorizedResponse({
    description: 'Thiếu hoặc sai Bearer token.',
    ...example(401, 'Unauthorized', 'Unauthorized'),
  });

export const ApiNotFound = (message: string) =>
  ApiNotFoundResponse({ description: message, ...example(404, message, 'Not Found') });

export const ApiConflict = (description: string, message: string) =>
  ApiConflictResponse({ description, ...example(409, message, 'Conflict') });

export const ApiForbidden = () =>
  ApiForbiddenResponse({
    description: 'Đã đăng nhập nhưng không đủ quyền (cần staff/admin).',
    ...example(403, 'Forbidden resource', 'Forbidden'),
  });

/** Errors shared by every authenticated endpoint. */
export const ApiProtected = () => applyDecorators(ApiAuthRequired());
