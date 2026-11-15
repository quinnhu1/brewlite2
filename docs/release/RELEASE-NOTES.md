# BrewLite payment recovery và Ubuntu delivery

Đề xuất tag sau khi nhóm nghiệm thu: `v1.3.0`. Chưa tạo tag trên GitHub hoặc deploy thay cho nhóm.

## Bổ sung trong bản 1.3

- Kiểm tra và ký payload hoàn trước durable claim; thiếu cấu hình/dữ liệu cục bộ không làm receipt bị đánh dấu đã gửi. Đã claim/timeout vẫn query-only; không tự reset receipt cũ.
- Giỏ gắn owner user, dọn checkout/replacement khi đổi tài khoản; bỏ response thuộc token cũ, kể cả body trả chậm. Snapshot giỏ cũ không có owner bị dọn một lần.
- Đổi mật khẩu yêu cầu current_password; auth_version thu hồi JWT, update nguyên tử chống đổi đồng thời; POST /auth/logout đăng xuất mọi phiên. TTL mặc định 1 giờ.
- Giới hạn thử đăng nhập/đăng ký/đổi mật khẩu bằng bucket PostgreSQL; 429 có Retry-After, hoạt động với nhiều process.
- Migration bổ sung `20261114120000_auth_sessions_rate_limits`; đăng nhập lại sau nâng cấp. Không rollback về API bỏ qua auth_version mà chưa có kế hoạch thu hồi token.
- 64 integration, 8 unit Jest, 8 client tests đã qua; 6 browser scenarios chưa chạy được do Chromium launch bị môi trường chặn. Benchmark 12 nhóm API/690 mẫu local qua ngưỡng; chưa là bằng chứng public/VNPay thật.

## Phần đã có từ bản 1.2

- Sửa đồng bộ checkout sau failed, chọn lại QR/ATM/thẻ từ tracking.
- Thêm yêu cầu hủy bền vững, lịch sử payment attempt và chứng từ Refund.
- Worker đối soát và cooldown lưu DB; gửi refund một lần, timeout query-only; không dùng ReturnUrl để chốt tiền.
- Chặn pha chế/payment mới khi yêu cầu hủy; đơn thay thế liên kết đơn đã hủy/hoàn xong.
- Migrate `20261113090000_payment_recovery_refunds`; update DTO/Swagger; admin đối soát.
- Production Compose/Caddy, image SHA, CI/CD SSH, backup/migration/smoke/rollback; bootstrap catalog/admin an toàn hơn.
- SRS, 7 sơ đồ nguồn/SVG, ADR và hướng dẫn phân công; kết quả mới nhất ghi ở TEST-RESULTS.md.

## Bổ sung từ lần ghép chọn lọc `brewlite2` vào fixed

- Đăng ký và mật khẩu mới dùng cùng quy tắc tối thiểu 8 ký tự, có chữ cái và chữ số; đăng nhập không áp quy tắc mới để không khóa tài khoản cũ.
- Thêm `assertBcryptLength()` kiểm tra 72 byte UTF-8 trước khi bcrypt hash khi đăng ký và đổi mật khẩu; có test riêng cho biên đúng 72 byte và vượt giới hạn bằng chữ tiếng Việt nhiều byte.
- Giữ hợp đồng fixed: đăng ký trả hồ sơ, đổi mật khẩu qua `PATCH /auth/profile` với `current_password`/`password`, JWT dùng `user_id`/`auth_version`; không thay transaction hoặc cơ chế thu hồi token.
- Mở rộng input đăng ký và form tài khoản; bổ sung unit/API tests auth và smoke `/menu`; cập nhật architecture, runbook, ADR-005 và lưu release notes nguồn trong `HISTORY-BREWLITE2.md`.
- Không thêm migration mới; giữ nguyên payment/refund, database schema, checkout/session và deployment workflow của fixed.

**Trạng thái xác minh lần ghép:** kiểm tra cú pháp tĩnh JavaScript và shell đã chạy; dependency install bị chặn bởi lỗi DNS tới npm registry trong môi trường tạo gói. Vì vậy unit/build/integration/browser test chưa được xác nhận sau ghép. Xem [MERGE-VALIDATION](MERGE-VALIDATION.md). Sandbox VNPay và AWS cũng chưa được kiểm thử trong phiên này.

## Thông tin nhóm phải điền sau khi chạy thực tế

| Hạng mục | Giá trị thực tế |
|---|---|
| Git commit SHA và tag | Chưa tạo release của nhóm |
| URL web/API/health | Chưa deploy |
| CI/CD run URL | Chưa chạy trên repo của nhóm |
| Migration/backup | Cần ghi file backup và kết quả VPS |
| E2E browser | Cần chạy pass trên máy/CI |
| QR/ATM/refund merchant | Cần ghi kịch bản và kết quả |
| Rollback phù hợp | Chọn SHA hiểu lifecycle refund và auth_version; không làm token bị thu hồi sống lại |

Giữ lịch sử dữ liệu; không dùng reset DB để nâng cấp. Khi rollback, kiểm tra cả tương thích schema lẫn logic hủy/hoàn, không chỉ việc app khởi động được. Rủi ro còn lại: dependency merchant, unknown settlement cần vận hành, một VPS là điểm lỗi chung và cấu hình1GB cần theo dõi tải.
