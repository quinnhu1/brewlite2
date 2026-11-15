# Kiến trúc BrewLite

BrewLite là modular monolith: Next.js phụ trách trải nghiệm; NestJS gồm Auth, Products, Orders, Payments, Refunds và Admin; PostgreSQL giữ dữ liệu bền vững. Prisma migrations là nguồn quản lý schema. Cấu trúc này giữ transaction tiền/tồn/điểm nhất quán mà không cần message broker hoặc microservices.

## 1. Thành phần và đường dẫn

| Thành phần | Trách nhiệm | Mã nguồn / cấu hình | Cổng |
|---|---|---|---:|
| Web | Menu, giỏ, checkout, tracking, tài khoản và admin | `apps/web` | 3000 |
| API | Auth, catalog, đơn hàng, thanh toán, hoàn tiền, admin | `apps/api` | 3001 |
| PostgreSQL 16 | Dữ liệu nghiệp vụ, phiên auth, lịch đối soát | `apps/api/prisma` | 5432 nội bộ / 5433 local |
| Proxy (Caddy) | TLS, HTTP redirect, `/api/*` → NestJS, route còn lại → Next.js | `deploy/Caddyfile`, service `proxy` | 80/443 |
| CI/CD | Verify, build hai image cùng SHA, SSH release | `.github/workflows/ci.yml` | — |

Các thư mục nghiệp vụ cần giữ nguyên của bản fixed:

- `apps/api/src/orders/`, `payments/`, `refunds/`: trạng thái đơn, payment attempt, callback/IPN, reconcile và hoàn tiền.
- `apps/api/src/auth/`: DTO, service, JWT guard, `auth_version` và auth throttle.
- `apps/web/src/lib/api/`, `lib/session.ts`, `lib/checkout/sync.ts`: hợp đồng API và đồng bộ session/checkout.
- `apps/web/src/components/` và `apps/web/src/app/`: trải nghiệm menu, cart, thanh toán, lịch sử và quản trị.

## 2. Phân lớp và ranh giới dữ liệu

```text
HTTP request
   ↓
Controller        DTO validation, route mapping, guard
   ↓
Service           nghiệp vụ, transaction, idempotency
   ↓
PrismaService     truy vấn và migration
   ↓
PostgreSQL
```

- Controller chỉ ánh xạ HTTP sang service; quyền truy cập được kiểm tra bởi guard và dữ liệu trong DB.
- Service giữ bất biến nghiệp vụ: giá lấy từ DB/snapshot Order, tồn kho cập nhật có điều kiện, thao tác đơn/thanh toán/hoàn có idempotency và transaction phù hợp.
- Mỗi Payment attempt có dấu vết riêng; không giữ transaction SQL trong lúc gọi gateway qua mạng.
- Refund có claim bền vững và luồng đối soát riêng. `review_required` là việc cần người xử lý, không đồng nghĩa đã hoàn tiền.
- Prisma schema và migrations trong `apps/api/prisma` là nguồn schema duy nhất. Production dùng `prisma migrate deploy`; không dùng `db push` hoặc reset DB đang có dữ liệu.

## 3. Auth và session

JWT của bản fixed chứa `user_id` và `auth_version`. `JwtAuthGuard` xác minh token rồi đọc `users.auth_version` trong DB ở mỗi request được bảo vệ; token chỉ hợp lệ khi phiên bản khớp. Đổi mật khẩu yêu cầu `current_password`, cập nhật password và tăng `auth_version` trong transaction với điều kiện phiên bản cũ; request đổi đồng thời chỉ một request có thể thắng. `POST /auth/logout` tăng phiên bản và thu hồi mọi token cũ.

Mật khẩu đăng ký và mật khẩu mới khi cập nhật hồ sơ được validate tối thiểu 8 ký tự, có chữ cái và chữ số. Login không dùng các quy tắc mạnh này để tài khoản cũ vẫn được gửi tới luồng xác thực thông thường. Trước mỗi lần bcrypt hash, API chặn mật khẩu dài hơn 72 **byte UTF-8**; số byte có thể lớn hơn số ký tự khi chứa dấu. Chi tiết phiên và cart ownership nằm trong [ADR-004](adr/004-auth-and-cart-ownership.md); chính sách secrets ở [ADR-005](adr/005-secrets-and-access.md).

