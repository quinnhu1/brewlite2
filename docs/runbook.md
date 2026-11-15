# Runbook vận hành BrewLite

<<<<<<< HEAD
Runbook này theo cấu hình fixed: Docker Compose production, service `proxy`, file `.env.production` và trạng thái release trong `.deploy/`. Không dùng hướng dẫn `.env`, `caddy`, `.last-good-tag` của branch nguồn cũ. Các lệnh production chạy trong `/opt/brewlite`.

```bash
cd /opt/brewlite
compose() { docker compose --env-file .env.production -f docker-compose.prod.yml "$@"; }
```

## 1. Kiểm tra nhanh

```bash
compose ps
cat .deploy/current
cat .deploy/previous 2>/dev/null || true
curl -fsS https://$(grep '^DOMAIN=' .env.production | cut -d= -f2-)/api/health
curl -fsS https://$(grep '^DOMAIN=' .env.production | cut -d= -f2-)/api/products | head -c 300
docker system df
df -h /
free -m
```

`/api/health` trả `{"status":"ok"}` khi API truy vấn được PostgreSQL (`SELECT 1`). Kỳ vọng các service `db`, `api`, `web`, `proxy` healthy/running; catalog có dữ liệu. Service `migrate` chỉ chạy theo profile `ops`, không phải container thường trực.

## 2. Xem log và tài nguyên

```bash
compose logs --tail=100 api
compose logs --tail=100 web
compose logs --tail=100 proxy
compose logs --since=30m api | grep -i error
docker stats --no-stream
docker system df
df -h /
```

Log TLS/502/504 xem ở `proxy`; lỗi nghiệp vụ/API xem ở `api`; frontend render xem ở `web`. Không dump toàn bộ environment hoặc `docker inspect` để đọc secret.

## 3. Restart có kiểm soát

```bash
compose restart api
compose restart web
compose restart proxy
```

Sau khi sửa `.env.production`, kiểm tra quyền file (`chmod 600 .env.production`), rồi recreate service liên quan:

```bash
compose up -d --force-recreate api web proxy
```

Không dùng `docker restart` trực tiếp trên container đơn lẻ; dùng Compose để giữ dependencies và healthcheck nhất quán.

## 4. Cấu hình production và secrets

File thật là `.env.production` ở thư mục gốc repo trên VPS. Tạo lần đầu bằng:

```bash
bash deploy/init-env.sh
chmod 600 .env.production
```

Script sinh `POSTGRES_PASSWORD` và `JWT_SECRET` ngẫu nhiên. Không chạy lại để tái tạo credentials khi volume DB đã có dữ liệu. Các giá trị cần xác nhận gồm:

- `DOMAIN`: domain thật, không có scheme.
- `ACME_EMAIL`: email cấp TLS.
- `VPS_IPV4`: IPv4 public để cấu hình query VNPay.
- `IMAGE_REGISTRY`: prefix, ví dụ `ghcr.io/owner/repository`; Compose tự thêm `-api` và `-web`.
- `IMAGE_TAG`: tag image; release script sẽ set theo tag đầu vào.
- `POSTGRES_PASSWORD`, `JWT_SECRET`.
- `PAYMENT_PROVIDER`, `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_REFUND_ENABLED` và các cờ mock phù hợp môi trường.

`.env.production.example` chỉ có giá trị mẫu. Không commit `.env.production`, không gửi credential qua chat/log. Xem [ADR-005](architecture/adr/005-secrets-and-access.md) để rotate keys và phân quyền.

## 5. Release một phiên bản mới

Bình thường, merge PR vào `main`; workflow verify và publish image khi các GitHub variables đã bật. Người trực production có thể chạy release thủ công sau khi SHA đã có cả hai image tương ứng trên GHCR:

```bash
bash deploy/release.sh FULL_COMMIT_SHA
```

`deploy/release.sh` thực hiện tuần tự: khóa deployment bằng `.deploy/deploy.lock`; kiểm tra Compose config; pull `db/migrate/api/web/proxy`; chờ DB healthy; dừng `api` và `web`; tạo backup custom format `backups/predeploy-*.dump`; chạy migration một lần qua profile `ops`; khởi động `api/web/proxy`; reload Caddy; chạy `deploy/smoke.sh` qua HTTPS. Chỉ khi smoke thành công, script mới ghi tag mới vào `.deploy/current` và lưu tag current cũ ở `.deploy/previous`.

