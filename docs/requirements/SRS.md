## I. Yêu cầu chức năng (Functional Requirements)

* **FR-01 (Menu):** Hệ thống cung cấp danh sách toàn bộ thức uống hiện có thông qua API `GET /products`, bao gồm hình ảnh, tên món, mô tả và giá tiền cơ sở.
* **FR-02 (Xem chi tiết sản phẩm):** Cho phép người dùng xem chi tiết món (`GET /products/:id`), tùy chọn quy cách thức uống (kích cỡ `S`, `M`, `L`) và các món ăn kèm (`Topping`), hệ thống tự động cộng dồn giá theo thời gian thực.
* **FR-03 (Giỏ hàng):** Cung cấp các thao tác thêm món, cập nhật số lượng (`+/-`), loại bỏ thức uống khỏi giỏ hàng và tính toán tổng số tiền thanh toán tạm tính.
* **FR-04 (Account - Xác thực):** Đăng ký tài khoản mới (`POST /auth/register`), xác thực đăng nhập (`POST /auth/login`) qua chuẩn JSON Web Token (JWT) và lưu phiên đăng nhập.
* **FR-05 (Đặt đơn):** Khởi tạo đơn hàng mới từ giỏ hàng (`POST /orders`) sau khi đã xác thực tài khoản, kiểm tra tồn kho và lưu đơn ở trạng thái khởi tạo `PENDING`.
* **FR-06 (Thanh toán):** Cho phép lựa chọn phương thức thanh toán không dùng tiền mặt (Thẻ ngân hàng hoặc Ví điện tử giả lập) qua `POST /payments`, xử lý giao dịch chống trùng lặp (`Idempotency-Key`) và cập nhật trạng thái đơn hàng.
* **FR-07 (Theo dõi và Lịch sử đơn hàng):** Cung cấp mã định danh đơn hàng sau thanh toán, thông tin trạng thái pha chế và tra cứu lịch sử các đơn hàng cá nhân đã thực hiện (`GET /orders/me`).
* **FR-08 (Quản lý trạng thái đơn):** Kiểm soát vòng đời đơn hàng theo máy trạng thái (`PENDING` $\rightarrow$ `PAID` $\rightarrow$ `PREPARING` $\rightarrow$ `READY` $\rightarrow$ `COMPLETED` cùng các nhánh ngoại lệ `PAYMENT_FAILED`, `CANCELLED`).
* **FR-09 (Khuyến mãi và điểm thưởng):** Cho phép áp mã giảm giá (`Promotion`) hợp lệ khi đặt đơn và tự động cộng điểm tích lũy (`LoyaltyTransaction`) sau khi đơn hàng hoàn tất thanh toán.
* **FR-10 (Giao hàng tận nơi):** Đặt đơn giao hàng (Delivery) và theo dõi vị trí tài xế giao nước.

## II. Yêu cầu phi chức năng (Non-Functional Requirements)

* **NFR-01 (Hiệu năng):** Thời gian phản hồi của tất cả các REST API endpoints không vượt quá 500ms (mục tiêu tối ưu dưới 50ms) trong điều kiện dữ liệu kiểm thử chuẩn.
* **NFR-02 (Bảo mật):** Mật khẩu của người dùng bắt buộc phải được băm an toàn trước khi lưu vào CSDL. Các API (tạo đơn, thanh toán, xem lịch sử) được bảo vệ bằng JWT Guard. Toàn bộ dữ liệu đầu vào phía Client gửi lên phải được lọc và kiểm tra định dạng.
* **NFR-03 (Tính khả dụng & Khả năng tương thích):** Giao diện thiết kế theo chuẩn Mobile-first / PWA, hiển thị đầy đủ trạng thái loading/empty/error và tương thích mượt mà trên các trình duyệt hiện đại (Chrome, Safari, Edge, Firefox).
* **NFR-04 (Khả năng triển khai):** Hệ thống có khả năng đóng gói đồng bộ toàn bộ dịch vụ (Frontend, Backend, Database) bằng Docker Compose chỉ với một lệnh thực thi duy nhất ở local, hỗ trợ endpoint và triển khai tự động qua CI/CD lên môi trường Production (HTTPS).
* **NFR-05 (Tính toàn vẹn dữ liệu):** Hệ thống đảm bảo không xảy ra bán vượt tồn kho (over-selling) khi có nhiều khách hàng đặt đồng thời thông qua cơ chế Transaction và Optimistic Locking.

