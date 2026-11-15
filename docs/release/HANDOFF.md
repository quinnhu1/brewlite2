# Hướng dẫn bàn giao bản sửa BrewLite

Bản 1.3 sửa thêm lỗi hoàn tiền mắc kẹt khi thiếu cấu hình, dữ liệu giỏ lẫn giữa hai tài khoản và đổi mật khẩu không thu hồi phiên cũ. Bản này giữ QR và thẻ VNPay Sandbox, cùng bộ triển khai AWS Ubuntu. Nhóm có thể tiếp tục từ mã đã sửa và các test đã có. Trước khi nộp vẫn cần chạy E2E trên máy/CI, kiểm chứng merchant VNPay và đưa đúng bản build lên URL HTTPS thật.

## Các thay đổi quan trọng

| Vấn đề ban đầu | Bản sửa | Giới hạn cần biết |
|---|---|---|
| Failed nhưng checkout bị khóa | Đồng bộ trạng thái từ backend ở modal, result và tracking; mở đổi kênh sau failed đã xác minh | Pending chưa rõ phải đối soát trước khi tạo khoản thu mới |
| Hủy khi pending bị từ chối ngay | Nhận và lưu yêu cầu hủy, chặn pha chế, tiếp tục IPN/QueryDR | 200 là đã tiếp nhận; không đồng nghĩa đã hoàn |
| Không có chứng từ hoàn VNPay | Thêm Refund, ký API hoàn, worker query, hiển thị history/receipt | Cần merchant được cấp quyền và bằng chứng hoàn cuối |
| Quản lý không thấy khách đổi món | Giữ từng payment attempt, refund, lý do; liên kết đơn thay thế | Không sửa tiền đã thu trên đơn cũ |
| Thiếu secret nhưng phiếu hoàn bị ghi đã gửi | Kiểm tra cấu hình, dữ liệu và ký request trước khi lưu submitted_at | Phiếu cũ đã có submitted_at phải đối soát; không tự đặt lại để gửi |
| Tài khoản B nhận giỏ hoặc đơn thay thế của A | Giỏ gắn user; xóa trạng thái khi đổi tài khoản/đăng xuất; bỏ response phiên cũ | Giỏ lưu bằng phiên bản cũ được dọn một lần; lịch sử đơn trên DB còn nguyên |
| Đổi mật khẩu thiếu xác thực lại | Bắt buộc mật khẩu hiện tại; tăng auth_version, thu hồi token cũ; giới hạn thử | Đổi mật khẩu và Đăng xuất mọi phiên buộc các thiết bị đăng nhập lại |
| Cấu hình local/tunnel thay đổi | Production Compose, Caddy HTTPS, CI image SHA, SSH deploy, backup/rollback | Cần domain và thiết lập VPS/GitHub thật |
| Tài liệu còn khung | SRS, UC, 7 bộ nguồn sơ đồ/SVG, ADR, traceability và runbook | Cần PR và chứng cứ Sprint thật; không tự có điểm 10 |

## Câu trả lời cho các tình huống của thầy

**Sửa giá 10k thành 15k và quantity 1 thành 3 trong JSON:** DTO không nhận cost/price/total nên request có trường tự thêm bị 400. Nếu gửi đúng body với quantity 3, backend đọc giá DB 10k và tính 30k khi không có size/topping/promo. Quantity là lựa chọn người mua, phải validate và kiểm tra stock; không tin đơn giá trình duyệt. Nếu ai có quyền sửa trực tiếp DB thì đó là quyền quản trị hạ tầng, không là bài toán sửa JSON nữa.

**Hai user cùng mua khi còn 2 ly:** thêm vào giỏ không giữ hàng. Khi cả hai cùng POST order 2 ly, transaction với stock/version chỉ cho một order thắng. User còn lại nhận lỗi hết hàng/xung đột, không tạo khoản thu. Đã có test thực sự dùng hai token và PostgreSQL, kiểm tra stock cuối 0.

**Đổi ly 10k thành 15k:** theo chính sách thầy yêu cầu, giữ chứng từ thu 10k, yêu cầu hoàn 10k, xác minh hoàn, tạo order mới 15k liên kết order cũ. Chênh ròng 5k nhưng sổ giao dịch thấy đủ thu–hoàn–thu. Nếu thiết kế chức năng bù 5k với chứng từ riêng thì vẫn có thể quản lý được, nhưng ngoài phạm vi gấp của nhóm; không chỉ sửa tổng tiền cũ.

**Swagger hay Postman:** Swagger dễ nhất để xem API và thử nhanh; dùng Postman để lưu bộ request. Tự động kiểm tra đúng/sai bằng test, không chỉ dựa màu xanh HTTP 200. Collection mẫu đã nằm trong tests/postman.

