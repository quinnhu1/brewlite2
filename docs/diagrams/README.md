<<<<<<< HEAD
# Sơ đồ có nguồn chỉnh sửa và SVG

| ID | Nội dung | Nguồn | Bản kết xuất |
|---|---|---|---|
| UC-overview | Use-case tổng quát | [use-cases.puml](use-cases.puml) | [SVG](use-cases.svg) |
| UC-01 | Use-case checkout | [use-case-checkout.puml](use-case-checkout.puml) | [SVG](use-case-checkout.svg) |
| Activity-01 | Checkout, JWT, hết hàng, thất bại/chưa rõ | [activity-checkout.puml](activity-checkout.puml) | [SVG](activity-checkout.svg) |
| Sequence-01 | 5 lifeline, transaction, idempotency, IPN | [sequence-checkout.puml](sequence-checkout.puml) | [SVG](sequence-checkout.svg) |
| Sequence-02 | Hủy/hoàn/đơn thay thế | [sequence-cancel-refund.puml](sequence-cancel-refund.puml) | [SVG](sequence-cancel-refund.svg) |
| Class-01 | Domain, multiplicity, trạng thái | [domain-class.puml](domain-class.puml) | [SVG](domain-class.svg) |
| Deployment-01 | AWS Ubuntu, Caddy, Docker, CI và gateway | [deployment.puml](deployment.puml) | [SVG](deployment.svg) |

SVG được kết xuất từ PlantUML, không là ảnh chụp môi trường đã deploy. Sơ đồ deployment phản ánh bộ Compose cho AWS đã lựa chọn, nhưng cần URL/CI evidence để chứng minh đã chạy. Nguồn UTF-8; dùng Java + PlantUML và Graphviz để sửa/xuất lại, ví dụ `java -jar plantuml.jar -charset UTF-8 -tsvg docs/diagrams/*.puml`. Kiểm tra ảnh sau mỗi lần thay nguồn. Enum domain trình bày trạng thái luồng mới; schema vẫn giữ các giá trị legacy để không phá dữ liệu cũ.
=======
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
>>>>>>> origin/main
