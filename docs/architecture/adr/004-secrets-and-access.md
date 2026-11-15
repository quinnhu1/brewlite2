# ADR-004 — Secret, quyền truy cập và vòng đời khoá

**Trạng thái:** đã áp dụng trong repo (CI/CD, compose, script deploy).

**Bối cảnh:** Pipeline cần đọc registry, SSH vào VPS và chạy migration; API cần
`JWT_SECRET`, mật khẩu DB và credential VNPay. Nhóm làm trên repo công khai, nhiều
người cùng push, và một VPS dùng chung. Nếu để secret trong file tracked, trong
log CI hoặc trong lịch sử git thì phải rotate toàn bộ và không thể thu hồi.

**Quyết định:**

1. **Không có secret trong repo.** `.env`, `.env.local` và `backups/` nằm trong
   `.gitignore`. Repo chỉ chứa file mẫu (`deploy/env.example`,
   `.env.example`, `app/*/.env.example`) với giá trị giả.
2. **Secret của pipeline nằm ở GitHub**, không ở file:
   - Secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`.
   - Variables: `PUBLISH_IMAGES`, `DEPLOY_ENABLED`, `NEXT_PUBLIC_API_URL`,
     `PRODUCTION_URL`.
   - Job `deploy` gắn `environment: production` để bật required reviewer và giữ
     lịch sử ai đã approve.
3. **Secret runtime nằm trong `/opt/brewlite/.env`** trên VPS, quyền `600`, chủ sở
   hữu là user deploy. Compose đọc file này qua `--env-file` mặc định của thư mục
   project. Không truyền secret bằng `docker run -e` trên dòng lệnh (lộ trong
   `ps`/shell history).
4. **SSH dùng khoá riêng, không dùng mật khẩu, không dùng `root`.**
   - Một cặp ed25519 chỉ dành cho CI; public key nằm trong
     `~/.ssh/authorized_keys` của user deploy (thuộc group `docker`).
   - `VPS_KNOWN_HOSTS` ghim host key; workflow chạy `StrictHostKeyChecking=yes`
     và `BatchMode=yes`, nên máy lạ không thể giả danh VPS.
   - Key CI được ghi tạm trong `$RUNNER_TEMP`-style `$HOME/.ssh` và xoá ở bước
     `if: always()`. Không có key nào tồn tại lâu trên runner.
5. **Quyền tối thiểu:** `permissions: contents: read` ở cấp workflow; chỉ job
   `images` được thêm `packages: write`. `GITHUB_TOKEN` không được dùng để SSH.
6. **GHCR private thì dùng PAT `read:packages`** đặt trong `.env`
   (`GHCR_USER`/`GHCR_TOKEN`); nếu package để public thì bỏ trống hai biến này.
7. **Không log secret.** Script chỉ log tag, URL và trạng thái; không `set -x`,
   không in `.env`, không `docker inspect` biến môi trường trong CI.

**Quy trình rotate:**

| Khoá | Khi nào | Cách làm | Ảnh hưởng |
| --- | --- | --- | --- |
| `JWT_SECRET` | lộ, hoặc đổi người phụ trách | `openssl rand -hex 32`, sửa `.env`, release lại | Mọi phiên đăng nhập cũ mất hiệu lực |
| `POSTGRES_PASSWORD` | lộ, hoặc theo lịch | đổi trong `.env` + `ALTER USER` trong container, release lại | API mất kết nối trong lúc đổi |
| `VPS_SSH_KEY` | mất máy, đổi thành viên | tạo cặp mới, thay `authorized_keys` rồi mới xoá key cũ, cập nhật secret | Job deploy fail cho tới khi cập nhật secret |
| `VNPAY_HASH_SECRET` | theo VNPay hoặc khi lộ | đổi ở merchant portal và `.env` cùng lúc | IPN/return cũ bị từ chối |
| `GHCR_TOKEN` | hết hạn, lộ | tạo PAT mới với `read:packages`, cập nhật `.env` | Pull image fail nếu token hết hạn |

Sau mỗi lần rotate: chạy `bash deploy/release.sh <sha>` (hoặc workflow
`workflow_dispatch`) để container nhận biến mới, rồi chạy smoke test.

**Ai có quyền gì:**

| Vai trò | Quyền |
| --- | --- |
| Thành viên nhóm | push nhánh, mở PR; không xem được secret GitHub |
| Người duyệt merge | merge vào `main`, duyệt environment `production` |
| Người phụ trách hạ tầng | SSH VPS, sửa `/opt/brewlite/.env`, xem backup |
| Giảng viên/chấm bài | chỉ URL công khai và tài khoản demo |

**Đánh đổi:** thêm một bước cấu hình thủ công trên VPS và GitHub (không tự động
hoá hoàn toàn), và người mới cần được cấp quyền trước khi deploy. Đổi lại, repo
có thể public và mọi thay đổi hạ tầng đều có dấu vết trong lịch sử Actions.
