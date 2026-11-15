# Đưa BrewLite lên AWS Ubuntu và HTTPS

Cấu hình soạn cho VPS bạn đã chọn: EC2 t3.micro, Ubuntu 24.04 x86_64, Elastic IP **52.64.177.7**, user SSH **ubuntu**. Gói này **chưa được triển khai/xác minh trên VPS**; không có quyền SSH hoặc domain đã cấu hình trong phiên sửa mã. Hướng dẫn này dùng Docker Compose + Caddy, cùng code Next.js/NestJS/PostgreSQL, không dùng ngrok khi đã public ổn định.

## 1. Hiểu key pair, SSH, IP và tên miền

VPS là máy khác ở trung tâm dữ liệu, chạy độc lập laptop. **Private key** ở laptop; **public key** ở `~/.ssh/authorized_keys` của tài khoản server. SSH dùng cặp khóa xác thực; SSH không là phần mềm làm web chạy. Container và Docker service giữ web chạy sau khi đóng SSH/tắt laptop, miễn EC2 còn chạy và dịch vụ khỏe.

Elastic IP là địa chỉ public cố định đã gắn. DNS A ánh xạ `tên-miền-của-bạn` → `52.64.177.7`. Caddy nhận domain đó, xin TLS và chuyển request tới ứng dụng. Mua domain không tự upload code. `brewlitecoffee.com` mới là ví dụ; phải sở hữu domain trước khi dùng. Chưa cần tạo `api.domain`: bản này dùng **cùng domain, API dưới `/api`**, giảm cấu hình CORS và URL FE.

Trên laptop Windows (thay đường dẫn key bằng file thật):

```powershell
ssh -i "$env:USERPROFILE\Downloads\brewlite.pem" ubuntu@52.64.177.7
```

Lần đầu xác minh fingerprint SSH với console AWS. Máy thứ hai tự tạo cặp khóa `ssh-keygen -t ed25519`, gửi **nội dung .pub** để thêm vào authorized_keys. Không chia sẻ private key cá nhân. Nhóm có thể dùng tài khoản riêng với sudo; không cần đăng nhập trực tiếp root cho cả nhóm.

## 2. Kiểm tra sức chứa trước khi cài

```bash
uname -m
lsb_release -ds
free -h
df -h /
lsblk -f
```

RAM 1 GB, ổ 8 GB sẽ chật cho Next + Nest + PostgreSQL, images và backup. **Build trên GitHub runner**, VPS chỉ pull/run. Để demo ổn hơn, ưu tiên 2–4 GB RAM và ổ khoảng 25–30 GB nếu ngân sách cho phép; đây là khuyến nghị kỹ thuật, chưa có hành động đổi gói/chi phí nào. Nếu giữ 1 GB, cần đo thực tế, swap và tải nhỏ; không bảo đảm chịu tải cao.

Nếu mở rộng EBS: snapshot/backup trước, tăng size trong AWS; sau đó xem `lsblk -f` để chọn đúng thiết bị/partition. Ví dụ **chỉ khi root thật là ext4 `/dev/nvme0n1p1`**:

```bash
sudo growpart /dev/nvme0n1 1
sudo resize2fs /dev/nvme0n1p1
df -h /
```