**Release không tự rollback.** Nếu migration lỗi, script giữ backup, không chạy app mới và thử start lại `api/web` hiện tại. Nếu app mới unhealthy hoặc public smoke lỗi, script thoát khác 0 và yêu cầu người vận hành tự đánh giá rồi chạy `deploy/rollback.sh`. Đừng ghi release thành công khi smoke fail.

Post-deploy script `deploy/smoke.sh` yêu cầu HTTPS, kiểm tra `/api/health`, `/signin`, `/api/products`, `/api/payments/config` phải có cấu hình merchant và anonymous `/api/admin/orders` phải trả 401. Nếu payment merchant chưa cấu hình, smoke fail là đúng; không tắt kiểm tra chỉ để làm release xanh.

## 6. Rollback image

Xem tag đã ghi nhận:

```bash
cat .deploy/current
cat .deploy/previous
```

Rollback chỉ nên dùng SHA/tag đã tương thích với schema hiện tại và lifecycle đơn/thanh toán/refund/auth:

```bash
bash deploy/rollback.sh PREVIOUS_COMPATIBLE_SHA
```

`deploy/rollback.sh` pull lại `api/web`, khởi động `api/web/proxy`, chạy public smoke và ghi `IMAGE_TAG` vào `.deploy/current`. Script **chỉ rollback image**, không đảo migration, không phục hồi dữ liệu và không tự thay đổi `.deploy/previous`. Migration additive cũng không đồng nghĩa logic ứng dụng cũ an toàn với orders, payments, refunds hoặc `auth_version`. Không rollback về API bỏ qua `auth_version`, vì token đã thu hồi có thể được chấp nhận lại.

Nếu tag tương thích không được xác định rõ, dừng thay đổi và kiểm tra backup/migration/logic trước. Không chạy `docker compose down -v` trên production.

## 7. Backup và restore

Tạo backup thủ công:

```bash
bash deploy/backup.sh
ls -lh backups/
```

`backup.sh` dùng `pg_dump -Fc` và yêu cầu `.deploy/current` tồn tại để lấy image tag cho Compose. Backup được lưu trong `backups/`; thư mục ở quyền hạn chế nhưng vẫn nằm trên cùng VPS, nên phải copy mã hóa ra vị trí độc lập. Đặt lịch backup ngoài máy theo chính sách nhóm và kiểm tra backup thực sự có thể restore.

Restore chỉ thực hiện theo kế hoạch sự cố, dừng ghi/checkout và chọn đúng file backup. Thử trước trong database riêng:

```bash
compose exec -T db createdb -U brewlite brewlite_restore_test
cat backups/CHOSEN_BACKUP.dump | compose exec -T db pg_restore -U brewlite -d brewlite_restore_test --no-owner --exit-on-error
compose exec -T db psql -U brewlite -d brewlite_restore_test -c 'SELECT count(*) FROM orders;'
```

Không restore thẳng vào production khi chưa chốt thời điểm dữ liệu sẽ mất và chưa xác nhận schema tương thích. Việc khôi phục DB production cần maintenance window, snapshot/backup hiện tại và xác nhận từ người phụ trách nghiệp vụ.

## 8. Sự cố thường gặp

