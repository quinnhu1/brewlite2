# Kiểm tra thanh toán VNPay Sandbox

## Demo theo đề BrewLite

Assignment 2 chấp nhận thanh toán Ví/Thẻ giả lập. Dùng chế độ này để kiểm tra luồng đặt hàng và thanh toán. Đặt biến trong `apps/api/.env` nếu chạy NestJS trên máy, hoặc ở `.env` gốc nếu chạy Compose.

```dotenv
PAYMENT_PROVIDER=mock
PAYMENT_MOCK_ALLOW_OVERRIDE=true
```

Khi chạy Compose, backend dùng `NODE_ENV=production`. Đặt thêm `PAYMENT_ALLOW_MOCK_IN_PRODUCTION=true` cho môi trường demo theo đề. Chọn thành công hoặc thất bại ở checkout để kiểm tra trạng thái và giỏ hàng.

## Demo Sandbox trên cùng một máy

Chạy frontend ở cổng 3000 và backend ở cổng 3001. Mở tunnel cho backend bằng `ngrok http 3001`. Dùng URL HTTPS mà ngrok cấp thay cho `https://your-api.ngrok-free.app`.

```dotenv
# apps/api/.env hoặc .env gốc nếu chạy Compose
PAYMENT_PROVIDER=vnpay
PAYMENT_MOCK_ALLOW_OVERRIDE=false
PAYMENT_ALLOW_MOCK_IN_PRODUCTION=false
FRONTEND_URL=http://localhost:3000
VNPAY_TMN_CODE=<ma-merchant-sandbox>
VNPAY_HASH_SECRET=<khoa-sandbox>
VNPAY_RETURN_URL=https://your-api.ngrok-free.app/payments/vnpay/return
```

Giữ `NEXT_PUBLIC_API_URL=http://localhost:3001` trong `apps/web/.env.local`, hoặc đặt ở `.env` gốc nếu chạy Compose. Thực hiện checkout từ `http://localhost:3000` trên máy chạy BrewLite để trình duyệt quay về đúng nơi đã đăng nhập.

Đăng ký IPN `https://your-api.ngrok-free.app/payments/vnpay/ipn` với VNPay cho đúng merchant. ReturnUrl đưa trình duyệt về trang kết quả và cũng áp dụng kết quả đã ký khi IPN chưa tới; IPN vẫn là nguồn xác nhận chính. NestJS cũng có thể chủ động đối soát bằng QueryDR đã xác minh chữ ký. [Tích hợp PAY 2.1.0](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html)

Khởi động lại backend sau khi sửa biến. Tạo giao dịch mới khi thử cấu hình mới. Phiên đang chờ dùng URL đã ký tại lúc tạo nên cần kiểm tra trạng thái phiên đó trước khi thử một đơn mới.

```powershell
$api = 'https://your-api.ngrok-free.app'
Invoke-RestMethod "$api/health"
Invoke-RestMethod "$api/payments/vnpay/ipn"
```

`/health` trả `status = ok` khi backend kết nối được PostgreSQL. IPN gọi thử thiếu chữ ký sẽ trả `RspCode = 97` nếu cấu hình merchant hợp lệ. Kết quả này kiểm tra được đường tới NestJS. Sau giao dịch test, xem request IPN thực tế trên ngrok và đối chiếu trạng thái đơn. [IPN và mã phản hồi](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html)

## Khoanh vùng khi QR thất bại

1. Chọn **Cổng VNPay · chọn phương thức**, chọn thẻ nội địa NCB và dùng dữ liệu thẻ test chính thức. Đây là phép thử riêng cho merchant, callback và đối soát. [Thẻ và OTP test](https://sandbox.vnpayment.vn/apis/vnpay-demo/)
2. Khi QR Sandbox xuất hiện nhưng app ngân hàng báo không tìm thấy hoặc chưa đăng ký giao dịch, thử một mã mới với ứng dụng và tài khoản test được VNPay xác nhận cho merchant. App ngân hàng đang chạy giao dịch thật có thể đọc QR nhưng không tra được phiên Sandbox. [Các phương thức VNPay hỗ trợ](https://sandbox.vnpayment.vn/apis/)
3. Nếu NCB cập nhật đơn thành `PAID` nhưng QR lỗi trên trang VNPay, kiểm tra kênh QR của đúng merchant và phương thức quét test được VNPay hỗ trợ. Nút **VNPay QR (Sandbox)** gửi `vnp_BankCode=VNPAYQR`. Danh sách kênh thật phụ thuộc merchant Sandbox. [Tham số BankCode và API danh sách ngân hàng](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html)
4. Nếu VNPay báo thành công nhưng BrewLite còn chờ, kiểm tra IPN đã đăng ký, URL tunnel và request tới `/payments/vnpay/ipn`. Trên chi tiết đơn có nút đối soát. Nếu BrewLite hiện mã VNPay, đối chiếu mã đó với bảng của cổng. [Bảng mã lỗi](https://sandbox.vnpayment.vn/apis/docs/bang-ma-loi/)

## Cho người khác truy cập

Trình duyệt cần URL web và API mà thiết bị đó truy cập được. Đặt `FRONTEND_URL` thành origin HTTPS của web, `NEXT_PUBLIC_API_URL` thành URL HTTPS của API, rồi build lại Next.js. Nếu mở tunnel cho web trong chế độ `next dev`, điền hostname web vào `NEXT_DEV_ORIGINS` trong `apps/web/.env.local` và khởi động lại Next.js. IPN và ReturnUrl vẫn trỏ về API.

Assignment 2 yêu cầu URL frontend production qua HTTPS, URL API và health check hoạt động lúc chấm. Dùng một môi trường chạy liên tục cho đợt nghiệm thu. Tunnel từ laptop phụ thuộc máy và tiến trình ngrok đang chạy. Đặt PostgreSQL trong mạng riêng và giữ HashSecret ở backend. [Vòng đời ngrok Agent Endpoint](https://ngrok.com/docs/gateway/endpoints/agent-endpoints)