Không chạy lệnh này nếu thiết bị hoặc filesystem khác. Swap 2 GB chỉ tạo khi còn đủ disk, `/swapfile` chưa tồn tại và `swapon --show` chưa có swap phù hợp:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
# Thêm đúng một dòng vào /etc/fstab bằng sudoedit:
# /swapfile none swap sw 0 0
free -h
```

## 3. Network, DNS và Docker

AWS Security Group: inbound **22 chỉ từ IP quản trị**; **80/443 từ Internet**. Không mở 3000,3001,5432,5433. Outbound cần HTTPS tới registry, ACME và VNPay. DNS: A domain → Elastic IP; bỏ AAAA sai nếu chưa có IPv6. Nếu dùng Cloudflare DNS, để DNS only lúc cài đầu để đơn giản hóa cấp chứng chỉ. Sau khi HTTPS hoạt động mới cân nhắc proxy và trust proxy tương ứng.

Đưa mã đã kiểm thử lên nhánh của nhóm, PR vào main. Trên VPS tạo thư mục:

```bash
sudo install -d -o ubuntu -g ubuntu /opt/brewlite
```

Upload ZIP từ Windows rồi giải nén mã trong `/opt/brewlite` (hoặc clone repo của nhóm). File `.env.production` phải nằm cùng `docker-compose.prod.yml`. Gói bàn giao `BrewLite-complete.zip` có thư mục gốc `BrewLite`; giải nén nội dung thư mục này trực tiếp vào `/opt/brewlite`, không để nhầm thành `/opt/brewlite/BrewLite` khi chạy CD.

```powershell
scp -i "$env:USERPROFILE\Downloads\brewlite.pem" .\BrewLite-complete.zip ubuntu@52.64.177.7:/tmp/
```

Cài Docker bằng script đã kèm, trên **Ubuntu mới**:

```bash
cd /opt/brewlite
sudo bash deploy/bootstrap-ubuntu.sh
sudo usermod -aG docker ubuntu
```

Thoát SSH, vào lại rồi `docker version` và `docker compose version`. Quyền docker tương đương quyền quản trị máy; chỉ cấp thành viên vận hành. Script không tự gỡ bản Docker đang có. Không vừa chạy Nginx/Apache khác vừa để Caddy chiếm 80/443; kiểm tra `sudo ss -ltnp` trước.

## 4. Cấu hình môi trường

```bash
cd /opt/brewlite
bash deploy/init-env.sh
nano .env.production
chmod 600 .env.production
```

Script sinh mật khẩu DB hex và JWT ngẫu nhiên; không chạy lại để đổi password khi volume đã có dữ liệu. Điền domain thực, email TLS, IP public, image prefix `ghcr.io/quinnhu1/brewlite2` nếu đây đúng repo bạn push. File này không commit.

Để dùng QR và thẻ Sandbox:

```dotenv
PAYMENT_PROVIDER=vnpay
VNPAY_TMN_CODE=MA_MERCHANT_8_KY_TU
VNPAY_HASH_SECRET=SECRET_CUA_BAN
VNPAY_REFUND_ENABLED=true
PAYMENT_ALLOW_MOCK_IN_PRODUCTION=false
PAYMENT_MOCK_ALLOW_OVERRIDE=false
```

Chỉ bật refund sau khi merchant được cấp chức năng. Giá trị minh họa không phải credential hợp lệ. Return URL đã tự dựng từ domain trong Compose: `https://DOMAIN/api/payments/vnpay/return`. Đăng ký **IPN riêng** `https://DOMAIN/api/payments/vnpay/ipn` với VNPay. RequestId/TmnCode/secret không đưa vào frontend. Xem `VNPAY.md` để kiểm tra kênh QR.

Để demo mô phỏng tách biệt: `PAYMENT_PROVIDER=mock`, `PAYMENT_ALLOW_MOCK_IN_PRODUCTION=true`; cần chọn success/failed thì thêm `PAYMENT_MOCK_ALLOW_OVERRIDE=true`. UI ghi rõ mô phỏng; không có chuyển tiền thật. Đổi cấu hình trên server rồi redeploy/recreate API; không sửa DB payment cũ thành mock.

## 5. Build image qua GitHub và deploy lần đầu

Workflow `.github/workflows/ci.yml`:

1. Verify: install → lint → unit → build → migrate/seed DB test → integration → Playwright.
2. Khi push main và Repository variable **PUBLISH_IMAGES=true**: build/push hai image `ghcr.io/owner/repo-api:COMMIT_SHA`, `...-web:COMMIT_SHA`. FE đã build API `/api`, không nhúng domain cứng.
3. Chưa bật DEPLOY_ENABLED cho đến khi server, domain, .env và registry access sẵn sàng.

Đặt Ruleset/Branch protection cho main: require PR và status **Verify BrewLite**; không cho merge khi fail. File workflow không tự bật luật trên GitHub. Để có minh chứng đúng đề, ghi link một PR CI fail thật và bản sửa pass; không làm giả log/lịch sử.