## 4. Production request flow và health

```text
Browser ── HTTPS ──> proxy :443
                        ├── /api/* → api:3001 (bỏ prefix /api)
                        └── /*     → web:3000
                                      api ──> db:5432 (network database nội bộ)
```

- Chỉ service `proxy` publish host ports 80/443; `api` và `web` không publish port host; `db` ở network `database` nội bộ.
- Web production được build với `NEXT_PUBLIC_API_URL=/api`, nên API dùng cùng domain.
- Caddy tự cấp/gia hạn TLS và lưu state ở volume `caddy_data`; không xóa volume này khi prune.
- API container healthcheck gọi `GET /health`. Handler này gọi `SELECT 1` qua Prisma; do đó trạng thái `{"status":"ok"}` có nghĩa API truy vấn được PostgreSQL, không phải health endpoint độc lập với DB.
- Post-release smoke còn kiểm tra `/signin`, catalog, cấu hình thanh toán và quyền admin ẩn danh qua `deploy/smoke.sh`. Root smoke (`npm run test:smoke`) kiểm tra home, `/menu` trả HTML, API/PostgreSQL health, CORS và catalog.

Sơ đồ: [deployment source](../diagrams/deployment.puml) · [deployment SVG](../diagrams/Deployment_Diagram.svg).

## 5. CI/CD và release

```text
PR / push main
   ↓
verify: lint, unit, client, build, migrate/seed DB test,
        API integration, Playwright browser
   ↓ (push main và PUBLISH_IMAGES=true)
images: build/push api + web cùng commit SHA lên GHCR
   ↓ (DEPLOY_ENABLED=true)
deploy: SSH, upload deploy config, deploy/release.sh SHA
```

Workflow chính là `.github/workflows/ci.yml`. `IMAGE_REGISTRY` là prefix GHCR dạng `ghcr.io/owner/repository`; Compose nối `-api` hoặc `-web` rồi thêm `IMAGE_TAG`. Runtime production settings nằm trong `.env.production` trên VPS, không được upload/commit. Release script backup DB, chạy migration riêng và sau đó cập nhật service app/proxy. Script **không tự rollback image khi health/smoke thất bại**; người vận hành cần kiểm tra và gọi `deploy/rollback.sh` với SHA tương thích.

## 6. Môi trường

| Môi trường | Cách chạy | Database | API base |
|---|---|---|---|
| Local dev | `docker compose up -d db`; `npm run dev:api`; `npm run dev:web` | PostgreSQL local, thường `127.0.0.1:5433` | `http://localhost:3001` |
| Local full stack | `docker compose --profile app up -d --build` | Compose DB | `http://localhost:3001` hoặc qua proxy local nếu cấu hình |
| Production | AWS EC2 Ubuntu + `docker-compose.prod.yml` | named volume, network nội bộ | `https://DOMAIN/api` |

Khi chạy production compose ở project thử nghiệm, dùng project name tách biệt để không đụng volumes production. Chi tiết khởi tạo EC2/domain/SSH/CI nằm trong [deployment guide](../deployment.md); thao tác hàng ngày nằm trong [runbook](../runbook.md).

## 7. Giới hạn và xác minh ngoài repo

DNS, firewall/security group, EC2, credentials VNPay, registry permissions, GitHub variables/secrets và domain thật cần được cấu hình bởi người có quyền. Repo/test mock không chứng minh QR/thẻ/refund đã thanh toán thật; compose config không chứng minh app đã chạy trên VPS. Một EC2 là một điểm lỗi chung, không bảo đảm HA hoặc uptime tuyệt đối. Cần chạy browser test trên môi trường có Chromium, kiểm tra VNPay Sandbox merchant và diễn tập deploy/rollback/backup/restore trước nghiệm thu.
