<<<<<<< HEAD
# VNPay Sandbox, QR, thẻ, hủy và hoàn tiền

Bản sửa **giữ QR và thẻ**, không thay toàn bộ bằng mock. Adapter hiện cố định endpoint Sandbox; không tự chuyển sang thanh toán live. QR/ATM/thẻ được thực hiện ở cổng VNPay, BrewLite không thu thập PAN/CVV/OTP. Nguồn ZIP không có `.env`/merchant secret để kiểm tra trực tiếp tài khoản của nhóm, vì vậy kết quả QR thực tế chưa được xác nhận.

## Cấu hình và lựa chọn kênh

| Lựa chọn UI | vnp_BankCode gửi VNPay |
|---|---|
| VNPay QR | VNPAYQR |
| Thẻ ATM/tài khoản nội địa | VNBANK |
| Thẻ quốc tế | INTCARD |
| Chọn tại cổng VNPay | Bỏ tham số bank code |

Backend lấy amount từ Order DB, nhân 100 theo giao thức; ký HMAC-SHA512 với thứ tự/encoding VNPay; dùng thời gian GMT+7; mỗi attempt có gateway ref riêng. Local `.env` của API cần TmnCode 8 ký tự, secret, Return URL đúng. Production đã dựng Return URL `https://DOMAIN/api/payments/vnpay/return`. **IPN** `https://DOMAIN/api/payments/vnpay/ipn` phải đăng ký riêng; IPN public cần SSL và không có tunnel warning/login/bot challenge.

HTTPS không tự kích hoạt quyền QR. Trên local có thể dùng tunnel để IPN tới API, nhưng tunnel phải đang chạy, URL phải còn hiệu lực. Khi đã lên VPS/domain ổn định thì bỏ tunnel khỏi luồng public.

## Vì sao QR có thể lỗi trong khi ATM chạy?

Chưa có response code/log merchant của lần lỗi nên không khẳng định một nguyên nhân. Các hướng cần kiểm chứng: QR chưa được bật cho TmnCode; môi trường/kênh test không hỗ trợ app ngân hàng dùng để quét; URL/amount/date/signature sai; cấu hình callback thay đổi. Mã QR hiển thị được **không đồng nghĩa** sẽ thu được tiền bằng app ngân hàng live. Thông báo ngân hàng nhận chưa đăng ký có thể do không tương thích giữa kênh test và app live — đây là giả thuyết cần VNPay xác nhận.

Quy trình Thiện/Triệu thực hiện:

1. Dùng một domain HTTPS ổn định, đúng TmnCode/secret của cùng môi trường, kiểm tra giờ server `timedatectl`.
2. Test ATM NCB với thông tin test chính thức; ghi order_id, payment_id, gateway_ref, response code và kết quả portal. Không đưa secret vào ảnh/log.
3. Test GATEWAY (không bank_code), chọn QR tại VNPay; test tiếp VNPAYQR trực tiếp. So sánh kết quả theo merchant, không thay code tùy tiện.
4. Hỏi VNPay Sandbox cách thử QR cho merchant này, app/môi trường thử nào được hỗ trợ và quyền refund/QueryDR. Công cụ test/simulator do VNPay cung cấp mới là nguồn xác nhận, không dùng thẻ/tài khoản tiền thật để ép demo.
5. Trường hợp QR chưa được cấp: báo rõ giới hạn trong demo; tiếp tục ATM Sandbox và mock cho các nhánh nghiệp vụ. Không hứa QR ngân hàng live hoạt động chỉ nhờ sửa frontend.

Tài liệu VNPay có API lấy danh sách ngân hàng theo `tmn_code` (tham khảo link PAY ở cuối). Danh sách kênh đang bật và cách test cụ thể phải khớp merchant. Không cần đăng ký tài khoản mới để sửa lỗi khóa đơn. Nếu VNPay cấp merchant mới, giữ dữ liệu và cấu hình merchant cũ cho giao dịch chưa đối soát; không thay key rồi hy vọng IPN cũ vẫn hợp lệ. Bản sửa lưu merchant_code và chặn đối soát bằng merchant khác.