| Triệu chứng | Kiểm tra | Hướng xử lý |
|---|---|---|
| 502/504 | `compose ps`, log `api`, `web`, `proxy` | sửa service unhealthy; restart qua Compose; smoke lại |
| `/api/health` lỗi | log API và DB; `compose exec db pg_isready -U brewlite -d brewlite` | kiểm tra DB, disk và URL cấu hình; không xóa volume |
| TLS chưa cấp/gia hạn | DNS A/AAAA, Security Group inbound 80/443, log `proxy` | sửa DNS/firewall/domain, giữ volume `caddy_data` |
| Catalog rỗng | `/api/products`, seed history | chỉ seed catalog theo deployment guide sau khi xác nhận DB mới; không chạy reset/seed demo trên production |
| Payment config chưa sẵn sàng | `/api/payments/config`, `.env.production` | kiểm tra TmnCode/HashSecret/ReturnURL/IPN; không công khai secrets |
| VNPay callback không đến | IPN URL portal, HTTPS, response logs | kiểm tra `https://DOMAIN/api/payments/vnpay/ipn`; Return URL chỉ điều hướng, không thay IPN |
| Disk đầy/OOM | `docker system df`, `df -h /`, `free -m` | giữ image rollback và backups; prune có chọn lọc, không prune volumes |
| CI deploy lỗi SSH | GitHub secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS` | xác minh fingerprint, quyền user và known_hosts; không tắt StrictHostKeyChecking |
| Release lock đang giữ | `.deploy/deploy.lock`, process `release.sh` | xác minh release cũ đã dừng; không xóa lock khi tiến trình còn chạy |

## 9. Sau reboot và TLS

Docker services dùng `restart: unless-stopped`. Sau reboot:

```bash
compose ps
curl -fsS https://DOMAIN/api/health
```

Nếu stack không tự lên, kiểm tra `sudo systemctl status docker`, log từng service và `compose up -d` sau khi xác nhận `.env.production` còn đúng. Caddy lưu TLS state trong `caddy_data`; không xóa volume này khi dọn image/container. Gia hạn domain/EC2 và DNS A/AAAA cần theo dõi ngoài repo.

## 10. Checklist xử lý incident

1. Xác định phạm vi: web, API/DB, payment gateway hay toàn domain.
2. Ghi timestamp, SHA từ `.deploy/current`, triệu chứng và response code.
3. Lưu log cần thiết trước khi restart; che credential/PII khi chia sẻ.
4. Với release lỗi, dùng `deploy/rollback.sh` chỉ sau khi xác nhận compatibility; không chờ script tự rollback.
5. Với dữ liệu, giữ backup hiện tại, đối soát payment/refund rồi mới chọn restore.
6. Ghi kết quả thực tế vào `docs/release/RELEASE-NOTES.md`. Không biến test cũ hoặc sandbox mock thành bằng chứng production.
=======
Dành cho người trực production (VPS Ubuntu, Docker Compose + Caddy — ADR-003).
Mọi lệnh chạy trong `/opt/brewlite` trừ khi ghi khác.

```bash
cd /opt/brewlite
alias dc='docker compose -f docker-compose.prod.yml'
```

## 1. Kiểm tra nhanh (2 phút)

```bash
dc ps                      # container nào đang chạy / healthy
cat .last-good-tag         # commit đang phục vụ
curl -fsS https://<domain>/api/health
curl -fsS -o /dev/null -w '%{http_code}\n' https://<domain>/
curl -fsS https://<domain>/api/products | head -c 200
docker system df           # dung lượng image/volume
df -h /                    # dung lượng đĩa
free -m                    # RAM còn trống (VPS 1 GB rất dễ hết)
```

Kỳ vọng: 4 container `db/api/web/caddy` ở trạng thái `healthy`/`running`,
`/api/health` trả `{"status":"ok"}`, web trả 200 và `/api/products` có dữ liệu.

## 2. Xem log

```bash
dc logs -f --tail 100 api          # lỗi nghiệp vụ, 500
dc logs -f --tail 100 caddy        # lỗi TLS, 502/504
dc logs --since 30m api | grep -i error
dc logs -f --tail 100 web
```

Caddy ghi lỗi cấp chứng chỉ vào log của service `caddy`. Nếu thấy
`obtain certificate` lặp lại: kiểm tra DNS và cổng 80/443 trước khi làm gì khác.

## 3. Restart

```bash
dc restart api                 # chỉ API, vài giây downtime
dc restart web
dc up -d --force-recreate api  # nếu cần đọc lại .env
```

Không dùng `docker restart` trực tiếp trên container lẻ: compose sẽ không biết
trạng thái và healthcheck của Caddy có thể bỏ qua.

## 4. Deploy một bản mới

Bình thường: merge vào `main`, CI tự chạy `verify → images → deploy`.

Thủ công (khi cần phát hành lại hoặc chạy trên máy khác):

```bash
bash deploy/release.sh <40-char-sha>
```

Script tự làm: lock → `compose pull` → `deploy/backup.sh` → `prisma migrate
deploy` → `up -d` → health qua domain công khai → ghi `.last-good-tag`. Nếu
health fail, script quay lại tag trước và thoát khác 0.

Bỏ qua backup (chỉ khi biết chắc): `SKIP_BACKUP=true bash deploy/release.sh <sha>`.
Bắt buộc phải có catalog: `REQUIRE_CATALOG=true`.

## 5. Rollback

```bash
cat .last-good-tag                       # tag đang tốt
bash deploy/release.sh <sha-truoc-do>    # deploy lại tag cũ
```

Rollback chỉ đổi image, **không** revert migration. Trước khi quay lui, kiểm tra
migration mới có phá vỡ schema cũ không:

```bash
dc run --rm --no-deps api npx prisma migrate status
```

Nếu migration không tương thích ngược: restore backup (mục 6) rồi deploy tag cũ.

## 6. Backup và restore

Backup tự động trước mỗi lần migrate:

```bash
ls -lh backups/                     # brewlite-<stamp>.sql.gz
bash deploy/backup.sh               # chạy tay
```

Đặt cron hằng ngày và đẩy ra ngoài (restic/rclone/S3):

```bash
crontab -e
15 2 * * * cd /opt/brewlite && bash deploy/backup.sh >> backups/backup.log 2>&1
```

Restore (dừng ghi trước, `--clean` nên dump sẽ xoá object cũ):

```bash
set -a; . ./.env; set +a              # nạp POSTGRES_USER / POSTGRES_DB
dc stop web api
gunzip -c backups/brewlite-<stamp>.sql.gz | \
  dc exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
