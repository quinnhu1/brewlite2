# BrewLite web

Next.js App Router. Cấu trúc:

- `src/app`: route và màn hình.
- `src/components`: UI tái sử dụng, gồm tài khoản/đơn/giỏ/menu.
- `src/lib/api`: client HTTP và API theo nghiệp vụ `auth`, `products`, `orders`, `payments`.
- `src/store`: giỏ hàng và trạng thái checkout chưa hoàn tất.
- `src/data/categories.ts`: danh mục UI và chuẩn hóa đường dẫn ảnh, không chứa dữ liệu sản phẩm/giá giả.
- `public/images/products`: minh họa vector của từng món.

Hướng dẫn đầy đủ nằm ở [README gốc](../README.md).

```powershell
npm ci
npm run dev
```

`NEXT_PUBLIC_API_URL` là URL backend trình duyệt truy cập được. Thay biến này cần restart dev hoặc build lại bản production. Phụ thu size/topping lấy từ API, tổng cuối được backend xác nhận.
