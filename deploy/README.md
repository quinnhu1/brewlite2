# Deploy (VPS + Caddy) — theo ADR-003

Luồng: GitHub CI build 2 image gắn tag = commit SHA → VPS pull → backup → migrate
→ `up -d` → health check qua Caddy → smoke test. Job `deploy` chỉ chạy khi bật
biến repo.

## 1. Biến và secret trên GitHub

| Loại | Tên | Giá trị |
| --- | --- | --- |
| Variable | `PUBLISH_IMAGES` | `true` — build & push `ghcr.io/<owner>/<repo>-api` và `-web` |
| Variable | `DEPLOY_ENABLED` | `true` — chạy job SSH deploy |
| Variable | `NEXT_PUBLIC_API_URL` | `/api` (mặc định) hoặc URL tuyệt đối nếu tách domain API |
| Variable | `PRODUCTION_URL` | `https://brew.example.com` — dùng cho bước smoke test |
| Secret | `VPS_HOST` | IP hoặc hostname VPS |
| Secret | `VPS_USER` | user SSH (không dùng root) |
| Secret | `VPS_SSH_KEY` | private key (ed25519) |
| Secret | `VPS_KNOWN_HOSTS` | `ssh-keyscan <host>` |

Environment `production` nên bật required reviewers. Job `deploy` cần **cả**
`PUBLISH_IMAGES=true` **và** `DEPLOY_ENABLED=true`, vì nó `needs: images`.

## 2. Chuẩn bị VPS (Ubuntu 24.04, một lần)

```bash
# Docker + compose plugin
sudo apt update && sudo apt install -y docker.io docker-compose-v2 curl
sudo usermod -aG docker "$USER"   # đăng nhập lại sau bước này

# Thư mục release
sudo mkdir -p /opt/brewlite && sudo chown "$USER" /opt/brewlite
cd /opt/brewlite
cp /đường/dẫn/deploy/env.example .env   # rồi điền giá trị thật
chmod 600 .env
```

- Mở inbound 22/80/443 (và 443/udp cho HTTP/3 nếu muốn).
- Trỏ bản ghi DNS `A`/`AAAA` của `PUBLIC_DOMAIN` về VPS **trước** lần deploy đầu,
  nếu không Caddy sẽ không xin được chứng chỉ.
- Nếu package GHCR để private: tạo PAT có `read:packages`, điền
  `GHCR_USER`/`GHCR_TOKEN` trong `.env`.
- Nếu VNPay Sandbox: đăng ký IPN `https://<domain>/api/payments/vnpay/ipn` và đặt
  `VNPAY_RETURN_URL=https://<domain>/api/payments/vnpay/return`.

## 3. Một release gồm những gì

`deploy/release.sh <sha>`:

1. `compose pull api web caddy` — image pin theo đúng commit, không dùng `latest`.
2. `deploy/backup.sh` — `pg_dump` vào `/opt/brewlite/backups`, giữ 7 ngày.
3. `compose run --rm --no-deps api npx prisma migrate deploy` — migration là
   bước riêng, fail thì dừng trước khi chạy version mới.
4. `compose up -d --remove-orphans`.
5. Health check công khai `https://<domain>/api/health` và `https://<domain>/`.
6. Ghi `.last-good-tag`; nếu health fail thì quay lại tag trước đó và job fail.
7. CI chạy `npm run test:smoke -- "$PRODUCTION_URL" "$PRODUCTION_URL/api"`.

Lưu ý rollback chỉ đổi image, **không** revert migration đã áp dụng — kiểm tra
tương thích schema trước khi rollback.

## 4. Caddy

`deploy/Caddyfile` được mount read-only. Một domain duy nhất:

- `/api/*` → `api:3001` (Caddy strip prefix `/api`)
- còn lại → `web:3000`

Nhờ vậy web build với `NEXT_PUBLIC_API_URL=/api`, đổi domain không phải build lại.
TLS do Caddy tự cấp/gia hạn, lưu ở volume `caddy_data`.

## 5. Kiểm tra nhanh trên máy

```powershell
npm run test:smoke -- https://brew.example.com https://brew.example.com/api
docker compose -f docker-compose.prod.yml --env-file deploy/env.example config
```

Muốn thử toàn bộ stack ở máy local (không cần domain thật):

```bash
PUBLIC_DOMAIN=localhost CURL_OPTS=--insecure bash deploy/release.sh <sha>
```

Caddy sẽ dùng CA nội bộ; trình duyệt/curl cần bỏ qua cảnh báo chứng chỉ.
