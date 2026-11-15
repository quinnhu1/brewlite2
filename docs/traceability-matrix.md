# Truy vết yêu cầu → thiết kế → hiện thực → kiểm thử

Các tên test dưới đây là chuỗi có thể tìm trong source. Kết quả chạy, giới hạn và minh chứng ngoài môi trường local nằm tại `release/TEST-RESULTS.md` và `release/HANDOFF.md`.

| Yêu cầu | Use-case / story | Thiết kế | Code/API | Kiểm thử / nghiệm thu |
|---|---|---|---|---|
| FR-01/02 | US-01/02 | Activity-01, Class-01 | GET /products, /products/:id; components/menu | checkout.spec.mjs menu → xác nhận; integration adds a fully configured product |
| FR-03 | US-03 | UC-overview, ADR-004 | auth, JwtAuthGuard, AuthThrottleGuard, AdminGuard | current password, revoked JWT, concurrent password changes, DB rate limit; E2E password scenario |
| FR-04 | US-04 | Activity-01, ADR-004 | useCartStore, session.ts, API client, PaymentModal | 8 client tests; browser đổi tài khoản không mang theo đơn thay thế |
| FR-05 | UC-01 | Sequence-01, Class-01 | orders.service, DTO | rejects a forged nested cost and prices three drinks from the database |
| FR-06 | UC-01 | Sequence-01, ADR-002 | payments.service, idempotency.ts, partial unique SQL | repeated/concurrent payments; distinct payment keys; replay keys |
| FR-07 | US-07 | Class-01 | orders.one/me, order-detail, PaymentHistory | hides/owner checks; order-recovery.spec.mjs refresh và access chéo |
| FR-08 | US-08 | Sequence-02 | OrdersService.advance, admin | enforces staff permissions; queues a refund... blocks preparation |
| FR-09 | US-09 | Sequence-01 | PaymentModal, syncCheckoutWithOrder, order-detail | keeps the failed attempt and changes QR to ATM; browser retry |
| FR-10 | UC-02 | Sequence-02, Refund class | RefundsService; prepareRefund; cancel endpoint | cancellation after IPN; full refund concurrent; preflight failure sửa lại; persisted claim query-only |
| FR-11 | US-11 | Activity-01/Sequence-01 | conditional product stock/version update | allows exactly one of two customers to reserve the last two cups |
| FR-12 | UC-01/02 | Sequence-01/02 | vnpay.ts, IPN/QueryDR/refund | unsigned/tampered/wrong-amount IPN; invalid refund signature; statuses05/06; type01 không là refund |
| FR-13 | US-13 | UC-overview | admin product/order/reconcile | protects admin data; version prevents overwrite; only admin reconcile |
| FR-14 | US-14 | Class-01 | promo in Orders, EARN/finalize, Refund.complete | points only after success; mock/full refund reverses exactly once; discounted free order |
| FR-15 | US-15 | ADR-002 | Payments.runRecovery, next_check_at | recovery worker reconciles once/throttles5min; DB claim concurrent |
| NFR-01 | Tất cả | ADR-002 | JWT, DTO, owner query, signature | access chéo, price tamper, duplicate payment/refund, admin roles |
| NFR-02 | Các API chính | Kiến trúc phân lớp | health, catalog, auth, quote, order, payment, cancel | performance.mjs: 12 nhóm/690 mẫu local; p50/p95/max, mọi mẫu <500 ms; đo public/gateway riêng |
| NFR-03/04 | Vận hành | Deployment-01, ADR-003 | health, prod Compose, release/rollback | app.e2e health; prod smoke; reboot/restore phải chạy trên VPS |
| NFR-05 | Quality gate | CI/CD | ci.yml | npm run check, test:integration, test:e2e; GitHub ruleset cần bật |
| NFR-06 | Khách mobile | Activity-01 | UI labels/error/state | Playwright Pixel7; kiểm tra visual trên thiết bị thật còn cần làm |
| NFR-07 | Audit/delivery | Class-01/Sequence-02 | payment_attempts/refunds; SHA images | API history + receipt; release ghi URL và CI links thật |

FR-16 (PWA offline nâng cao) và FR-17 (bù tiền trên đơn cũ) ngoài phạm vi bản này. Ma trận không biến test chưa chạy được thành test pass.