## Trạng thái và cách sử dụng

| Tình huống | Backend | Khách / quản trị |
|---|---|---|
| Chưa tạo payment | Order pending, có reservation | Thanh toán hoặc hủy |
| Payment failed đã xác minh | Giữ attempt cũ; order payment_failed còn hạn | Chọn QR/thẻ khác, key mới; hoặc hủy |
| Payment pending | Một outstanding payment; không tạo charge khác | Mở lại URL còn hạn, kiểm tra kết quả hoặc gửi yêu cầu hủy |
| Hết URL/đóng tab/mất mạng | Không tự coi là failed | Worker tiếp tục QueryDR; trạng thái/giải thích hiển thị |
| Hủy khi pending | Ghi cancellation_requested_at, chặn pha chế | Đã nhận yêu cầu, chờ kết quả; chưa hứa đã hoàn |
| Kết quả pending chuyển failed | Hủy, release stock một lần | Đã hủy, không có refund vì chưa thu |
| Kết quả chuyển success, đã xin hủy | Tạo refund receipt, không cho PREPARING | Chờ xác nhận hoàn |
| Refund type02, đủ tiền, status00 và chữ ký hợp lệ | Payment refunded, Order cancelled, trả stock/đảo điểm một lần | Có chứng từ, cho tạo đơn thay thế |
| Refund API00 nhưng status05/06 | processing, không chốt hoàn | Hiện đang xử lý, quản trị thấy mã |
| Thiếu secret hoặc dữ liệu gốc sai trước khi gửi | review_required; submitted_at vẫn null; không gọi gateway | Sửa cấu hình/dữ liệu có bằng chứng, đợi cooldown; worker gửi lần đầu |
| Timeout khi refund | review_required, lưu request/submitted, query-only | Không gửi lệnh hoàn mới |
| Đang PREPARING trở đi | Từ chối hủy 409 | Giữ chính sách đã thông báo |

`POST /orders/:id/cancel` trả 200 nghĩa là **tiếp nhận thành công**. Đọc `status`, `message`, `refunds`, `actions`; không dựa HTTP200 để hiện “đã hủy/hoàn”. Các action FE được quyết định từ backend. Một khoản thu không được tự “xóa” để đổi món; hoàn xong mới mở đơn thay thế có liên kết.

Worker chạy mỗi 30s, lần query đầu sau khoảng 1 phút, các query sau cách ít nhất 5 phút cho payment đó. Claim lịch lưu DB để nhiều request/process không cùng gọi gateway. IPN vẫn xử lý ngay. Một request timeout/response giả không thay trạng thái thành failed. Giao dịch cũ thiếu merchant metadata vẫn cần đối chiếu trước khi đổi cấu hình.

## Hoàn tiền: giới hạn phải hiểu

`VNPAY_REFUND_ENABLED=true` chỉ cho hệ thống gửi API; không cấp quyền merchant ở VNPay. Một receipt duy nhất/payment, request ID duy nhất và tổng hoàn bằng số tiền gốc. Phản hồi phải có chữ ký, đúng merchant/ref/amount, TransactionType02 và TransactionStatus00 mới hoàn tất. Không dùng kết quả thu gốc type01 làm bằng chứng hoàn.

Từ bản 1.3, `prepareRefund` kiểm tra cấu hình, mã giao dịch, ngày, số tiền và ký/serialize payload **trước** khi transaction ghi `submitted_at`. Lỗi cục bộ ở bước này không phải một lần gửi: giữ null, ghi thông báo rõ, thử lại khi đến lịch sau khi đã sửa. Khi claim đã commit và bắt đầu gửi, timeout/crash là kết quả chưa rõ; chỉ query để tránh hoàn hai lần. Worker chọn công việc đến hạn sớm nhất để phiếu lâu năm không liên tục chiếm lượt của phiếu khác.