## III. Mức độ ưu tiên theo MoSCoW

| ID | Requirements | Priority |
| :--- | :--- | :---: |
| FR-01 | Hệ thống cung cấp danh sách toàn bộ thức uống hiện có, bao gồm hình ảnh, tên món, mô tả và giá tiền cơ sở. | **MUST** |
| FR-02 | Cho phép người dùng tùy chọn quy cách thức uống (kích cỡ S, M, L) và các món ăn kèm (Topping), hệ thống tự động cộng dồn giá theo thời gian thực. | **MUST** |
| FR-03 | Cung cấp các thao tác cập nhật số lượng, loại bỏ thức uống khỏi giỏ hàng và tính toán tổng số tiền thanh toán tạm tính. | **MUST** |
| FR-04 | Đăng ký tài khoản mới, xác thực đăng nhập qua chuẩn JSON Web Token (JWT), lưu phiên đăng nhập. | **MUST** |
| FR-05 | Khởi tạo đơn hàng mới từ giỏ hàng, kiểm tra tồn kho và lưu đơn ở trạng thái khởi tạo `PENDING`. | **MUST** |
| FR-06 | Cho phép lựa chọn phương thức thanh toán không dùng tiền mặt (Thẻ ngân hàng hoặc Ví điện tử giả lập), xử lý giao dịch chống trùng lặp và cập nhật trạng thái đơn hàng. | **MUST** |
| FR-07 | Cung cấp mã định danh đơn hàng sau thanh toán, thông tin trạng thái pha chế và tra cứu lịch sử các đơn hàng cá nhân đã thực hiện. | **MUST** |
| FR-08 | Kiểm soát vòng đời đơn hàng theo máy trạng thái (`PENDING` > `PAID` > `PREPARING` > `READY` > `COMPLETED`, xử lý ngoại lệ `PAYMENT_FAILED`, `CANCELLED`). | **MUST** |
| FR-09 | Cho phép áp mã giảm giá hợp lệ khi đặt đơn và tự động cộng điểm tích lũy sau khi đơn hàng hoàn tất. | **SHOULD** |
| FR-10 | Hỗ trợ đặt đơn giao hàng tận nơi (Delivery) và theo dõi vị trí tài xế. | **WON’T** |
| NFR-01 | Thời gian phản hồi của tất cả các REST API endpoints không vượt quá 500ms (mục tiêu dưới 50ms) trong điều kiện dữ liệu kiểm thử chuẩn. | **MUST** |
| NFR-02 | Mật khẩu người dùng được băm an toàn, các API nghiệp vụ bảo vệ bằng JWT Guard và toàn bộ dữ liệu đầu vào được kiểm tra định dạng. | **MUST** |
| NFR-03 | Giao diện tương thích chuẩn Mobile-first / PWA, hiển thị mượt mà trên các trình duyệt hiện đại (Chrome, Safari, Edge, Firefox). | **MUST** |
| NFR-04 | Đóng gói đồng bộ toàn bộ dịch vụ (Frontend, Backend, Database) bằng Docker Compose, hỗ trợ và triển khai tự động qua CI/CD. | **MUST** |
| NFR-05 | Chống bán vượt tồn kho (over-selling) khi nhiều khách hàng đặt đồng thời bằng Transaction và Optimistic Locking. | **SHOULD** |

## IV. Tiêu chí chấp nhận (Acceptance Criteria)

