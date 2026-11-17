## I. Vấn đề nghiệp vụ (Business Problem)

* Tại các cửa hàng cà phê theo mô hình truyền thống, quy trình gọi món và thanh toán bằng tiền mặt tại quầy thường gây ra tình trạng dồn đơn vào giờ cao điểm, kéo dài thời gian chờ đợi của khách hàng và dễ xảy ra sai sót khi thối tiền hoặc ghi nhận tùy chọn đồ uống (kích cỡ, topping).
* Hệ thống BrewLite được xây dựng nhằm giải quyết bài toán này thông qua việc số hóa quy trình đặt món: cho phép khách hàng tự xem thực đơn trực tuyến, tùy chỉnh đồ uống và thanh toán không dùng tiền mặt chỉ trong vài thao tác. Điều này giúp rút ngắn tối đa thời gian xếp hàng tại quầy, giảm tải áp lực cho nhân viên thu ngân và đảm bảo tính chính xác của đơn hàng trước khi chuyển sang khâu pha chế.

## II. Các bên liên quan (Stakeholders), Mục tiêu & Kỳ vọng

| STT | Đối tượng | Vai trò | Kỳ vọng / Mục tiêu |
| :---: | :--- | :--- | :--- |
| 1 | Khách hàng | Người dùng cuối trực tiếp thao tác trên ứng dụng web | Xem thực đơn trực quan, dễ dàng tùy chỉnh size/topping, thanh toán không tiền mặt nhanh chóng, nhận mã đơn rõ ràng và theo dõi được lịch sử đặt hàng. |
| 2 | Nhân viên quầy Barista | Người tiếp nhận đơn đã thanh toán<br>Người thực hiện pha chế | Nhận được thông tin đơn hàng chính xác (mã đơn, món, size, topping) đã qua thanh toán để pha chế đúng yêu cầu, tránh nhầm hoặc sót đơn. |
| 3 | Quản lý cửa hàng | Người định hướng sản phẩm, ưu tiên Product Backlog và nghiệm thu Increment | Tối ưu hóa quy trình vận hành tại quầy, giảm thời gian phục vụ trung bình trên mỗi khách, kiểm soát chặt chẽ tồn kho nguyên liệu/sản phẩm và doanh thu. |
| 4 | Giảng viên | Người đánh giá quy định phát triển và chất lượng sản phẩm cuối cùng. | Hệ thống vận hành ổn định end-to-end, tuân thủ đúng quy trình Agile Scrum, đáp ứng đầy đủ các tiêu chí chấp nhận và giải quyết tốt các bài toán nghiệp vụ backend. |
| 5 | Nhóm phát triển | Đội ngũ phân tích, thiết kế, lập trình, kiểm thử và vận hành CI/CD. | Xây dựng hệ thống đúng kiến trúc đề xuất, mã nguồn chuẩn sạch, độ bao phủ kiểm thử tốt; quy trình làm việc qua Git branch có kiểm soát chất lượng tự động (CI/CD). |
| 6 | Đơn vị thanh toán | Bên cung cấp hạ tầng giao dịch thanh toán không tiền mặt | Xử lý giao dịch an toàn, phản hồi trạng thái thanh toán (thành công/thất bại) nhanh chóng, đảm bảo tính toàn vẹn dữ liệu và không trừ tiền trùng lặp. |

## III. Phạm vi dự án (Project Scope)

### 1. Phạm vi trong MVP (In-Scope)

* **Phân hệ Khách hàng (Next.js Mobile-first/PWA)**
  * Hiển thị danh sách thực đơn (`GET/products`) và chi tiết sản phẩm (`GET/products/:id`) kèm xử lý đầy đủ trạng thái loading, empty và error.
  * Tùy chỉnh kích cỡ (`S, M, L`) chọn topping và tự động tính tổng giá trị đơn hàng.
  * Quản lý giỏ hàng (thêm, xóa, sửa, cập nhật số lượng).
  * Đăng ký đăng nhập và duy trì phiên làm việc bằng JWT.
  * Tạo đơn hàng và áp dụng khuyến mãi, thanh toán không tiền mặt.
  * Màn hình xác nhận đơn, theo dõi trạng thái đơn và xem lịch sử đơn hàng cá nhân.