Nếu GHCR private, đăng nhập **trên VPS** bằng token chỉ `read:packages`, nhập token không đưa vào lịch sử lệnh:

```bash
read -r -p 'GitHub username: ' gh_user
read -r -s -p 'Read-packages token: ' gh_token
printf '%s' "$gh_token" | docker login ghcr.io -u "$gh_user" --password-stdin
unset gh_token
```

Sau khi CI xanh và images có cùng SHA:

```bash
cd /opt/brewlite
bash deploy/release.sh FULL_40_CHARACTER_COMMIT_SHA
```

Script khóa deployment, pull, khởi động DB, dừng API/web cũ, backup `pg_dump -Fc`, migrate một lần, chạy app/proxy, kiểm tra health và smoke HTTPS. Migration thất bại không chạy app mới; kiểm tra log và restart bản cũ. App mới unhealthy/smoke fail làm script thoát khác 0; người vận hành phải chủ động đánh giá rồi gọi `deploy/rollback.sh` theo mục 8. `release.sh` không tự rollback. Có maintenance window ngắn, không quảng cáo zero-downtime.

Lần đầu DB mới chưa có menu: sau release, lấy SHA và seed **catalog không có user demo**:

```bash
export IMAGE_TAG=$(cat .deploy/current)
docker compose --env-file .env.production -f docker-compose.prod.yml --profile ops run --rm migrate npm run db:seed:catalog
read -r -p 'Admin email: ' ADMIN_EMAIL
read -r -p 'Admin phone: ' ADMIN_PHONE
read -r -s -p 'Admin password (12+ chars): ' ADMIN_PASSWORD
export ADMIN_EMAIL ADMIN_PHONE ADMIN_PASSWORD
docker compose --env-file .env.production -f docker-compose.prod.yml --profile ops run --rm -e ADMIN_EMAIL -e ADMIN_PHONE -e ADMIN_PASSWORD migrate npm run admin:create
unset ADMIN_EMAIL ADMIN_PHONE ADMIN_PASSWORD
```

Catalog seed từ chối DB đã có sản phẩm/đơn để không ghi đè menu đang sử dụng. Không chạy `db:seed` (có admin/password mẫu) hay reset trên public. Nếu nhập DB cũ có demo user, đổi/xóa quyền demo bằng quy trình quản trị trước khi mở Internet; giữ dữ liệu nghiệp vụ liên quan.

**Phương án máy dev build/push** nếu CI chưa dùng được (sau khi tự chạy test):

```bash
# Chạy trên máy dev x86_64 có Docker, không build trên VPS 1 GB.
export IMAGE_TAG=review-local-01
export IMAGE_REGISTRY=ghcr.io/your-owner/your-repo
docker build -t "$IMAGE_REGISTRY-api:$IMAGE_TAG" apps/api
docker build --build-arg NEXT_PUBLIC_API_URL=/api -t "$IMAGE_REGISTRY-web:$IMAGE_TAG" apps/web
docker push "$IMAGE_REGISTRY-api:$IMAGE_TAG"
docker push "$IMAGE_REGISTRY-web:$IMAGE_TAG"
```

Phương án này giúp chạy tay nhưng không thay thế minh chứng CI/CD của Assignment 2. Với máy ARM cần build `--platform linux/amd64` cho EC2 hiện tại.

## 6. CD qua SSH

Tạo key riêng cho GitHub Actions, public key thêm vào authorized_keys của user deploy; private key lưu **GitHub environment production secret**. Không dùng lại key cá nhân của bạn. Tạo các secret:

| Secret / variable | Giá trị |
|---|---|
| VPS_HOST | `52.64.177.7` |
| VPS_USER | `ubuntu` hoặc user deploy đã chuẩn bị quyền docker và `/opt/brewlite` |
| VPS_SSH_KEY | Private key riêng của CI |
| VPS_KNOWN_HOSTS | Dòng known_hosts đã kiểm tra fingerprint với server |
| PUBLISH_IMAGES (variable) | `true` |
| DEPLOY_ENABLED (variable) | `true` khi sẵn sàng tự deploy |

