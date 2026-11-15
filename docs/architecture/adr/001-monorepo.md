# ADR 001 · Bố trí monorepo BrewLite

**Trạng thái:** đã hiện thực trong repo.

## Quyết định

Đặt Next.js tại `app/web`, NestJS và Prisma tại `app/api`. Dùng script npm ở thư mục gốc để gọi từng package (`npm run dev:backend`, `npm run dev:frontend`, `npm run check`). Mỗi app giữ lockfile và Docker context riêng. Test HTTP chạy trong package NestJS: unit cạnh source (`*.spec.ts`) và e2e trong `app/api/test`.

Giữ tên thư mục `app/` (không đổi sang `apps/`) vì toàn bộ đường dẫn trong tài liệu, Dockerfile, workflow và script deploy đang dùng layout này; đổi tên chỉ tạo diff rỗng mà không thêm giá trị.

## Lý do

Hai app có vòng đời build và biến môi trường riêng. Cấu trúc này giữ ranh giới đó khi chuyển sang layout Assignment 2, đồng thời cho phép một PR cập nhật web, API và test của cùng nghiệp vụ.

## Hệ quả

- Cài dependency riêng cho từng app (`npm ci` trong `app/api` và `app/web`); root chỉ có script điều phối, không có `node_modules` dùng chung.
- URL API công khai được gắn vào bundle khi build web (`NEXT_PUBLIC_API_URL`), nên đổi URL phải build lại. Production dùng `/api` để tránh ràng buộc domain (ADR-003).
- API chạy Prisma migration bằng kết nối riêng tới PostgreSQL (`prisma migrate deploy`), không dùng `db push`.
- `docker-compose.yml` ở gốc chỉ chạy PostgreSQL cho local; stack đầy đủ (`db`, `api`, `web`, `caddy`) nằm ở `docker-compose.prod.yml` (ADR-003).
