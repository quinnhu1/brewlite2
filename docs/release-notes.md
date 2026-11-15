# Release notes

Ghi lại từng bản phát hành để đối chiếu với minh chứng CI/CD và phục vụ bàn giao.
Mỗi bản một mục, mới nhất ở trên. Dùng đúng commit SHA làm số hiệu bản.

Mẫu:

```markdown
## <sha ngắn> — <ngày>

- Phạm vi: ...
- Migration: có/không (tên migration)
- Kiểm thử: unit x/y, e2e x/y, smoke x/y
- URL: https://...
- Rollback: `bash deploy/release.sh <sha trước>`
- Ghi chú: ...
```

## Chưa phát hành — tài liệu kiến trúc và vận hành

Chưa deploy lên VPS. Thay đổi trong repo:

- `docs/architecture/overview.md`: kiến trúc phân lớp, luồng request production,
  luồng CI/CD, bảng môi trường.
- `docs/diagrams/deployment.mmd` + `Deployment_Diagram.svg`: sơ đồ triển khai
  theo ADR-003, cập nhật `docs/diagrams/README.md`.
- `docs/architecture/adr/004-secrets-and-access.md`: nơi lưu secret, quyền của
  từng vai trò, quy trình rotate.
- `docs/runbook.md`: kiểm tra nhanh, log, restart, deploy, rollback, backup và
  restore, sự cố thường gặp, reboot, gia hạn VPS/domain.
- `deploy/release.sh`: thêm `flock` chống hai release chạy chồng và kiểm tra
  catalog (`REQUIRE_CATALOG`).
- Docker Compose local đổi tên `docker-compose.dev.yml` → `docker-compose.yml`
  cho khớp tài liệu phân công; `npm run db:up` / `db:down` dùng file này.
- e2e test thêm trường hợp `GET /health`.

## df9075f — 2026-11-14 — CD hoàn thiện theo ADR-003

- Phạm vi: hạ tầng trong repo. `docker-compose.prod.yml` có `db/api/web/caddy`,
  chỉ Caddy mở 80/443; `deploy/Caddyfile` định tuyến `/api/*` → `api:3001`,
  còn lại → `web:3000`. Web build với `NEXT_PUBLIC_API_URL=/api`.
- `deploy/release.sh`: pull → backup → migrate (tách khỏi container) → `up -d` →
  health qua domain công khai → `.last-good-tag` hoặc rollback.
- `deploy/backup.sh`: `pg_dump` + gzip, giữ 7 ngày, có hướng dẫn cron/restore.
- Thêm `GET /health`, `scripts/smoke.mjs` (`npm run test:smoke`), bước smoke sau
  deploy và bước validate cấu hình deploy trong CI.
- Xoá hai file compose cũ (build `./backend`, `./apps/*` không tồn tại).
- Migration: không có migration mới.
- Kiểm thử: unit 8/8, e2e 39/39, lint + build API/web OK; thử full stack ở máy
  local (project `brewlite-trial`) với Caddy: `/api/health` 200,
  `/api/products` 200, `/` 200, HTTP→HTTPS 308, smoke 4/4, backup 7.4 KB.
- Rollback: `bash deploy/release.sh <sha trước>`
- Ghi chú: chưa chạy trên VPS thật; xem mục "Chưa phát hành" cho phần tài liệu.

## d7ef687 — 2026-11-14 — Auth, web client và pipeline CI

- Phạm vi: module `auth` trong API (đăng ký, đăng nhập, JWT, guard, role đọc từ
  DB mỗi request), 4 helper gọi API và 2 component phía web, workflow CI ba job
  (`verify`, `images`, `deploy`).
- Migration: không có migration mới.
- Kiểm thử: unit 7/7, e2e 39/39, lint + build cả hai app.
- Ghi chú: `images` bị chặn bởi `vars.PUBLISH_IMAGES`, `deploy` bởi
  `vars.DEPLOY_ENABLED` — mặc định tắt để nhánh chưa cấu hình không fail.