`ssh-keyscan` chỉ thu thập khóa; tự nó không xác minh danh tính. So sánh fingerprint với `sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` từ console tin cậy trước khi lưu. Workflow bật StrictHostKeyChecking, không bỏ qua lỗi host key. Runner GitHub phải SSH tới VPS được; cấu hình SG phù hợp cơ chế runner của nhóm, không mở 22 toàn Internet vĩnh viễn chỉ để tiện.

Push main → Verify xanh → image SHA → scp deployment config → SSH release → smoke. `.env.production` trên VPS không bị upload đè. Lưu link workflow thành công vào release notes.

## 7. Nghiệm thu public

| Kiểm tra | Kết quả cần thấy |
|---|---|
| `https://DOMAIN` bằng 4G/laptop khác | Trang BrewLite, TLS hợp lệ, không cần ngrok/laptop dev |
| `https://DOMAIN/api/health` | `{"status":"ok"}`, DB kết nối được |
| `https://DOMAIN/api/products` | Menu đã seed |
| `/api/payments/config` | sandbox/configured true hoặc simulation có nhãn |
| Đăng ký → menu → checkout → VNPay ATM | IPN xác minh, Order PAID; refresh không tạo payment mới |
| QR | Merchant/kênh test tạo QR, kết quả qua IPN/QueryDR; ghi rõ kết quả thực tế |
| Hủy đã trả tiền | Receipt; processing khi chưa rõ; chỉ refunded khi đã xác minh |
| Đóng laptop/SSH rồi thử lại | Web tiếp tục hoạt động |
| Reboot VPS có kiểm soát | Docker/container tự lên, dữ liệu/SSL còn |
| DB/API ports từ ngoài | Không public 5432/5433/3000/3001 |

Không đưa URL ví dụ vào báo cáo như URL đã chạy. Điền URL thật và timestamp kiểm tra. Swagger ở local `/swagger`; Caddy chặn `/api/swagger*` public. Nếu cần Swagger trên server: SSH tunnel đến container API nội bộ, không mở port API toàn Internet.

## 8. Backup, rollback và vận hành

```bash
bash deploy/backup.sh
export IMAGE_TAG=$(cat .deploy/current)
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 api proxy
docker stats --no-stream
```

Backup được lưu chmod700/600, phải sao lưu mã hóa ra ngoài VPS. Có thể dùng cron của user deploy, ví dụ 02:30 giờ server: `30 2 * * * cd /opt/brewlite && bash deploy/backup.sh >> .deploy/backup.log 2>&1`; kiểm tra timezone server, dung lượng và retention. Không log biến secret.

Rollback **images** về SHA đã có và tương thích schema:

```bash
bash deploy/rollback.sh PREVIOUS_COMPATIBLE_SHA
```

Không rollback mã cũ chưa hiểu cancellation/refund mới khi còn giao dịch cần xử lý. Migration bản này thêm bảng/cột, nhưng logic nghiệp vụ cũ có thể không an toàn dù SQL tương thích. Nếu cần phục hồi DB, dừng nhận đơn, chốt reconciliation và restore backup vào DB mới để kiểm chứng trước; không tự xóa volume hay chạy `docker compose down -v`. Test restore trên DB dùng một lần:

```bash
# Trên server đã chọn backup cụ thể, chỉ tạo DB mới riêng cho bài kiểm tra restore.
export IMAGE_TAG=$(cat .deploy/current)
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T db createdb -U brewlite brewlite_restore_test
cat backups/CHOSEN_BACKUP.dump | docker compose --env-file .env.production -f docker-compose.prod.yml exec -T db pg_restore -U brewlite -d brewlite_restore_test --no-owner --exit-on-error
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T db psql -U brewlite -d brewlite_restore_test -c 'SELECT count(*) FROM orders;'
```

502: kiểm tra API/web health và image. TLS chưa cấp: kiểm tra DNS A/AAAA, SG80/443, xung đột cổng, log Caddy. IPN không đến: kiểm tra URL `/api/payments/vnpay/ipn` và đăng ký portal, không có login/challenge trên callback. QR fail tức thì: xem response code trong history và cấu hình merchant, không tự đổi credentials của đơn cũ. Disk đầy: xem `docker system df`, logs/backup; xóa image cũ có chọn lọc sau khi giữ image rollback, **không prune volumes**.

