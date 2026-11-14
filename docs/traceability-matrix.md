# Ma trận truy vết

Mã dưới đây là bản khởi đầu để nhóm đồng bộ với SRS. Bổ sung mã user story và sơ đồ sau khi chốt các tạo phẩm Task 1–3.

| Mã | Nghiệp vụ | Thiết kế hoặc sơ đồ cần liên kết | Code hoặc API | Kiểm thử hiện có |
| --- | --- | --- | --- | --- |
| FR-01 | Xem menu | Activity menu | `GET /products`, `apps/web/src/app/menu` | Playwright checkout từ menu |
| FR-02 | Chọn size, topping và đưa vào giỏ | Activity chọn món | `GET /products/:id`, `apps/web/src/components/menu` | Test tích hợp chi tiết sản phẩm và checkout |
| FR-03 | Đăng ký và đăng nhập | Sequence xác thực | `/auth/register`, `/auth/login` | Playwright đăng ký và đăng nhập |
| FR-04 | Tạo đơn, kiểm tra tồn kho | Sequence checkout | `POST /orders`, `apps/api/src/orders` | Test tích hợp tồn kho, quyền và idempotency |
| FR-05 | Thanh toán, thử lại và xác nhận | Sequence checkout | `POST /payments`, `apps/api/src/payments` | Test tích hợp mock/IPN và Playwright thử lại cùng đơn |
| NFR-01 | Kiểm tra sẵn sàng của API và DB | Deployment diagram | `GET /health` | Test HTTP health trong `apps/api/test/app.e2e-spec.ts` |
