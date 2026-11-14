# Ma trận truy vết

Mã dưới đây là bản khởi đầu để nhóm đồng bộ với SRS. Bổ sung mã user story và sơ đồ sau khi chốt các tạo phẩm Task 1–3.

| Mã | Nghiệp vụ | Thiết kế hoặc sơ đồ cần liên kết | Code hoặc API | Kiểm thử hiện có |
| --- | --- | --- | --- | --- |
| FR-01 | Xem menu | Activity menu | `GET /products`, `app/web/src/app/menu` | e2e API danh mục; smoke `/api/products` |
| FR-02 | Chọn size, topping và đưa vào giỏ | Activity chọn món | `GET /products/:id`, `app/web/src/components/menu` | Test tích hợp chi tiết sản phẩm và checkout |
| FR-03 | Đăng ký và đăng nhập | Sequence xác thực | `/auth/register`, `/auth/login` | Test tích hợp auth trong `app/api/test` |
| FR-04 | Tạo đơn, kiểm tra tồn kho | Sequence checkout | `POST /orders`, `app/api/src/orders` | Test tích hợp tồn kho, quyền và idempotency |
| FR-05 | Thanh toán, thử lại và xác nhận | Sequence checkout | `POST /payments`, `app/api/src/payments` | Test tích hợp mock/IPN và thử lại cùng đơn |
| NFR-01 | Kiểm tra sẵn sàng của API và DB | [Deployment diagram](diagrams/Deployment_Diagram.svg) | `GET /health` | Unit `app.controller.spec.ts`, e2e `app/api/test/app.e2e-spec.ts`, smoke `/api/health` |
| NFR-02 | Build và kiểm thử tự động trước khi merge | [Kiến trúc §4](architecture/overview.md#4-luồng-cicd) | `.github/workflows/ci.yml` (job `verify`) | Kết quả Actions trên PR; bước validate deploy scripts |
| NFR-03 | Phát hành đúng commit đã kiểm thử | [Kiến trúc §4](architecture/overview.md#4-luồng-cicd) | Job `images` (tag = SHA), `deploy/release.sh` | `docker compose config`, smoke sau deploy, `.last-good-tag` |
| NFR-04 | Dữ liệu có thể khôi phục | [Runbook §6](runbook.md#6-backup-và-restore) | `deploy/backup.sh` | Dump trước mỗi migrate; thử restore định kỳ |
| NFR-05 | TLS và một domain duy nhất | [ADR-003](architecture/adr/003-ubuntu-docker-https.md), [Deployment diagram](diagrams/Deployment_Diagram.svg) | `deploy/Caddyfile`, `docker-compose.prod.yml` | HTTP 200 qua HTTPS, HTTP→HTTPS 308, smoke trên domain thật |