* **Phân hệ Backend và Nghiệp vụ (NestJS + PostgreSQL)**
  * Quản lý đơn hàng Order State Machine (`PENDING > PAID > PREPARING > READY > COMPLETED`, xử lý ngoại lệ `PAYMENT_FAILED`, `CANCELLED`).
  * Thanh toán an toàn, tránh trùng lặp đơn hàng.
  * Kiểm soát tồn kho.

* **Kỹ thuật, Kiểm thử, Triển khai (DevOps & CI/CD)**
  * Cấu trúc Monorepo chuẩn.
  * Đầy đủ kiểm thử: Unit Test, Integration Test và End-to-End Test.
  * Thiết lập pipeline CI/CD tự động.
  * Triển khai ứng dụng lên môi trường Production có URL HTTPS truy cập công khai (24/7) cho Frontend và API.

### 2. Phạm vi mở rộng (Extended Scope - Định hướng phiên bản sau)

* Xây dựng giao diện màn hình riêng dành cho Barista / Nhân viên quầy (KDS) để tiếp nhận đơn và cập nhật tiến độ pha chế theo thời gian thực.
* Trang quản trị (Admin Dashboard) cho Quản lý cửa hàng để thêm/sửa/xóa món, quản lý tồn kho, tạo mã khuyến mãi và xem báo cáo doanh thu.
* Tích hợp cổng thanh toán thương mại thực tế (MoMo, VNPay, Stripe) thay thế cho dịch vụ giả lập.

### 3. Các nội dung không thực hiện (Out-of-Scope)

* Không hỗ trợ đặt hàng giao tận nơi (Delivery) và theo dõi vị trí shipper; khách hàng chỉ đặt trước và nhận nước trực tiếp tại quầy.
* Không phát triển ứng dụng di động gốc (Native iOS/Android); hệ thống chỉ chạy dưới dạng ứng dụng web (Web App) tương thích trên các trình duyệt.
* Không hỗ trợ thanh toán bằng tiền mặt (COD / trả tiền mặt tại quầy) trong luồng đặt đơn của hệ thống.

## IV. Giả định, Ràng buộc và Rủi ro ban đầu

### 1. Giả định (Assumptions)

* Khách hàng sử dụng thiết bị có kết nối Internet ổn định và trình duyệt web hiện đại khi truy cập hệ thống.
* Cổng thanh toán giả lập (Mock Payment Service) hoạt động ổn định và phản hồi kết quả giao dịch (thành công hoặc lỗi) theo đúng kịch bản kiểm thử của hệ thống.
* Dữ liệu thực đơn, giá thành, kích cỡ, topping và số lượng tồn kho ban đầu đã được khởi tạo sẵn trong cơ sở dữ liệu mẫu.

### 2. Ràng buộc (Constraints)

* **Công nghệ bắt buộc:** Backend phải phát triển bằng `NestJS` (TypeScript), Frontend phát triển bằng `Next.js` (React, TypeScript), cơ sở dữ liệu quan hệ `PostgreSQL` (qua Prisma hoặc TypeORM).
* **Yêu cầu hiệu năng & bảo mật:** Thời gian phản hồi API dưới 500ms với dữ liệu mẫu; mật khẩu phải được băm an toàn và mọi dữ liệu đầu vào phải được kiểm tra hợp lệ.
* **Quy trình & Đóng gói:** Tuân thủ quy trình Agile Scrum với 10 task (tổng 10 điểm); toàn bộ hệ thống phải đóng gói và khởi chạy đồng bộ được bằng `Docker Compose`.

### 3. Rủi ro ban đầu (Initial Risks)

* **Rủi ro xung đột dữ liệu khi đặt đồng thời (Race Condition):** Nhiều khách hàng cùng đặt một món có số lượng tồn kho giới hạn tại cùng một thời điểm dẫn đến bán vượt tồn kho. *Giải pháp giảm thiểu: Áp dụng Database Transaction kết hợp Optimistic Locking.*
* **Rủi ro thanh toán trùng lặp (Duplicate Payment):** Người dùng nhấn nút thanh toán nhiều lần do mạng chậm làm phát sinh nhiều giao dịch. *Giải pháp giảm thiểu: Sử dụng cơ chế Idempotency-Key cho API thanh toán.*