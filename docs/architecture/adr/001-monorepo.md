# ADR 001 · Bố trí monorepo BrewLite

## Quyết định

Đặt Next.js tại `apps/web`, NestJS và Prisma tại `apps/api`. Dùng lệnh npm gốc để gọi từng package. Mỗi app giữ lockfile và Docker context riêng. Các test HTTP chạy trong package NestJS, còn test trình duyệt ở `tests/e2e`.

## Lý do

Hai app có vòng đời build và biến môi trường riêng. Cấu trúc này giữ ranh giới đó khi chuyển sang layout Assignment 2, đồng thời cho phép một PR cập nhật web, API và test của cùng nghiệp vụ.

## Hệ quả

Cài dependency cho root và hai app. URL API công khai được gắn vào bundle khi build web. API chạy Prisma migration bằng kết nối riêng tới PostgreSQL. Compose dùng chung cấu hình local để khởi động ba dịch vụ.
