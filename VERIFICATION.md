# Kết quả xác minh

Ngày thực hiện: 05/11/2026, múi giờ Asia/Saigon.

## Đã chạy thành công

- Cài dependency và tạo `package-lock.json`.
- `npm run build`: TypeScript strict biên dịch thành công.
- `npm test`: **17/17 unit tests** vượt qua, trên 4 suite.
- `npm run test:integration`: **13/13 integration tests** vượt qua trên PostgreSQL thật, database thử riêng. Máy hiện không có Docker CLI; PostgreSQL được khởi chạy tạm bằng package `embedded-postgres` trong thư mục scratch, không phải database mock và không trở thành dependency của dự án bàn giao.
- Tổng cộng: **30 tests** vượt qua.
- Integration kiểm tra: đăng ký/đăng nhập, password sai, JWT, RBAC, chống tự gán role, tìm tiếng Việt, checkout HTTP, chống đọc đơn khách khác, hai khách tranh đơn vị hàng cuối, checkout trùng đồng thời, transaction rollback, DTO chat, chống giả mạo userId, response AI gắn entity thật, thiếu API key và thu hồi JWT.
- Kiểm tra chạy thực tế riêng: TypeORM CLI migration trên DB trống; seed chạy hai lần vẫn chỉ có 3 sản phẩm và 1 admin; khởi động `dist/main.js` và gọi `/api/health` thành công.
- `npm run format:check`: toàn bộ mã nguồn/cấu hình nằm trong phạm vi kiểm tra đạt Prettier.
- `npm audit --omit=dev --audit-level=high`: báo **0 vulnerabilities** ở dependency runtime tại thời điểm kiểm tra.

Môi trường kiểm tra dùng Node.js 24.13.0 trên Windows. Dự án khai báo Node.js >=22. Dependency runtime đáng chú ý sau khi resolve: NestJS 11.2.8, TypeORM 0.3.31, OpenAI SDK 6.49.0, Zod 4.6.7.

## Phạm vi chưa kiểm tra trực tiếp

- Chưa gọi OpenAI thật vì không có API key được cung cấp. Unit/integration tests thay provider bằng mock để kiểm tra logic xác định; không mô tả những test đó là kiểm thử chất lượng model.
- Chưa chạy Redis server thật. Memory mode đã được kiểm thử TTL, giới hạn phiên, cách ly tài khoản, chống xử lý đồng thời và khôi phục sau lỗi. Redis adapter có mã kết nối, TTL, distributed lock và fencing; cần smoke test với Redis trong môi trường triển khai.
- Chưa chạy `docker compose up` trên máy này vì không có Docker CLI. Compose được cung cấp để khởi tạo PostgreSQL/Redis ở môi trường người dùng.
- Chưa tích hợp cổng thu tiền; checkout xác nhận đơn và trừ tồn kho trong transaction. Không đánh dấu giao dịch đã thanh toán.

File ZIP chỉ chứa mã nguồn, migration, tests, lockfile và tài liệu; không chứa `node_modules`, bản build, `.env` thực hoặc dữ liệu database thử.

## Bổ sung frontend Cam — 05/11/2026

- Đã build React + TypeScript + Vite thành công bằng `npm run build:all`.
- Chạy lại 17 unit tests backend: tất cả vượt qua.
- QA trực tiếp trên trình duyệt: tìm kiếm `giay nam` trả đúng một sản phẩm; đăng nhập demo; thêm balo vào giỏ; tăng số lượng từ 1 lên 2; checkout tạo đơn xác nhận tổng 780.000 VND; xem lại đơn; kiểm tra UI thông báo AI chưa khả dụng khi thiếu API key.
- Kiểm tra yêu thích chỉ hiển thị một sản phẩm đã chọn; sắp xếp giá tăng trả balo → giày nữ → giày nam; modal chi tiết hiển thị đúng giá và thuộc tính.
- Kiểm tra layout desktop và viewport điện thoại 390×844; trang không tràn ngang ngoài vùng navigation được phép cuộn. Các ảnh đều tải thành công; không có console error/warning khi kiểm tra bản static qua NestJS.
- Frontend đang được phục vụ từ NestJS tại `/`, API giữ nguyên `/api`, Swagger giữ nguyên `/api/docs`.
- Ảnh là minh họa cho các sản phẩm seed, có nhãn trên thẻ. Catalog UI hiện tải tối đa 50 sản phẩm.
- Screenshot giao diện nằm cạnh thư mục project: `cam-storefront-preview.png`.

