# ADR 004 Phiên đăng nhập và quyền sở hữu giỏ hàng

**Trạng thái:** đã hiện thực và kiểm tra ở lớp HTTP/DB, store và API client; browser E2E còn cần chạy trên máy/CI có Chromium hoạt động.

**Bối cảnh:** token còn hạn tiếp tục dùng được sau đổi mật khẩu; đổi mật khẩu chưa yêu cầu mật khẩu cũ. Trạng thái replacementOrderId trong giỏ dùng chung có thể đi theo tài khoản khác, làm checkout bị từ chối đúng ở backend nhưng người dùng không hiểu lý do.

**Quyết định:** JWT chứa users.auth_version. JwtAuthGuard đọc DB mỗi request, yêu cầu phiên bản khớp. Đổi mật khẩu cần current_password; update có điều kiện phiên bản và increment nguyên tử. Hai request đổi mật khẩu cùng phiên bản chỉ một request thắng. POST /auth/logout tăng phiên bản và nút UI ghi rõ Đăng xuất mọi phiên. TTL mặc định mới là 3600 giây; env cũ có thể ghi đè nên phải kiểm tra cấu hình triển khai.

Giới hạn đăng nhập áp dụng 60 lần/phút/IP và 10 lần/15 phút/identifier; đăng ký 20 lần/phút/IP; đổi mật khẩu 5 lần/15 phút/user. Đếm cả lần thành công, dùng bucket PostgreSQL và trả 429 với Retry-After. Bucket lưu SHA256 của định danh theo scope, không lưu chuỗi IP/email/mật khẩu nguyên văn; hash không được coi là dữ liệu hoàn toàn vô danh. Giới hạn identifier theo chuỗi đăng nhập: email và số điện thoại là hai bucket, có giới hạn IP bổ sung. Đây là kiểm soát cơ bản, chưa là hệ thống chống tấn công phân tán hoàn chỉnh.

Giỏ gắn ownerUserId; giỏ guest sạch có thể chuyển cho user vừa đăng nhập. Đổi giữa hai user/đăng xuất dọn giỏ, checkout, đơn thay thế và promo. Snapshot cũ không biết owner bị dọn một lần. API client bỏ response của token cũ, kể cả khi token đổi giữa lúc đọc body. Tab khác thay token thì reload để lấy phiên hiện tại. Backend vẫn là nơi kiểm tra quyền cuối cùng.

**Đánh đổi:** mỗi API bảo vệ thêm một lần đọc user; đổi mật khẩu/đăng xuất làm các thiết bị đăng nhập lại. Không có refresh token, danh sách thiết bị hay đăng xuất riêng một thiết bị trong bản này. Token vẫn ở localStorage như kiến trúc hiện tại; việc chuyển sang cookie HttpOnly cần thiết kế CSRF và session riêng, không được mô tả là đã triển khai.

**Nâng cấp:** chạy migration 20261114120000_auth_sessions_rate_limits trước khi chạy API mới. Token cũ thiếu auth_version bị 401. Không rollback sang API bỏ qua auth_version vì có thể làm token đã thu hồi được chấp nhận lại; ưu tiên sửa tiến lên hoặc chuẩn bị thay JWT secret và buộc đăng nhập lại trong một kế hoạch rollback đã kiểm tra.

**Bằng chứng:** 64 integration tests (gồm thu hồi phiên, cạnh tranh đổi mật khẩu, giới hạn đăng nhập đồng thời); 8 client tests; hai kịch bản browser bổ sung về đổi tài khoản và đổi mật khẩu.
