# BrewLite API

NestJS chia module theo nghiệp vụ: `auth`, `products`, `orders`, `payments`; `prisma` quản lý kết nối DB; `common` chứa tiện ích khóa/idempotency. Controller xử lý HTTP và quyền truy cập, DTO validate đầu vào, service xử lý transaction và nghiệp vụ.

Hướng dẫn cài đặt, nâng cấp DB và chạy test nằm ở [README gốc](../README.md). Hướng dẫn cổng thanh toán nằm ở [VNPAY](../docs/VNPAY.md).

```powershell
npm ci
npx prisma migrate deploy
npm run db:seed
npm run start:dev
```

Tạo `.env` trước khi `npm ci`. Không dùng `prisma db push` hoặc sửa migration cũ để đồng bộ máy nhóm. Mỗi thay đổi schema cần một migration mới.