**Mock là gì:** gateway mô phỏng, không chuyển tiền ngân hàng; Order, DB, stock và loyalty vẫn xử lý thật trong ứng dụng. Đề cho phép mock ví/thẻ. Bản này vẫn giữ adapter QR/thẻ Sandbox, không giả danh QR ngân hàng thật.

## Cài bản sửa vào dự án hiện tại

1. Giữ nguyên thư mục đang dùng làm bản dự phòng; giải nén gói mới sang thư mục riêng. Không chép node_modules, dist hoặc .next từ bản cũ.
2. Sao chép cấu hình local vào .env gốc, apps/api/.env và apps/web/.env.local; giữ đúng DB/port/password hiện có. Các secret không có trong gói bàn giao.
3. Backup PostgreSQL trước khi migrate. Không dùng prisma migrate reset, reset SQL hoặc down -v trên DB cần giữ.
4. Chạy npm run setup; npm run db:migrate. Có hai migration bổ sung: 20261113090000_payment_recovery_refunds và 20261114120000_auth_sessions_rate_limits. Chúng thêm dữ liệu hoàn tiền, users.auth_version và auth_rate_limits; không yêu cầu reset. Nếu đã dùng 1.2, Prisma chỉ áp dụng migration còn thiếu.
5. DB mới local mới chạy db:seed; DB đang dùng thì không seed ghi đè catalog. Server mới dùng db:seed:catalog và admin:create để tránh admin/password demo.
6. Chạy API và web theo README, đăng nhập lại rồi test mock trước, sau đó cấu hình VNPay Sandbox. Token cũ thiếu auth_version không còn hợp lệ. Giỏ cũ không xác định chủ sở hữu bị dọn một lần, không xóa đơn đã lưu DB. Kiểm tra order/payment/refund cũ theo docs/VNPAY.md.
7. Đưa thay đổi lên branch mới của nhóm, mở PR, review diff và bật required check. Không dùng git push --force lên main.

## Phân công sáu thành viên

Mỗi người phụ trách một phần có người kiểm tra chéo. Công việc dưới đây là nghiệm thu, kết nối môi trường thật và hoàn thiện minh chứng trên bản mã đã sửa, không yêu cầu viết lại tất cả từ đầu.

### Triệu phụ trách tích hợp và nghiệp vụ thanh toán

Đọc OrdersService, PaymentsService, RefundsService và hai sequence diagram. Chạy test giá giả, lặp request, hai user tranh tồn, pending cancel rồi IPN success/failed; kiểm tra transaction và DTO theo test. Thử thiếu secret rồi sửa cấu hình: trước sửa submitted_at phải null và không gọi gateway; sau sửa chỉ gửi một lần. Review với Thắng việc giữ key cũ khi chưa rõ kết quả, key mới sau failed. Hợp nhất PR, chốt release SHA và log nghiệm thu; Đức Long review backend, Thắng review UI.

### Đức Long phụ trách database và dữ liệu an toàn

Backup DB nhóm, chạy đủ 6 migration trên bản sao trước; kiểm tra refunds, unique payment_id, stock_reserved, auth_version và auth_rate_limits. Dùng hai tài khoản tranh 2 ly, kiểm tra hoàn lặp trả stock/đảo điểm một lần. Test đổi mật khẩu đồng thời: một lần thắng, token cũ đều bị 401; rate limit trả 429 có Retry-After. Trên VPS dùng catalog seed và admin riêng. Thử restore DB test, đo API sau deploy. Bàn giao log migration/restore, tồn/điểm và phiên đăng nhập; Triệu review.

### Thiện phụ trách VNPay và Ubuntu

Xác minh TmnCode/secret/Return/IPN cùng môi trường; làm việc với portal về QR và refund. Test NCB Sandbox, QR trực tiếp và QR chọn tại cổng; ghi mã response/gateway_ref, không ghi secret. Kiểm tra AWS RAM/disk/SG/DNS, cài Docker, .env.production, registry login, SSH host key, CI secrets rồi chạy release. Demo từ máy thứ hai và thử đóng laptop/SSH. Bàn giao: URL HTTPS thật, health, link CD, kết quả merchant và logs đã che dữ liệu nhạy cảm; Đức Long kiểm tra vận hành, Triệu kiểm tra callback.

### Như phụ trách giỏ hàng và trải nghiệm mobile

Kiểm tra đăng ký/đăng nhập, form khách, địa chỉ nhận, quote và tổng tiền trên màn 390 px. Thử A chọn đặt lại rồi đăng xuất, B đăng nhập: không còn order ID/giỏ của A. Thử hai tab, reload, response cũ về chậm và đổi mật khẩu đúng/sai. Kiểm tra loading/error/empty, selected items, promo và số lượng hợp lệ. Không hardcode thành công. Bàn giao ca test và ảnh giao diện mẫu không chứa thông tin thanh toán cá nhân; Thắng kiểm tra chéo.