## Catalog + Coupon — 06/11/2026

- Build TypeScript frontend/backend thành công.
- 22 unit tests và 19 integration tests PostgreSQL thật: **41/41 vượt qua**.
- Test mới kiểm tra tính phần trăm làm tròn xuống, mức trần, giảm cố định, không tạo tổng âm; mã hết hạn/chưa hiệu lực/ngừng áp dụng/hết lượt/chưa đạt giá trị tối thiểu; không tin subtotal/total từ client; giới hạn/người; retry không tăng lượt; rollback tồn kho khi mã lỗi; hai khách tranh lượt mã cuối chỉ có một khách thành công.
- Migration chạy trên database demo hiện có, backfill số tiền cho đơn cũ; seed bổ sung thành 36 sản phẩm, 9 danh mục, 3 mã, giữ nguyên sản phẩm và đơn cũ.
- Kiểm tra live API: giỏ 650.000đ, CAM10 giảm 65.000đ, checkout 585.000đ; replay trả cùng order; đọc lại order giữ couponCode/discount/subtotal; đơn cũ vẫn thỏa total = subtotal - discount.
- Kiểm tra 25 ảnh cục bộ trả HTTP 200. Backend đang phục vụ giao diện tại http://localhost:3000/.
- Không thực hiện được QA trực quan bản cập nhật 06/11 vì browser access host không khả dụng. Các thao tác UI đã được triển khai và TypeScript build qua; không coi kiểm tra API là kiểm tra trực quan trên trình duyệt.

## Admin / Staff — 06/11/2026

- Build frontend và backend thành công; /admin và /admin/ trả HTTP 200 với asset JS/CSS đầy đủ.
- 22 unit tests + 24 integration tests PostgreSQL thật: **46/46 vượt qua**.
- Test mới: lấy current user/role an toàn; Customer không được xem product management, order management, overview; Staff xem/sửa nhưng không được DELETE hoặc PATCH isActive; Admin tạo/sửa/ẩn/khôi phục; public không thấy sản phẩm đã ẩn; kiểm tra dữ liệu nhập/URL ảnh; cập nhật giá giữ nguyên stock đã giảm; quản lý đơn theo đúng chiều trạng thái.
- Live API: Admin seed đăng nhập thành công, /auth/me xác minh role admin; quản trị thấy 36 sản phẩm và 3 đơn; Customer bị 403; tài khoản/mật khẩu Admin chỉ lưu .env cục bộ, không in vào frontend/ZIP.
- Migration imageUrl chạy trên DB hiện có, giữ nguyên catalog và đơn hàng. Ảnh mới chọn từ thư viện cục bộ, không hỗ trợ upload.
- Browser access host vẫn không khả dụng, nên chưa kiểm thử trực quan các màn hình Admin. Không mô tả API smoke test là kiểm thử UI trên trình duyệt.

## Mở rộng catalog cho đồ án cuối kỳ — 06/11/2026

- Bổ sung 114 sản phẩm, đạt **150 sản phẩm / 18 danh mục**, thêm 37 ảnh minh họa và mở rộng thư viện ảnh Admin.
- Kiểm tra fixture: ID/tên không trùng, giá/số lượng nguyên hợp lệ, độ dài mô tả/tags phù hợp DTO, mọi imageUrl đều có file tương ứng.
- Build frontend/backend thành công. Không đổi cấu hình API key hoặc chức năng thanh toán.
- Seed chạy hai lần: tổng vẫn 150; so sánh snapshot DB xác nhận cả 36 sản phẩm cũ giữ nguyên toàn bộ trường, bao gồm giá, tồn kho và nội dung.
- Live API: tải đủ 3 trang x 50, 150 ID riêng biệt; 18/18 bộ lọc danh mục trả đúng mặt hàng; tìm kiếm tiếng Việt với sách hoạt động; 61 URL ảnh được sản phẩm sử dụng trả HTTP 200; trang chủ HTTP 200.
- Trang chủ xen kẽ danh mục ở chế độ Gợi ý, vẫn giữ sắp xếp giá và Xem thêm 12 sản phẩm/lần.
- Browser access host không khả dụng; chưa kiểm tra trực quan bản catalog mới trên trình duyệt.
