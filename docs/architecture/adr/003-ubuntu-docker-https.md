# ADR-003 — AWS Ubuntu, Docker Compose và Caddy

**Trạng thái:** cấu hình đã soạn; live deployment chưa được xác minh.

**Bối cảnh:** VPS AWS t3.micro Ubuntu 24.04, x86_64, RAM 1 GB. Nhóm cần web HTTPS, SSH từ laptop khác và vẫn chạy khi tắt laptop.

**Quyết định:** GitHub CI build hai image cùng commit SHA trên runner; VPS pull và chạy Next, Nest, PostgreSQL, Caddy. Caddy tự cấp/gia hạn TLS theo domain. FE dùng API tương đối `/api` để tránh build lại mỗi lần đổi domain. Compose giữ DB và TLS trên volumes. Migrate là tác vụ riêng trước khi chạy app; backup và maintenance window ngắn. Không dùng đồng thời PM2, Nginx và Caddy cho cùng cổng.

**Lý do:** phù hợp dung lượng RAM hạn chế, một nguồn cấu hình, tránh tunnel ngrok/Cloudflare thay đổi URL; local và production tách rõ. Caddy thay Nginx+Certbot để giảm cấu hình cho nhóm trong hạn nộp.

**Đánh đổi:** một VPS không HA, cần theo dõi RAM/disk, backup ra ngoài, có downtime khi upgrade. Cần domain/DNS, inbound80/443, credential VNPay, secrets CI. Đổi kích thước AWS có thể thay đổi chi phí; kiểm tra tài khoản trước khi thực hiện.