### Thắng phụ trách checkout và E2E

Đọc PaymentModal, payment/result, order-detail và checkout/sync. Chạy 6 Playwright scenarios trên máy có Chromium hoặc CI, thêm npm run test:client cho 8 ca trạng thái phiên. Demo failure → đổi phương thức → retry cùng Order → paid → refresh → cancel/refund → đơn thay thế. Với Sandbox thử đóng tab, Back, mất mạng và IPN chậm; không tự gán success. Bàn giao E2E pass thật, lỗi có bước tái hiện và video ngắn; Triệu review idempotency, Như review UX.

### Thành Long phụ trách quản trị và hồ sơ nộp

Kiểm tra AdminGuard, sản phẩm/version, lọc tracking/history, payment attempts và refund receipt. Khi khách xin hủy, admin không được PREPARING. Test nút đối soát bằng admin và bị 403 với customer; xem lại kết quả provider trong lịch sử. Review SRS, 7 sơ đồ, ADR, traceability theo source cuối. Thu link PR/CI, URL production, demo video, Sprint Review/Retro có dữ liệu thật; không tạo lịch sử giả. Bàn giao: bộ docs cập nhật đúng SHA, checklist rubric và kịch bản vấn đáp; Thiện review deployment, Đức Long review sơ đồ dữ liệu.

## Mốc làm việc trong bốn ngày

Các mốc là thứ tự triển khai để nhóm sắp theo hạn thực tế; không tự gia hạn ngày nộp. Nếu đã qua một phần thời gian, ưu tiên các điều kiện bắt buộc trước.

| Mốc | Công việc chung | Điều kiện kết thúc |
|---|---|---|
| Ngày 1 | Cài bản sửa, backup, migrate bản sao, review logic, chạy CI và E2E; chốt domain/merchant | Build/lint/unit/integration xanh; lỗi E2E có người nhận; domain/DNS rõ |
| Ngày 2 | Kiểm tra QR/ATM/refund, UI retry/cancel; dựng Ubuntu và registry | Public HTTPS/health; giao dịch test có kết quả xác minh; không mở DB |
| Ngày 3 | Hai user tranh tồn, timeout/reload/callback lặp; admin audit; restore và rollback có kiểm soát | E2E pass trên CI/máy; bảng test đầy đủ; diễn tập phục hồi |
| Ngày 4 | Khóa scope, sửa lỗi còn lại, release/tag, video và tập vấn đáp | URL kiểm tra bằng 4G; SHA/CI logs/docs khớp; có phương án mock minh bạch |

Ngày 1–2 cần làm song song trong nhóm; hằng tối 15 phút báo cáo bằng bằng chứng pass/fail và issue, không báo “gần xong”. Sau khi chốt release, không tự ý đổi merchant, schema hoặc hạ tầng sát giờ demo.

## Kịch bản demo và câu hỏi bảo vệ

1. Mở web HTTPS trên laptop khác; tắt terminal dev trên máy cá nhân để chứng minh VPS hoạt động độc lập.
2. Đăng nhập, xem menu, tùy chọn size/topping và quote; sửa cost trong Postman để chứng minh 400.
3. Hai user tranh 2 ly cuối; xem một order được tạo, stock 0.
4. Mock failed → thử lại ví/thẻ và success; lịch sử vẫn có attempt failed. Giải thích đây là mô phỏng theo đề.
5. ATM/QR Sandbox theo quyền merchant; chỉ chứng minh kết quả đã kiểm tra, không quét app live rồi khẳng định phải thành công.
6. Xin hủy đơn paid chưa pha; xem refund receipt, điểm và stock; admin thấy chứng từ. Nếu provider processing, trình bày đúng trạng thái đó.
7. Mở source diagram, test, CI/CD và backup/rollback; giải thích ReturnUrl khác IPN, key chống gửi lặp, transaction chống bán vượt tồn.

## Những phần phải có bằng chứng trước khi nộp

- URL production/domain thật, health/API hoạt động qua HTTPS; không điền domain ví dụ.
- Link CI thành công và CI bắt lỗi, PR review và ruleset chặn merge.
- E2E browser qua thực tế; lỗi môi trường ở phiên sửa này chưa thay thế được bằng chứng đó.
- QR/ATM/refund Sandbox được test bằng merchant nhóm; rõ chế độ mock và sandbox.
- Migration/backup/restore, dấu vết release SHA và hướng dẫn rollback đã diễn tập.
- Sprint Review/Retrospective, issue board và video đúng công việc đã làm.

Không thể cam kết điểm 10 chỉ từ source code. Assignment 2 tính cả tiến trình, tài liệu, kiểm thử và URL đang hoạt động tại thời điểm chấm.
