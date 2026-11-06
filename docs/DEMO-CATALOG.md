# Catalog demo cho bài cuối kỳ

Bộ dữ liệu gồm **150 sản phẩm mẫu thuộc 18 danh mục**, phục vụ thuyết trình và kiểm tra các chức năng của đồ án. Giá, mô tả và thông số là dữ liệu demo; ảnh có nhãn minh họa.

| Danh mục | Số sản phẩm |
|---|---:|
| Giày | 13 |
| Balo | 11 |
| Thời trang | 12 |
| Điện tử | 10 |
| Gia dụng | 10 |
| Làm đẹp | 10 |
| Thể thao | 10 |
| Văn phòng phẩm | 10 |
| Phụ kiện | 10 |
| Điện thoại & phụ kiện | 6 |
| Máy tính & phụ kiện | 6 |
| Nhà bếp | 6 |
| Sách | 6 |
| Đồ chơi | 6 |
| Mẹ & bé | 6 |
| Thú cưng | 6 |
| Ô tô & xe máy | 6 |
| Du lịch & dã ngoại | 6 |

Giá trải từ 29.000đ đến 9.490.000đ. Có mặt hàng giá nhỏ để thử giỏ hàng, cùng điện thoại/laptop mẫu để thử lọc giá và mã giảm giá có giá trị đơn tối thiểu.

## Demo gợi ý

1. Mở trang chủ và chọn một trong 18 danh mục.
2. Tìm "tiếng anh", "tai nghe", "balo" hoặc "laptop"; thử tìm không dấu.
3. Đổi thứ tự giá thấp/cao và dùng Xem thêm để duyệt catalog.
4. Thêm nhiều loại mặt hàng vào giỏ, thay số lượng và áp mã có sẵn.
5. Vào Admin để sửa sản phẩm hoặc thêm mặt hàng mới trong một danh mục.

## Nạp dữ liệu

Chạy `npm run seed` từ thư mục backend. Seed chỉ thêm ID chưa tồn tại, không ghi đè giá, tồn kho, nội dung, trạng thái hoặc ảnh đã chỉnh sửa. Chạy nhiều lần không sinh sản phẩm trùng và không reset lượt mã giảm giá.

114 sản phẩm bổ sung dùng ID bắt đầu bằng `30000000-...`, nằm trong `src/database/catalog.json`; trường `imageUrl` tham chiếu ảnh cục bộ. Ảnh mới cũng có trong thư viện chọn ảnh của Admin.

Ở chế độ Gợi ý, trang chủ xen kẽ sản phẩm giữa các danh mục để phần đầu catalog đa dạng hơn. Lọc danh mục và sắp xếp giá vẫn áp dụng bình thường. Không cần cấu hình AI để thử các luồng catalog, giỏ hàng, mã giảm giá và Admin.