## 9. Lịch sử nâng cấp baseline 1.2 → 1.3

1. Backup, kiểm tra phục hồi trên DB riêng; thông báo người dùng sẽ đăng nhập lại. Ghi lại các refund processing/review và request_id để đối soát sau nâng cấp.
2. Các con số 8 unit Jest, 8 client tests, 64 integration và 6 browser scenarios thuộc báo cáo baseline 1.3 trước phần auth password hardening. Với repo hiện tại, chạy lại toàn bộ `npm run check`, `npm run test:integration`, `npm run test:e2e`; chỉ publish/deploy sau khi CI mới thực sự xanh.
3. Dùng `bash deploy/release.sh COMMIT_SHA_MOI` theo quy trình image ở trên. Script backup, dừng app trước migration rồi chạy image mới; **không** thay bằng migrate reset. Migration mới `20261114120000_auth_sessions_rate_limits` thêm users.auth_version và bảng rate limit; tổng 6 migration, Prisma không chạy lại migration đã áp dụng.
4. Sau smoke, đăng nhập lại. JWT cũ thiếu auth_version bị 401; giỏ cũ không xác định chủ sở hữu được dọn một lần, order/payment trên DB còn nguyên. TTL mặc định API mới là 3600 giây; local env cũ đặt 604800 vẫn ghi đè mặc định nên đổi nếu muốn dùng 1 giờ. Compose production hiện không truyền override này, dùng mặc định.
5. Test đổi mật khẩu với mật khẩu hiện tại; token cũ ở thiết bị thứ hai phải 401, token mới đăng nhập được. Nút Đăng xuất mọi phiên cũng thu hồi token ở các thiết bị. Thử nhiều lần sai nhận 429 và Retry-After; không xóa rate bucket production để bỏ qua kiểm soát.
6. Test A chọn đặt lại, đăng xuất rồi B đăng nhập; B không thấy giỏ/order ID của A. Gửi request giá giả phải bị chặn như trước.
7. Với refund chưa gửi, sửa env sai rồi recreate/release API để process đọc cấu hình mới; đợi cooldown rồi kiểm tra. Với receipt đã có submitted_at, làm theo VNPAY.md, không đặt lại null hoặc tự gán succeeded.

Rollback chỉ về mã tương thích **cả lifecycle tiền và auth_version**. API cũ bỏ qua phiên bản có thể chấp nhận lại token đã thu hồi; không rollback mù về 1.2. Nếu buộc dùng mã cũ phải có kế hoạch thay JWT secret, vô hiệu hóa phiên và đối soát các giao dịch đang chờ trước; ưu tiên bản sửa tiến lên. Migrate schema additive không chứng minh rollback nghiệp vụ an toàn.

`TRUST_PROXY_HOPS=1` chỉ đúng khi API private nhận qua một proxy Caddy như Compose. Không publish API rồi tin mọi X-Forwarded-For; nếu đổi kiến trúc proxy cần kiểm tra lại IP client vì rate limit phụ thuộc req.ip. Cùng IP trường học có thể dùng chung hạn mức; 429 là kiểm soát dự kiến, không là lỗi gateway.

Đo hiệu năng theo tests/README.md: mặc định read-only trên URL public; bài 12 nhóm có ghi chỉ chạy staging/DB test dùng một lần ở loopback. Ghi thêm latency QR/ATM/QueryDR từ môi trường merchant; kết quả mock local không thay cho phép đo đó.

## Tài liệu chính thức đối chiếu

- Docker Ubuntu: https://docs.docker.com/engine/install/ubuntu/ — chú ý port publish Docker có thể đi vòng UFW, nên DB không publish ngay từ Compose.
- Caddy HTTPS: https://caddyserver.com/docs/automatic-https — DNS domain và inbound80/443.
- GitHub container registry: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- AWS mở rộng filesystem: https://docs.aws.amazon.com/ebs/latest/userguide/recognize-expanded-volume-linux.html
