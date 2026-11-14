# Triển khai BrewLite qua HTTPS

Theo [ADR-003](architecture/adr/003-ubuntu-docker-https.md): một VPS Ubuntu 24.04
chạy Docker Compose gồm PostgreSQL, NestJS (`app/api`), Next.js (`app/web`) và
Caddy. Một domain duy nhất, TLS tự động. CI build image theo commit SHA, CD pull
và release đúng SHA đó.

## Test trên laptop

Giữ web ở `http://localhost:3000` và API ở `http://localhost:3001`. Chạy
`ngrok http 3001` để nhận URL HTTPS công khai tạm thời của API khi cần thử VNPay.
Xem cấu hình và phép thử NCB ở [VNPay Sandbox](VNPAY.md).

## Production trên VPS

1. Trỏ DNS của domain về VPS, mở inbound 22/80/443.
2. Cài Docker, tạo `/opt/brewlite/.env` từ `deploy/env.example`. Hướng dẫn đầy đủ:
   [deploy/README.md](../deploy/README.md).
3. Trên GitHub, bật `PUBLISH_IMAGES=true`, `DEPLOY_ENABLED=true`,
   `NEXT_PUBLIC_API_URL=/api`, `PRODUCTION_URL=https://<domain>`, và điền các
   secret `VPS_*`. Job `deploy` chạy sau `verify` và `images`.
4. Lần deploy đầu tiên: container API tự chạy `prisma migrate deploy` (qua
   `deploy/release.sh`), nhưng **catalog và tài khoản admin phải nạp riêng**:

   ```bash
   cd /opt/brewlite
   docker compose -f docker-compose.prod.yml run --rm --no-deps api npx prisma db seed
   # rồi tạo tài khoản admin bằng mật khẩu riêng, không dùng tài khoản demo
   ```

   Seed trong repo chứa tài khoản demo công khai, không dùng nguyên trạng cho môi
   trường bàn giao.

5. Chọn chế độ thanh toán: `PAYMENT_PROVIDER=mock` +
   `PAYMENT_ALLOW_MOCK_IN_PRODUCTION=true` cho ví/thẻ mô phỏng theo đề, hoặc điền
   merchant VNPay Sandbox và đăng ký IPN.

| Giá trị | Ví dụ |
| --- | --- |
| URL web để nộp | `https://brew.example.com` |
| API (qua Caddy) | `https://brew.example.com/api` |
| `NEXT_PUBLIC_API_URL` | `/api` |
| `FRONTEND_URL` của API | `https://brew.example.com` |
| Health check | `https://brew.example.com/api/health` |
| `VNPAY_RETURN_URL` | `https://brew.example.com/api/payments/vnpay/return` |
| IPN đăng ký với VNPay | `https://brew.example.com/api/payments/vnpay/ipn` |

## Kiểm tra và rollback

```powershell
npm run test:smoke -- https://brew.example.com https://brew.example.com/api
```

- Smoke test kiểm tra `/api/health`, `/api/products` có catalog, web `/` và
  `/menu` trả HTML. CI chạy bước này sau mỗi lần deploy khi có `PRODUCTION_URL`.
- `deploy/release.sh` health check qua chính domain công khai (đi qua Caddy và
  TLS), nếu fail thì tự quay lại `.last-good-tag` và job đỏ.
- Rollback thủ công: `bash deploy/release.sh <sha-cũ>`. Migration đã áp dụng
  không tự revert — kiểm tra tương thích schema trước khi quay lui.
- Backup: `deploy/backup.sh` dump vào `/opt/brewlite/backups` trước mỗi lần
  migrate, giữ `BACKUP_RETENTION_DAYS` ngày. Nên đẩy thư mục này ra ngoài
  (restic/rclone) và thử restore định kỳ.
- Ghi commit SHA, URL, kết quả smoke test và thay đổi migration vào release notes.

## Phương án dự phòng

Nếu không có VPS/domain đúng hạn, Render vẫn dùng được: hai Web Service (Docker,
root `app/api` và `app/web`) + một PostgreSQL, health check path `/health` cho
API, `NEXT_PUBLIC_API_URL` là URL HTTPS của API. Khi đó bỏ qua job `deploy` và
`deploy/` của VPS.
