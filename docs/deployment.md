# Triển khai BrewLite qua HTTPS

## Test trên laptop

Giữ web ở `http://localhost:3000` và API ở `http://localhost:3001`. Chạy `ngrok http 3001` để nhận URL HTTPS công khai tạm thời của API. Dùng URL đó cho IPN khi thử VNPay trên một máy. Xem cấu hình và phép thử NCB ở [VNPay Sandbox](VNPAY.md).

## Lấy URL production trên Render

Dùng cùng một repo cho hai Web Service và một PostgreSQL. Render cấp subdomain `onrender.com` cùng chứng chỉ HTTPS. Chọn gói và thời hạn phù hợp với buổi chấm. [TLS trên Render](https://render.com/docs/tls) · [Giới hạn gói miễn phí](https://render.com/docs/free)

1. Tạo Render Postgres cùng region với API. Dùng **Internal Database URL** cho API và vô hiệu hóa external access của DB. [Kết nối Render Postgres](https://render.com/docs/postgresql-creating-connecting)
2. Tạo Web Service cho NestJS với runtime Docker, Root Directory `apps/api` và Dockerfile `./Dockerfile` tương đối với thư mục đó. Đặt health check path `/health`. Điền `DATABASE_URL`, `DIRECT_URL` bằng URL DB nội bộ và tạo `JWT_SECRET` riêng cho môi trường. Image chạy `prisma migrate deploy` trước khi khởi động API. [Deploy Docker](https://render.com/docs/docker) · [Deploy monorepo](https://render.com/docs/monorepo-support)
3. Tạo Web Service cho Next.js với Root Directory `apps/web` và Dockerfile `./Dockerfile`. Điền `NEXT_PUBLIC_API_URL` bằng URL HTTPS mà Render đã cấp cho API trước khi build web. [Biến môi trường Next.js](https://nextjs.org/docs/app/guides/environment-variables)
4. Lấy URL HTTPS của web, đặt vào `FRONTEND_URL` của API rồi redeploy API. Chuẩn bị catalog cho DB bàn giao. Seed local trong repo chứa tài khoản demo công khai, nên môi trường bàn giao cần dữ liệu catalog và tài khoản quản trị có mật khẩu riêng.
5. Chọn chế độ thanh toán cho buổi demo. Với Ví/Thẻ mô phỏng theo đề, đặt `PAYMENT_PROVIDER=mock` và `PAYMENT_ALLOW_MOCK_IN_PRODUCTION=true`. Nếu dùng VNPay Sandbox, đặt thông tin merchant ở API và đăng ký IPN HTTPS cho đúng domain.

| Giá trị | Ví dụ |
| --- | --- |
| URL web để nộp | `https://brewlite-web.onrender.com` |
| URL API và `NEXT_PUBLIC_API_URL` | `https://brewlite-api.onrender.com` |
| `FRONTEND_URL` của API | `https://brewlite-web.onrender.com` |
| Health check | `https://brewlite-api.onrender.com/health` |
| `VNPAY_RETURN_URL` nếu dùng Sandbox | `https://brewlite-api.onrender.com/payments/vnpay/return` |
| IPN đăng ký với VNPay | `https://brewlite-api.onrender.com/payments/vnpay/ipn` |

Thay tên ví dụ bằng hostname Render thực tế. Lưu secret trong phần Environment của API.

## Kiểm tra và rollback

```powershell
npm run test:smoke -- https://brewlite-web.onrender.com https://brewlite-api.onrender.com
```

- Kiểm tra `/health` trả HTTP 200, `/products` có catalog, web mở được từ thiết bị khác và checkout demo cập nhật đúng trạng thái.
- Ghi commit SHA, URL, kết quả smoke test và thay đổi migration trong release notes. Chọn bản deploy trước trong lịch sử Render nếu cần rollback ứng dụng. Kiểm tra tương thích schema với bản cũ trước khi quay lui. [Rollback trên Render](https://render.com/docs/rollbacks)
- Nối CD của môi trường đã chọn vào sau CI. Task 5 yêu cầu có minh chứng đóng gói theo SHA hoặc version, triển khai, migration, smoke test và rollback. Ghi platform và URL thực tế vào tài liệu bàn giao sau khi deploy.
