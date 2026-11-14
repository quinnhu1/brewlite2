# Runbook vận hành BrewLite

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
