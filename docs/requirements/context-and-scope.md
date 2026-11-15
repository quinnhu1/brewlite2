# BrewLite — bối cảnh và phạm vi

BrewLite phục vụ một cửa hàng cà phê, giúp khách chọn món, tùy chọn size/topping, đặt và thanh toán không tiền mặt; nhân viên và quản lý theo dõi đơn trên cùng dữ liệu. Bản này sửa trên `brewlite2_trieu.zip`, đối chiếu hai PDF môn Công nghệ Phần mềm và Assignment 2. Đây là đặc tả cập nhật theo mã nguồn, nhóm cần review và commit thật; không thay thế lịch sử Sprint đã thực hiện.

| Stakeholder | Mục tiêu | Tiêu chí kiểm chứng |
|---|---|---|
| Khách hàng | Giá đúng, không thu trùng, biết đơn đang ở đâu | Tổng lấy từ DB; xem trạng thái, lịch sử thanh toán và chứng từ hoàn |
| Nhân viên quầy | Chỉ pha đơn đủ điều kiện | Chuyển PAID → PREPARING → READY → COMPLETED; chặn khi có yêu cầu hủy |
| Quản lý | Biết thu/hoàn và thay đổi tồn kho | Quản trị đơn, lịch sử từng lần thanh toán, refund và đơn thay thế |
| Đơn vị thanh toán | Yêu cầu hợp lệ, định danh rõ | HMAC, merchant, reference, amount, QueryDR và refund đúng giao thức |
| Giảng viên | Minh chứng từ yêu cầu đến triển khai | SRS, sơ đồ, traceability, test, CI/CD và URL HTTPS thật |
| Nhóm 6 người | Hoàn thành có thể tái lập | Migration, seed, script, phân công và kiểm thử có người chịu trách nhiệm |

## In scope

Menu mobile-first, chi tiết, giỏ hàng lưu local, JWT, tạo đơn giá phía server, giữ tồn kho 20 phút cho đơn chưa có giao dịch chưa xác định; promo; thanh toán ví/thẻ mô phỏng hoặc VNPay Sandbox QR/ATM/thẻ quốc tế; IPN, đối soát định kỳ; lịch sử/tracking; quản trị sản phẩm và trạng thái; hủy trước pha chế, hoàn toàn phần và liên kết đơn thay thế; Docker, CI/CD, Ubuntu và HTTPS.

## Out of scope

Thu tiền production/live ngân hàng; quản lý nguyên liệu theo công thức; nhiều chi nhánh; giao vận bên thứ ba; tách/ghép hóa đơn; hoàn một phần; thanh toán bù trực tiếp trên đơn cũ; tự gán PAID/REFUNDED theo thao tác frontend; cam kết SLA cao hoặc high availability nhiều máy. Mobile-first có trong phạm vi; cài đặt/offline PWA nâng cao chưa được coi là hoàn tất và không cache giao dịch thanh toán.

## Giả định và ràng buộc

- Giá là số đồng Việt Nam nguyên; `stock` là số phần/ly bán được của Product, dùng chung các size. Topping không có tồn kho riêng.
- Chọn vào giỏ chưa giữ hàng. `POST /orders` thành công mới giữ hàng bằng transaction.
- Khách không được sửa trực tiếp DB. JSON HTTP là dữ liệu không tin cậy; tài khoản DB/SSH là quyền quản trị tách biệt.
- Đơn có giao dịch chưa xác định không được coi là thất bại chỉ vì hết hạn URL hoặc đóng trình duyệt. Cần bằng chứng có chữ ký; tồn kho còn được giữ cho đến khi đối soát xong.
- VNPay Sandbox phụ thuộc quyền kênh của merchant và môi trường test. QR Sandbox không được mặc định quét bằng app ngân hàng live.
- VPS đã lựa chọn trong trao đổi: AWS EC2 t3.micro, Ubuntu 24.04 x86_64, Elastic IP 52.64.177.7. Chưa có xác nhận deploy của gói mã này lên máy đó.
- RAM 1 GB/ổ 8 GB là cấu hình chật: build trên CI, kiểm tra RAM/disk và chi phí trước khi mở rộng. Dung lượng thực tế phải đủ cho images, DB, backup, swap.
- Domain chưa được chốt; `brewlitecoffee.com` là ví dụ, không là tài sản đã đăng ký.

## Rủi ro và cách xử lý

| Rủi ro | Xử lý trong bản sửa | Việc nghiệm thu ngoài mã |
|---|---|---|
| QR chưa được kích hoạt | Giữ QR, ATM và chọn tại cổng; lịch sử response | VNPay xác nhận kênh test cho đúng TmnCode |
| Timeout sau khi đã trừ tiền | Một pending/order; QueryDR; không thanh toán lại sớm | Kiểm tra IPN công khai và kết quả portal |
| Timeout khi hoàn | Lưu request trước khi gọi; query-only sau timeout | Nếu QueryDR chỉ trả giao dịch thu gốc, đối soát portal/hỗ trợ VNPay |
| Hai khách mua ly cuối | Conditional update stock + version trong transaction | Demo với hai tài khoản/hai tab độc lập |
| VPS nhỏ hết RAM/disk | CI build, log rotation, backup, hướng dẫn swap | Đo tài nguyên trên VPS; không hứa chịu tải lớn |
| Thiếu bằng chứng quy trình | Tệp bàn giao có checklist và phân công | Tạo PR, CI logs, Sprint Review/Retro thật |