| Mã yêu cầu | Tiêu chí chấp nhận có thể kiểm chứng (Verifiable Acceptance Criteria) |
| :--- | :--- |
| FR-01 | – Gọi API `GET /products` trả về HTTP 200 kèm danh sách đồ uống đúng định dạng.<br>– UI hiển thị đủ ảnh, tên, giá cơ sở; có skeleton khi đang tải (loading) và thông báo khi danh sách rỗng (empty) hoặc lỗi (error). |
| FR-02 | – Thay đổi kích cỡ (S/M/L) hoặc chọn/bỏ chọn topping cập nhật tổng giá món ngay lập tức trên UI.<br>– Công thức tính đúng: `Tổng giá món = Giá cơ sở + Phụ phí size + Tổng giá topping`. |
| FR-03 | – Badge số lượng trên biểu tượng giỏ hàng tăng/giảm khớp với tổng số ly đã thêm.<br>– Xóa món hoặc đổi số lượng cập nhật lại tổng tiền giỏ hàng chính xác ngay lập tức. |
| FR-04 | – Đăng ký tài khoản lưu thành công vào PostgreSQL; đăng nhập đúng trả về JWT token (200), sai mật khẩu/email trả về `401 Unauthorized`. |
| FR-05 | – Gửi `POST /orders` khi chưa đăng nhập bị từ chối với mã 401.<br>– Gửi giỏ hàng rỗng hoặc sản phẩm hết tồn kho bị từ chối với mã 400.<br>– Tạo đơn hợp lệ trả về mã đơn và trạng thái `PENDING`. |
| FR-06 | – Gửi `POST /payments` thành công chuyển trạng thái đơn từ `PENDING` sang `PAID`.<br>– Thanh toán lỗi chuyển đơn sang `PAYMENT_FAILED` và giữ nguyên giỏ hàng để khách thử lại.<br>– Gửi 2 request trùng `Idempotency-Key` chỉ thực thi giao dịch 1 lần duy nhất. |
| FR-07 | – Màn hình xác nhận hiển thị rõ mã đơn hàng (VD: `#1042`) và trạng thái `PAID` ngay sau khi thanh toán.<br>– API `GET /orders/me` chỉ trả về danh sách đơn hàng thuộc về đúng người dùng đang đăng nhập. |
| FR-08 | – Chuyển đổi đúng luồng hợp lệ (`PENDING` > `PAID` > `PREPARING` > `READY` > `COMPLETED`) thành công.<br>– Cố tình chuyển sai quy tắc (VD: `PENDING` > `COMPLETED`) bị hệ thống chặn và ném lỗi. |
| FR-09 | – Áp dụng mã `Promotion` còn hạn và hợp lệ làm giảm đúng số tiền tương ứng; mã hết hạn/sai bị từ chối.<br>– Điểm thưởng (`loyaltyPoints`) của user tự động tăng lên sau khi đơn đạt trạng thái `PAID`. |
| NFR-01 | – Kiểm thử hiệu năng (Postman / Supertest / k6) với tập dữ liệu mẫu cho thời gian phản hồi trung bình của các endpoint $< 500\text{ms}$ (và $< 50\text{ms}$ trên local). |
| NFR-02 | – Dữ liệu của mật khẩu trong bảng User là chuỗi đã băm `bcrypt`, không chứa plain-text.<br>– Dữ liệu đầu vào sai kiểu/thiếu trường bắt buộc bị chặn tại tầng DTO Validation. |
| NFR-03 | – Giao diện hiển thị cân đối, không tràn khung trên màn hình di động (375px) và máy tính (1440px) trên Chrome, Safari, Edge, Firefox. |
| NFR-04 | – Lệnh `docker-compose up -build` khởi chạy thành công cả 3 container (web, api, db).<br>– Endpoint `GET /health` trả về `200 OK` trên môi trường Production. |
| NFR-05 | – Integration test gửi đồng thời nhiều request đặt vượt số lượng tồn kho thực tế chỉ chấp nhận số lượng đơn hợp lệ trong giới hạn tồn kho, các request dư bị từ chối. |