# Cam Storefront

Frontend React 19 + TypeScript + Vite, màu cam chủ đạo #ee4d2d. Ảnh và font được đóng gói cục bộ; frontend chỉ gọi `/api` cùng origin.

## Chạy

Từ thư mục backend:

```powershell
npm ci
npm run frontend:install
npm run build:all
npm start
```

PostgreSQL, migration và `.env` phải được cấu hình như README ở thư mục cha. Mở `http://localhost:3000/`; Swagger vẫn ở `/api/docs`.

Phát triển có hot reload: chạy backend tại 3000 rồi `npm run frontend:dev`. Vite tại 5173 tự proxy `/api` sang backend; không cần thay CORS hay đưa token vào URL.

## Các chức năng

- Trang chủ responsive, danh sách sản phẩm thật từ backend, tìm không dấu, lọc danh mục/giá và sắp xếp giá.
- Xem chi tiết sản phẩm, chọn số lượng, lưu danh sách yêu thích trên trình duyệt.
- Đăng nhập/đăng ký, JWT lưu sessionStorage kèm thời hạn; xóa khi hết phiên hoặc đăng xuất.
- Giỏ hàng từ DB, cập nhật số lượng/xóa dòng, tổng tiền do server trả.
- Checkout có idempotency key giữ lại khi lỗi và retry; thông báo đơn xác nhận, chưa thu tiền trực tuyến.
- Danh sách đơn và trạng thái do backend cung cấp.
- Chat AI theo user/session, đính kèm sản phẩm và xử lý lỗi provider. Chưa có API key thì báo dịch vụ chưa khả dụng, không giả lập lời tư vấn.
- Dialog hỗ trợ Escape, focus management bằng phần tử HTML dialog; các nút biểu tượng có aria-label.

## Cấu trúc

- `src/App.tsx`: điều phối phiên đăng nhập, catalog, giỏ, đơn, chat và layout cửa hàng.
- `src/api.ts`: HTTP client, lỗi API, session và định dạng VND.
- `src/types.ts`: kiểu dữ liệu của API.
- `src/components/`: dialog, đăng nhập, thẻ và ảnh sản phẩm.
- `src/styles.css`: desktop, tablet, mobile và reduced motion.
- `public/images/`: ảnh minh họa cục bộ.

Catalog tải dữ liệu theo từng trang API (50 sản phẩm/trang) và có nút Xem thêm, mỗi lần 12 sản phẩm. Danh mục lấy động từ catalog. Bản seed hiện có 150 sản phẩm, 18 danh mục. Ở chế độ Gợi ý, sản phẩm được xen kẽ giữa các danh mục. Sản phẩm mới trong seed dùng imageUrl lưu ở database; ảnh seed cũ có mapping dự phòng trong imageFor.

Ảnh minh họa không thay thế ảnh sản phẩm thực tế. Nguồn ảnh: [giày đen](https://unsplash.com/photos/a-black-adidas-sneakers-on-a-white-background-4s8aUGaYnEE), [giày trắng](https://images.unsplash.com/photo-1600269452121-4f2416e55c28), [balo](https://images.unsplash.com/photo-1553062407-98eeb64c6a62), [hero](https://images.unsplash.com/photo-1542291026-7eec264c27ff). Font Be Vietnam Pro qua package @fontsource, icon Lucide. Tên cửa hàng Cam là tên demo, không đại diện Shopee.


## Mã giảm giá

Khu ưu đãi hiển thị mã đang có hiệu lực từ API. Trong giỏ hàng, nhập hoặc chọn CAM10, GIAM50K, CAM20 và bấm Áp dụng. Preview được server tính từ giỏ hàng thật. Khi đổi sản phẩm/số lượng, mã đang áp dụng bị gỡ để kiểm tra lại điều kiện. Checkout gửi couponCode và giữ idempotency key khi retry. Lịch sử đơn hiển thị số tiền đã giảm.

Ảnh mới là ảnh minh họa cục bộ từ Unsplash; xem danh sách URL trong public/image-sources.json.


## Quản trị

/admin dùng AdminApp và các component trong src/admin/: AdminOverview, AdminProducts, ProductEditor, AdminOrders. Giao diện xác minh tài khoản bằng /auth/me trước khi gọi API quản trị; Customer nhận màn hình không có quyền. Admin có nút ngừng bán/mở bán lại; Staff không có các nút đó và bị API chặn nếu gọi trực tiếp. Thư viện ảnh minh họa có sẵn dùng field imageUrl; chưa hỗ trợ upload ảnh.
