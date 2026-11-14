# ADR-003 — AWS Ubuntu, Docker Compose và Caddy

**Trạng thái:** đã triển khai trong repo (CI, CD, compose, backup, smoke test); live deployment chưa được xác minh.

**Bối cảnh:** VPS AWS t3.micro Ubuntu 24.04, x86_64, RAM 1 GB. Nhóm cần web HTTPS, SSH từ laptop khác và vẫn chạy khi tắt laptop.

**Quyết định:** GitHub CI build hai image cùng commit SHA trên runner; VPS pull và chạy Next, Nest, PostgreSQL, Caddy. Caddy tự cấp/gia hạn TLS theo domain. FE dùng API tương đối `/api` (Caddy strip prefix) để tránh build lại mỗi lần đổi domain. Compose giữ DB và TLS trên volumes. Migrate là tác vụ riêng trong `deploy/release.sh`, chạy trước khi app khởi động, sau một lần `pg_dump`; backup giữ 7 ngày trong `/opt/brewlite/backups`. Smoke test sau deploy kiểm tra `/api/health`, catalog và hai trang web. Không dùng đồng thời PM2, Nginx và Caddy cho cùng cổng.

**Hiện thực trong repo:** `docker-compose.prod.yml` (db/api/web/caddy), `deploy/Caddyfile`, `deploy/release.sh` (pull → backup → migrate → up → health → rollback), `deploy/backup.sh`, `scripts/smoke.mjs` (`npm run test:smoke`), job `images` + `deploy` trong `.github/workflows/ci.yml`.

**Lý do:** phù hợp dung lượng RAM hạn chế, một nguồn cấu hình, tránh tunnel ngrok/Cloudflare thay đổi URL; local và production tách rõ. Caddy thay Nginx+Certbot để giảm cấu hình cho nhóm trong hạn nộp.

**Đánh đổi:** một VPS không HA, cần theo dõi RAM/disk, backup ra ngoài, có downtime khi upgrade. Cần domain/DNS, inbound 80/443, credential VNPay, secrets CI. Đổi kích thước AWS có thể thay đổi chi phí; kiểm tra tài khoản trước khi thực hiện.

> Ghi chú: `docs/deployment.md` từng mô tả Render với đường dẫn `apps/*`; nay đã
> chuyển sang VPS + Caddy và giữ Render như phương án dự phòng.
