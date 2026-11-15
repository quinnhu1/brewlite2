# Sơ đồ

Lưu nguồn chỉnh sửa và bản kết xuất SVG hoặc PDF cho activity, sequence, class và deployment diagram. Đặt mã sơ đồ trong [ma trận truy vết](../traceability-matrix.md).

Sequence checkout cần bao quát hết hàng, chưa đăng nhập, thất bại và thử lại thanh toán. Deployment diagram dùng tên dịch vụ, môi trường và kết nối mà nhóm thực sự triển khai.

## Danh mục

| Sơ đồ | Nguồn | Bản kết xuất | Nội dung |
| --- | --- | --- | --- |
| Activity | `activity diagram.puml` | `Activity_Diagram.svg` | Luồng đặt hàng và thanh toán |
| Sequence | `sequence diagram.puml` | `Sequence_Diagram.svg` | Checkout, thanh toán, thử lại |
| Class | `class diagram.puml` | `Class_Diagram.svg` | Mô hình miền |
| Deployment | `deployment.mmd` | `Deployment_Diagram.svg` | VPS Ubuntu + Docker Compose + Caddy, luồng CI/CD (ADR-003) |

`deployment.mmd` dùng Mermaid; `Deployment_Diagram.svg` được vẽ tay theo cùng nội
dung nên không cần cài công cụ render. Nếu sửa một trong hai, cập nhật bản còn
lại và giữ tên dịch vụ khớp `docker-compose.prod.yml` (`db`, `api`, `web`,
`caddy`).

Render lại bằng Mermaid CLI:

```bash
npx -y @mermaid-js/mermaid-cli -i deployment.mmd -o Deployment_Diagram.svg
```
