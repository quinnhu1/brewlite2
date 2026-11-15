# Kết quả kiểm thử backend

Người phụ trách: Đức Long. Mỗi lần chạy lại, thêm một mục ở **mục 4** với commit, môi trường, lệnh và kết quả thật. Không ghi "đạt" cho phép kiểm tra chưa chạy.

## 1. Cách chạy

Dùng một database riêng tên kết thúc bằng `_test`. Suite tự từ chối mọi DB khác để không xóa nhầm dữ liệu.

PowerShell, trong `app/api`:

```powershell
npm run db:up                                             # ở thư mục gốc repo: container brewlite-postgres, cổng 5433
docker exec brewlite-postgres createdb -U brewlite brewlite_test   # chỉ lần đầu
$env:TEST_DATABASE_URL = "postgresql://brewlite:<POSTGRES_PASSWORD>@localhost:5433/brewlite_test?schema=public"
$env:DATABASE_URL = $env:TEST_DATABASE_URL
$env:DIRECT_URL = $env:TEST_DATABASE_URL

npm ci
npm run db:migrate          # áp 5 migration, gồm 20261115120000_add_refunds
npm run db:seed             # chỉ catalog; test tự đăng ký user
npm run lint
npm run build
npm test -- --runInBand     # unit
npm run test:e2e -- --runInBand   # integration với PostgreSQL

Remove-Item Env:DATABASE_URL,Env:DIRECT_URL,Env:TEST_DATABASE_URL
```

Chỉ chạy một nhóm test: `npm run test:e2e -- -t "INT-REFUND"`.

Swagger: chạy `npm run start:dev`, mở `http://localhost:3001/swagger-json` và kiểm tra:

- `components.schemas.CreateOrderDto.properties` có `items`, `customer_name`, `customer_phone`...; `CreateOrderItemDto` có `quantity` với `minimum: 1`, `maximum: 50`.
- `paths./orders.post.parameters` chỉ có **một** header `idempotency-key` (required, `minLength: 8`).
- Có `responses` 201/400/401/409 cho `POST /orders`, 200/400/401/409 cho `POST /payments`.

Postman: import `postman/BrewLite.postman_collection.json` và `postman/BrewLite.local.postman_environment.json`, điền `userPassword` (≥ 8 ký tự) trong environment trên máy mình, chạy cả collection theo thứ tự. Chạy bằng dòng lệnh:

```powershell
npx newman run docs/testing/postman/BrewLite.postman_collection.json -e docs/testing/postman/BrewLite.local.postman_environment.json --env-var userPassword=<mật khẩu thử>
```

Collection cần `PAYMENT_PROVIDER=mock` ở backend; thư mục "6. Admin" cần đăng nhập bằng tài khoản admin.

## 2. Ánh xạ mã test nghiệm thu tới test thực tế

File: `app/api/test/checkout.e2e-spec.ts`. Tên test có mã trong ngoặc vuông là test mới thêm ở D3; các dòng còn lại là test đã có, được ánh xạ theo nội dung.

| Mã | Tình huống | Test thực tế | Owner |
| --- | --- | --- | --- |
| API-MENU-01 | Menu và chi tiết món, lỗi ID | `[API-MENU-01] lists active menu items...` | Đức Long |
| INT-PRICE-01 | Gửi price/cost trong items | `[INT-PRICE-01] rejects price/cost nested inside items...`; `rejects client-supplied prices and empty carts` | Đức Long |
| INT-PRICE-02 | Giá DB 10.000đ × 3 = 30.000đ | `[INT-PRICE-02] charges 3 x 10.000đ = 30.000đ...` | Đức Long |
| INT-QTY-01 | Quantity 0, -1, 1.5, 51 | `[INT-QTY-01] rejects quantity 0, -1, 1.5, 51...` | Đức Long |
| INT-STOCK-01 | Tồn 2 (hoặc 1), nhiều người cùng mua | `does not oversell the last serving under concurrent different requests` | Triệu, Đức Long |
| INT-STOCK-02 | Một món hai size vượt tồn | `aggregates stock across two variants of the same product` | Đức Long |
| INT-IDEM-01 | Hai POST /orders cùng key/body | `deduplicates concurrent create requests with the same key` | Đức Long |
| INT-IDEM-02 | Cùng key, khác body hoặc khác user | `rejects reused checkout keys for different content`; `[INT-IDEM-02] refuses a checkout key reused by another account...` | Đức Long |
| INT-PAY-01 | Hai POST /payments cùng key | `makes repeated/concurrent payments one charge and one loyalty credit` | Triệu |
| INT-PAY-02 | Hai key khác cùng một đơn | `prevents distinct payment keys from charging the same order twice` | Triệu |
| INT-PAY-03 | FAILED rồi trả lại bằng key mới | `keeps failed payments retryable and grants points only after success` | Triệu |
| INT-PAY-04 | Callback đáng ngờ/chưa rõ | `keeps suspicious/reversal callbacks pending for reconciliation` | Triệu |
| INT-IPN-01 | Chữ ký sai, sai số tiền, callback lặp | `rejects unsigned, tampered and wrong-amount IPNs`; `confirms valid concurrent IPNs atomically and only once` | Triệu |
| INT-CANCEL-01 | Hủy đơn chưa trả hai lần | `[INT-CANCEL-01] cancelling an unpaid order twice...`; `restores a cancelled reservation once...` | Đức Long |
| INT-REFUND-01 | Đơn PAID mock, hủy đồng thời | `[INT-REFUND-01] a PAID mock order gets exactly one receipt...`; `[INT-REFUND-01] the database itself refuses a second refund row...`; `[INT-REFUND-01] cancelling a free (100% discount) order records a 0đ receipt...`; `cancels and refunds a PAID mock order...` | Đức Long |
| INT-REFUND-02 | Đơn đang pha chế, hoặc người khác hủy/xem | `[INT-REFUND-02] another user cannot cancel or read the refund...`; `refuses cancellation once a paid order is being prepared` | Đức Long |
| INT-STATE-01 | PAID nhảy thẳng COMPLETED | `enforces staff permissions and state progression` | Triệu |
| INT-PROMO-01 | Mã sai, hết hạn, chưa đủ tối thiểu | `[INT-PROMO-01] reports unknown, expired and under-minimum codes...`; `prices database-specific sizes, toppings and promotions...` | Đức Long |