Nếu QueryDR của môi trường merchant chỉ trả giao dịch thu gốc hoặc refund chưa cập nhật, worker không thể tự bịa kết quả. Trạng thái sẽ processing/review; admin xem chứng từ, làm rõ với portal/hỗ trợ và dùng nút đối soát. Hoàn bị từ chối cũng không tự resend; admin có thể query lại sau khi provider xử lý. Nếu crash giữa lưu submitted_at và gửi request, phải đối soát chứ không gửi thêm một lệnh mới không kiểm soát. Đây là lựa chọn bảo toàn tiền, không là lỗi UI bị khóa vô cớ.

### Xử lý phiếu hoàn đã tạo bằng bản cũ

1. Backup DB; ghi lại refund_id, request_id, gateway_ref, merchant_code, số tiền và thời điểm. Không sao chép secret vào issue/log.
2. Nếu `submitted_at` null: sửa cấu hình/dữ liệu nguồn đúng merchant, bật quyền hoàn nếu được cấp, khởi động lại API khi đổi env; đợi lịch đối soát (tối thiểu 5 phút giữa hai claim) hoặc dùng nút admin sau cooldown.
3. Nếu `submitted_at` đã có: không thể kết luận chưa gửi chỉ vì portal chưa thấy. Đối chiếu request_id với VNPay; dùng query đã xác minh để cập nhật kết quả. **Không UPDATE submitted_at = NULL để ép gửi lại.**
4. Nếu VNPay không trả bằng chứng hoàn cuối qua API, lưu xác nhận merchant và mở issue vận hành. Bản này chưa có nghiệp vụ điều chỉnh tài chính thủ công có phê duyệt/audit riêng; không sửa DB để giả `succeeded`. Chưa có căn cứ thì vẫn giữ processing/review, chưa mở đơn thay thế theo chính sách của nhóm.

Migration không tự sửa các receipt không rõ nguồn gốc của 1.2. Giải pháp mới ngăn lỗi cấu hình cục bộ tạo thêm phiếu mắc kẹt, không thể suy ra kết quả mạng trong quá khứ.

Thời điểm VNPay xác nhận hoàn là bằng chứng hệ thống, không bảo đảm cùng giây khách đã thấy tiền trong app ngân hàng. Demo Sandbox là tiền thử nghiệm.

## Mock nghĩa là gì?

Mock thay dịch vụ thanh toán ngoài bằng bộ xử lý mô phỏng có kiểm soát. DB, Order, stock, loyalty và refund vẫn chạy thật trong hệ thống; chỉ kết quả ngân hàng là giả lập. Đề Assignment 2 mục 7.1 cho phép ví/thẻ mô phỏng. Dùng để demo thành công/thất bại/retry/hủy/hoàn lặp một cách tái lập, không quảng cáo đã chuyển tiền ngân hàng.

| Môi trường | PAYMENT_PROVIDER | Điều kiện |
|---|---|---|
| Local mock | mock | Có thể bật PAYMENT_MOCK_ALLOW_OVERRIDE=true |
| Public demo mock | mock | Phải thêm PAYMENT_ALLOW_MOCK_IN_PRODUCTION=true |
| VNPay Sandbox | vnpay | Secret đúng, callback HTTPS, override false |

Mock hiện hỗ trợ ví/thẻ mô phỏng, không phát mã QR ngân hàng thật. QR Sandbox vẫn giữ trong adapter VNPay. Các test tích hợp gateway dùng response được ký bằng **test secret riêng**, không dùng secret merchant và không chứng minh ngân hàng thật đã nhận tiền.

## Swagger hay Postman?

**Dùng Swagger để học và thử API hằng ngày**: mở `http://localhost:3001/swagger`, đăng nhập lấy accessToken rồi Authorize. Schema đơn/ thanh toán và header Idempotency-Key đã được mô tả; không đưa cost/total vào body. **Dùng Postman để lưu kịch bản** và chạy lặp: import `tests/postman/BrewLite.postman_collection.json`, đặt baseUrl/email/password. Tự động hồi quy quan trọng dùng Jest/PostgreSQL và Playwright trong CI, không chấm bằng việc bấm Send vài lần.

