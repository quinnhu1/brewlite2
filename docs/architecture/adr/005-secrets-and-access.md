# ADR-005 — Secrets, quyền truy cập và vòng đời khóa

**Trạng thái:** hướng dẫn cấu hình theo repo fixed; cần áp dụng và xác minh trên GitHub/AWS thật trước khi coi là vận hành hoàn tất.

## Bối cảnh

BrewLite cần secrets cho PostgreSQL, JWT và VNPay; CI cần quyền push GHCR và SSH tới EC2. Repo có thể được chia sẻ cho nhiều thành viên, trong khi runtime secrets không được phép đi vào Git, image, log hoặc frontend bundle.

## Quyết định

1. **Không commit secret.** Dùng `.env.production.example` và `.env.example` với giá trị mẫu. File runtime thật là `.env.production`; file này, `.env.local` và backups phải được ignore. Trên VPS đặt quyền `600`, chủ sở hữu là user deploy.
2. **Runtime Compose đọc `.env.production`.** Các script `deploy/common.sh`, `release.sh`, `rollback.sh`, `backup.sh` gọi `docker compose --env-file .env.production -f docker-compose.prod.yml`. Không giả định Compose sẽ tự đọc `.env` cũ.
3. **Các khóa runtime chính:** `POSTGRES_PASSWORD`, `JWT_SECRET`, `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`; cấu hình định danh/hạ tầng gồm `DOMAIN`, `ACME_EMAIL`, `VPS_IPV4`, `IMAGE_REGISTRY`, `IMAGE_TAG`. `IMAGE_REGISTRY` là prefix `ghcr.io/owner/repository`; Compose tự ghép `-api`/`-web`.
4. **Sinh secrets ban đầu:** chạy `bash deploy/init-env.sh` trên VPS mới. Script sinh password DB hex và JWT secret ngẫu nhiên. Không chạy lại chỉ để rotate password trên database đã có dữ liệu; đổi PostgreSQL password cần đồng bộ `ALTER USER` và Compose theo một maintenance plan.
5. **CI secrets/variables:** workflow dùng GitHub Actions secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`. Repository/environment variables `PUBLISH_IMAGES` và `DEPLOY_ENABLED` điều khiển việc publish/deploy. Workflow chỉ cấp `packages: write` cho job `images`; deploy dùng SSH key riêng và `StrictHostKeyChecking=yes`.
6. **Registry private:** cấp token chỉ `read:packages` cho VPS, đăng nhập bằng `docker login ghcr.io --password-stdin`. Không đưa token vào lệnh dạng đối số, file tracked hoặc log. Với package public, không cần registry credential.
7. **Không log secrets/PII.** Không bật `set -x`, không in `.env.production`, không trả các field password/token trong DTO, response hoặc log.
8. **Deployment state không phải secret:** `.deploy/current`, `.deploy/previous`, `.deploy/deploy.lock` theo dõi release; `backups/` giữ dump DB. Các thư mục này cần quyền truy cập giới hạn; backup phải được copy mã hóa ra ngoài VPS.

## Quy trình rotate

| Khóa | Khi nào | Thao tác | Ảnh hưởng |
|---|---|---|---|
| `JWT_SECRET` | lộ hoặc đổi đơn vị vận hành | tạo giá trị ngẫu nhiên mới, cập nhật `.env.production`, recreate/release API | JWT cũ không còn xác thực |
| `POSTGRES_PASSWORD` | lộ hoặc theo chính sách | đổi password DB trong PostgreSQL và `.env.production` đồng bộ, sau đó restart/release API | API có thể mất kết nối trong lúc đổi |
| `VPS_SSH_KEY` | mất máy/đổi người vận hành | tạo key CI mới, thêm public key vào authorized_keys, cập nhật secret; sau khi xác minh mới xóa key cũ | workflow SSH cần secret mới |
| `VNPAY_HASH_SECRET` | lộ hoặc VNPay yêu cầu | phối hợp merchant portal và `.env.production`, xác minh request/response ký số | callback/transaction dùng secret sai sẽ bị từ chối |
| GHCR read token | hết hạn/lộ | tạo PAT scope `read:packages`, cập nhật credential trên VPS | pull image private có thể thất bại khi token cũ hết hiệu lực |

Sau rotate, chỉ recreate/release những service cần nhận cấu hình mới; chạy `deploy/smoke.sh` qua domain và kiểm tra payment config. Với JWT, yêu cầu người dùng đăng nhập lại. Không gửi secret thật trong release notes hoặc issue.

## Quyền truy cập

| Vai trò | Quyền tối thiểu |
|---|---|
| Thành viên phát triển | push branch, mở PR; không cần đọc runtime secrets |
| Người duyệt | review/merge PR; approve environment `production` nếu policy bật |
| Người phụ trách hạ tầng | SSH vào EC2, quản lý `.env.production`, release/rollback và backups |
| CI deploy identity | SSH bằng key riêng; chỉ deploy user được cấp quyền cần thiết trên `/opt/brewlite` và Docker |
| Người nghiệm thu | public URL và tài khoản demo; không nhận secret quản trị |

## Đánh đổi và giới hạn

Một file runtime trên VPS giảm rò rỉ qua Git nhưng người có quyền Docker/root vẫn có thể đọc secrets. GitHub environment protections, secret rotation và backup off-host cần bật thủ công; code trong repo không chứng minh các quyền đó đã được cấu hình. Không coi SHA/hash của email/IP hoặc access log là dữ liệu hoàn toàn vô danh. Mọi lần rotate và deploy cần ghi nhận thời gian, người thực hiện và kết quả smoke mà không ghi giá trị secret.