## 3. Kiểm tra trên database đã thực hiện khi viết migration

Môi trường: PostgreSQL 16.15 (Ubuntu), database trống tạo mới. Mã nguồn: `main` tại `5f47f81` cộng thay đổi của nhánh `duclong`. Ngày 15/11/2026.

| Kiểm tra | Lệnh / cách làm | Kết quả |
| --- | --- | --- |
| Áp toàn bộ migration trên DB trống | Chạy lần lượt 5 file `prisma/migrations/*/migration.sql` bằng `psql -v ON_ERROR_STOP=1` | Đạt: 5/5 áp thành công, bảng `refunds` có đủ cột, index, CHECK và khóa ngoại |
| Seed catalog không tạo tài khoản | `psql -f prisma/seed/catalog.sql`, đếm `users` và `products` | Đạt: 0 user, 21 sản phẩm |
| Seed demo cho local | `psql -f prisma/seed/demo-users.sql` hai lần | Đạt: tạo 2 tài khoản demo, chạy lại không lỗi, không trùng |
| Seed demo tự chặn trên DB có admin thật | Thêm admin email thật rồi chạy `demo-users.sql` | Đạt: bị chặn bằng `RAISE EXCEPTION`, không ghi gì |
| Không thể có hai chứng từ hoàn cho một payment | INSERT refund thứ hai cùng `payment_id` | Đạt: lỗi unique `refunds_payment_id_key` |
| Refund `succeeded` phải có `completed_at` | UPDATE `completed_at = NULL` | Đạt: lỗi CHECK `refunds_completed_when_succeeded` |
| Số tiền hoàn không âm | UPDATE `amount = -1` | Đạt: lỗi CHECK `refunds_amount_nonnegative` |
| Không xóa được payment đã có chứng từ hoàn | DELETE payment | Đạt: lỗi khóa ngoại `refunds_payment_id_fkey` |
| Lệnh reset local vẫn chạy sau khi có bảng refunds | `reset-demo-data.sql`, `reset-and-seed.sql` với biến xác nhận | Đạt: xóa refunds trước payments; nạp lại 21 sản phẩm |
| `TRUNCATE` dùng trong `beforeEach` của test | `TRUNCATE refunds,loyalty_transactions,payments,... CASCADE` | Đạt |

Chưa chạy trong môi trường viết code (không cài được gói npm): `npm run lint`, `npm run build`, unit test, integration test, Swagger JSON thực tế, Postman/newman. Các mục này phải chạy trên máy nhóm hoặc CI và ghi vào mục 4.

## 4. Nhật ký các lần chạy

Sao chép mẫu cho mỗi lần chạy.

```markdown
### <ngày> — commit <sha ngắn> — <máy / CI>

- Node: `node -v` = ...; PostgreSQL: ...
- Lệnh: npm run lint · npm run build · npm test · npm run test:e2e
- Lint: đạt/lỗi (số lỗi) · Build: đạt/lỗi
- Unit: x/y đạt · Integration: x/y đạt (z bỏ qua)
- Test thất bại (nếu có): tên test + thông báo lỗi
- Swagger JSON: CreateOrderDto có properties (có/không); một header idempotency-key (có/không)
- Postman/newman: x/y request đạt
- Link CI: https://github.com/quinnhu1/brewlite2/actions/runs/...
```