Postman collection có key checkout và key từng payment; giữ cùng key/body khi test resend, đổi key khi bắt đầu một attempt mới sau failed. Không tự lấy tiền từ body trong bất kỳ công cụ nào. Khi đổi môi trường giữa mock/sandbox, tạo session/key mới theo đúng provider và không xóa lịch sử cũ.

## Nguồn chính thức

- PAY, bank codes, IPN: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
- QueryDR/refund và signature/status: https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html
- Thẻ test và giới hạn môi trường: https://sandbox.vnpayment.vn/apis/vnpay-demo/

Thông tin test ATM tại trang demo hiện dùng NCB, 9704198526191432198, NGUYEN VAN A, 07/15, OTP123456. Đây là thẻ công bố cho Sandbox, không dùng thẻ thật. Đối chiếu trang gốc trước buổi demo vì bộ test/kênh có thể thay đổi.
=======
# Kiểm tra thanh toán VNPay Sandbox

## Demo theo đề BrewLite

Assignment 2 chấp nhận thanh toán Ví/Thẻ giả lập. Dùng chế độ này để kiểm tra luồng đặt hàng và thanh toán. Đặt biến trong `app/api/.env` nếu chạy NestJS trên máy, hoặc ở `.env` gốc nếu chạy Compose.

```dotenv
PAYMENT_PROVIDER=mock
PAYMENT_MOCK_ALLOW_OVERRIDE=true
```

Khi chạy Compose, backend dùng `NODE_ENV=production`. Đặt thêm `PAYMENT_ALLOW_MOCK_IN_PRODUCTION=true` cho môi trường demo theo đề. Chọn thành công hoặc thất bại ở checkout để kiểm tra trạng thái và giỏ hàng.

## Demo Sandbox trên cùng một máy

Chạy frontend ở cổng 3000 và backend ở cổng 3001. Mở tunnel cho backend bằng `ngrok http 3001`. Dùng URL HTTPS mà ngrok cấp thay cho `https://your-api.ngrok-free.app`.

```dotenv
# app/api/.env hoặc .env gốc nếu chạy Compose
PAYMENT_PROVIDER=vnpay
PAYMENT_MOCK_ALLOW_OVERRIDE=false
PAYMENT_ALLOW_MOCK_IN_PRODUCTION=false
FRONTEND_URL=http://localhost:3000
VNPAY_TMN_CODE=<ma-merchant-sandbox>
VNPAY_HASH_SECRET=<khoa-sandbox>
VNPAY_RETURN_URL=https://your-api.ngrok-free.app/payments/vnpay/return
```

Giữ `NEXT_PUBLIC_API_URL=http://localhost:3001` trong `app/web/.env.local`, hoặc đặt ở `.env` gốc nếu chạy Compose. Thực hiện checkout từ `http://localhost:3000` trên máy chạy BrewLite để trình duyệt quay về đúng nơi đã đăng nhập.

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

Trình duyệt cần URL web và API mà thiết bị đó truy cập được. Đặt `FRONTEND_URL` thành origin HTTPS của web, `NEXT_PUBLIC_API_URL` thành URL HTTPS của API, rồi build lại Next.js. Nếu mở tunnel cho web trong chế độ `next dev`, điền hostname web vào `NEXT_DEV_ORIGINS` trong `app/web/.env.local` và khởi động lại Next.js. IPN và ReturnUrl vẫn trỏ về API.

Assignment 2 yêu cầu URL frontend production qua HTTPS, URL API và health check hoạt động lúc chấm. Dùng một môi trường chạy liên tục cho đợt nghiệm thu. Tunnel từ laptop phụ thuộc máy và tiến trình ngrok đang chạy. Đặt PostgreSQL trong mạng riêng và giữ HashSecret ở backend. [Vòng đời ngrok Agent Endpoint](https://ngrok.com/docs/gateway/endpoints/agent-endpoints)
>>>>>>> origin/main