dc start web api
```

Kiểm tra sau restore: `/api/products` có dữ liệu, đăng nhập được tài khoản admin
thật, một đơn cũ mở được trong lịch sử.

## 7. Sự cố thường gặp

| Triệu chứng | Nguyên nhân thường gặp | Xử lý |
| --- | --- | --- |
| `502` từ Caddy | API chưa healthy hoặc crash | `dc ps`, `dc logs api`; sửa lỗi rồi `dc up -d` |
| `404` ở `/api/...` | Caddyfile thiếu `handle_path /api/*` | kiểm tra `deploy/Caddyfile`, `dc restart caddy` |
| Caddy không lấy được cert | DNS chưa trỏ đúng, 80/443 bị chặn, hết hạn domain | `dig <domain>`, mở firewall, `dc logs caddy` |
| API lỗi kết nối DB | sai `DATABASE_URL`, DB chưa healthy, volume bị xoá nhầm | `dc ps db`, `dc exec db pg_isready` |
| Container bị `OOMKilled` | VPS 1 GB, build trên server | chỉ pull image đã build ở CI, thêm swap, `docker system prune` |
| Đĩa đầy | image cũ, log, backup | `docker image prune -f`, xoá backup cũ, kiểm tra `df -h` |
| Job deploy fail ở SSH | hết hạn key, `known_hosts` đổi, IP VPS đổi | cập nhật secret `VPS_SSH_KEY`/`VPS_KNOWN_HOSTS` |
| `another release is already running` | lần deploy trước còn chạy | chờ, hoặc `ps aux \| grep release.sh`; lock là `.release.lock` |

## 8. Sau khi VPS reboot

Docker bật cùng hệ thống và container có `restart: unless-stopped` nên stack tự
lên lại. Kiểm tra:

```bash
dc ps && curl -fsS https://<domain>/api/health
```

Nếu không lên: `sudo systemctl status docker`, `dc up -d`, xem log như mục 2.

## 9. Gia hạn VPS và domain

- **VPS:** theo dõi ngày hết hạn ở trang quản trị nhà cung cấp; bật thanh toán tự
  động hoặc nhắc lịch trước 7 ngày. Hết hạn thường mất IP công khai và ổ đĩa.
- **Domain:** bật auto-renew; kiểm tra bản ghi `A`/`AAAA` vẫn trỏ đúng IP sau khi
  đổi VPS. Nếu đổi IP, cập nhật DNS rồi `dc restart caddy` để xin cert mới.
- **TLS:** Caddy tự gia hạn; cert nằm ở volume `caddy_data`. Không xoá volume này
  khi prune, nếu không sẽ xin lại cert (có thể chạm rate limit Let's Encrypt).

## 10. Checklist khi có sự cố

1. Xác nhận phạm vi: chỉ web, chỉ API, hay toàn bộ domain.
2. Ghi lại thời điểm, commit trong `.last-good-tag`, thông báo lỗi.
3. Chụp log liên quan **trước khi** restart.
4. Nếu do bản mới: rollback (mục 5) rồi mới điều tra tiếp.
5. Nếu do dữ liệu: backup hiện có rồi restore (mục 6).
6. Ghi nguyên nhân, cách xử lý và bước phòng ngừa vào
   [release-notes](release-notes.md).
>>>>>>> origin/main
