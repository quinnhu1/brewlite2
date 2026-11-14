# ADR-002 — tách Order, Payment attempt và Refund

**Trạng thái:** đề xuất đã hiện thực trong bản sửa, chờ nhóm nghiệm thu.

**Bối cảnh:** URL thanh toán có thể thất bại hoặc khách đóng tab; giao dịch có thể thành công tại ngân hàng trong khi UI chưa nhận kết quả. Đổi kênh và hủy đơn không được làm thu hoặc hoàn hai lần.

**Quyết định:** snapshot amount trên Order; nhiều Payment attempt nhưng một pending/success; idempotency-key + fingerprint; callback đã xác minh; ReturnUrl chỉ điều hướng. Hủy được ghi bền vững, chặn pha chế; Refund riêng với request ID duy nhất, chỉ hoàn toàn phần. Worker lưu lịch xuống DB; submit refund đúng một lần và query khi chưa rõ. Đơn mới có reference về đơn cũ đã hủy/hoàn.

**Lý do:** mọi khoản thu/hoàn có chứng từ cho quản lý; không ghi đè lịch sử; transaction bảo vệ stock/points. Trả 200 từ cancel nghĩa là đã tiếp nhận, phải đọc status/actions/refunds để biết hoàn tất.

**Đánh đổi:** trạng thái chưa rõ có thể giữ stock lâu hơn 20 phút; cần vận hành đối soát. Không đổi kênh khi còn pending. Không tự coi response00 của API là tiền đã hoàn. Nếu sandbox không cung cấp bằng chứng hoàn cuối, phải để processing/review và xác minh với VNPay.
