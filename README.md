# NestJS E-commerce + AI Sales Assistant

Mã nguồn NestJS 11, TypeScript strict, PostgreSQL + TypeORM, JWT/RBAC và OpenAI SDK chính thức. Các endpoint đều dùng tiền tố `/api`. Dự án gồm backend API và frontend React/TypeScript màu cam, được phục vụ cùng ứng dụng NestJS.

## Frontend bán hàng

Mở `http://localhost:3000/` để dùng giao diện Cam. Cài dependency bằng `npm run frontend:install`, sau đó `npm run build:all` và `npm start`. Khi phát triển có thể dùng `npm run frontend:dev` tại 5173, proxy API sang 3000. Xem [frontend/README.md](frontend/README.md) để biết chi tiết chức năng và cấu trúc.

## Catalog và mã giảm giá (06/11/2026)

Chạy lại migration và seed để bổ sung 33 sản phẩm, đạt **36 sản phẩm / 9 danh mục**: Giày, Balo, Thời trang, Điện tử, Gia dụng, Làm đẹp, Thể thao, Văn phòng phẩm, Phụ kiện. Seed không ghi đè stock, giá hoặc sản phẩm đã tồn tại.

| Mã | Ưu đãi | Đơn tối thiểu | Giới hạn/người |
|---|---|---:|---:|
| CAM10 | Giảm 10%, tối đa 100.000đ | 200.000đ | 3 |
| GIAM50K | Giảm 50.000đ | 500.000đ | 1 |
| CAM20 | Giảm 20%, tối đa 200.000đ | 1.000.000đ | 1 |

Mã mẫu có hiệu lực tới 31/12/2027, mỗi đơn chỉ dùng 1 mã. Toàn hệ thống lần lượt tối đa 5.000 / 1.000 / 500 lượt; preview không giữ lượt. Seed lại không reset lượt đã dùng.

- Public `GET /api/coupons`: danh sách mã đang có hiệu lực và còn lượt.
- JWT `POST /api/coupons/preview`, body `{ "code": "CAM10" }`: tính dự kiến trên giỏ hàng của chủ JWT; không nhận subtotal từ client.
- Checkout thêm field tùy chọn `couponCode`, ví dụ `{ "idempotencyKey": "<UUID>", "couponCode": "CAM10" }`. Không gửi số tiền giảm/tổng tiền từ frontend.
- Coupon được khóa `FOR UPDATE` cùng transaction checkout; kiểm tra hạn, điều kiện, giới hạn/người và lượt toàn cục trước khi ghi Order. Nếu mã lỗi, rollback tồn kho và giữ giỏ hàng. Retry key cũ trả đơn cũ, không tăng lượt dùng.
- Order chụp `subtotal`, `discount`, `couponCode`, `total`. Migration backfill đơn cũ với subtotal = total, discount = 0.
- UI có dải danh mục động, khu mã ưu đãi, ô nhập/xóa mã trong giỏ, số tiền được giảm và thành tiền. Catalog tải các trang API và hiển thị thêm 12 thẻ mỗi lần bấm Xem thêm.

`npm run migration:run` → `npm run seed` → `npm run build:all` → `npm start`.

## Trang quản trị Admin / Staff

Mở **http://localhost:3000/admin** (hoặc bấm **Quản trị** sau khi đăng nhập Admin/Staff tại gian hàng).

- Tổng quan: số sản phẩm đang/ngừng bán, tồn kho thấp, đơn hàng theo trạng thái và tổng giá trị đặt hàng. Giá trị đặt hàng không đồng nghĩa tiền đã thu.
- Sản phẩm: tìm kiếm, phân trang, lọc trạng thái, thêm/sửa tên, mô tả, giá, tồn kho, danh mục, tags và chọn ảnh minh họa từ thư viện có sẵn.
- Admin được ngừng bán (ẩn khỏi gian hàng) và mở bán lại. Staff chỉ thêm/sửa; API chặn cả việc Staff cố đổi isActive qua PATCH để lách quyền xóa.
- Đơn hàng: tìm theo mã đơn/email khách hàng, lọc trạng thái, xem chi tiết và cập nhật confirmed → shipped → delivered.
- Customer không được vào API quản trị. Trang /admin xác minh role hiện tại qua /api/auth/me; không chỉ tin role trong sessionStorage.

Tạo Admin ban đầu bằng SEED_ADMIN_EMAIL và SEED_ADMIN_PASSWORD trong .env rồi chạy npm run seed. Seed chỉ tạo nếu email chưa tồn tại; không reset password hay nâng quyền một tài khoản Customer có sẵn. Mật khẩu Admin cục bộ không nằm trong source/ZIP hoặc frontend.

API mới:

| Method | Endpoint | Quyền |
|---|---|---|
| GET | /api/auth/me | Đã đăng nhập |
| GET | /api/admin/overview | Admin, Staff |
| GET | /api/products/manage | Admin, Staff |
| GET | /api/orders/manage | Admin, Staff |

Product management nhận q, status (all/active/inactive), page, limit. Order management nhận q, status (confirmed/shipped/delivered), page, limit. Limit tối đa 50. Các response quản trị không trả password hash/tokenVersion của khách hàng.

Migration ProductImages bổ sung imageUrl nullable. URL ảnh hiện giới hạn trong thư viện /images/ với định dạng jpg/png/webp; chưa có upload ảnh từ máy. Form sửa chỉ gửi các field thực sự đổi, tránh ghi đè tồn kho vừa được checkout nếu người quản trị chỉ sửa tên/giá.

## 1. Cấu trúc thư mục

```text
nest-commerce/
├── frontend/                           # React + TypeScript + Vite, UI màu cam
│   ├── src/
│   ├── public/images/
│   └── README.md
├── src/
│   ├── main.ts                         # Bootstrap, shutdown hooks
│   ├── app.module.ts                   # Ghép module, config, ORM, rate limit
│   ├── config/
│   │   └── env.ts                      # Kiểm tra biến môi trường bằng Zod
│   ├── common/
│   │   ├── money.ts                    # Tổng tiền nguyên VND, giới hạn an toàn
│   │   └── setup-app.ts                # ValidationPipe, Helmet, CORS, /api
│   ├── users/
│   │   └── entities/user.entity.ts     # User, Role, tokenVersion
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts             # Đăng ký, đăng nhập, thu hồi JWT
│   │   ├── auth.guards.ts              # JWT guard + Roles guard toàn cục
│   │   ├── auth.decorators.ts          # Public, Roles, CurrentUser
│   │   └── dto/auth.dto.ts
│   ├── products/
│   │   ├── product.module.ts
│   │   ├── product.controller.ts
│   │   ├── product.service.ts          # CRUD + truy vấn sản phẩm còn hàng
│   │   ├── product-search.ts           # Chuẩn hóa tiếng Việt, keywords/tags
│   │   ├── dto/product.dto.ts
│   │   └── entities/product.entity.ts  # Product, tags[], searchText
│   ├── cart/
│   │   ├── cart.module.ts
│   │   ├── cart.controller.ts
│   │   ├── cart.service.ts
│   │   ├── dto/cart.dto.ts
│   │   └── entities/cart-item.entity.ts
│   ├── orders/
│   │   ├── order.module.ts
│   │   ├── order.controller.ts
│   │   ├── order.service.ts            # Transaction, khóa hàng, idempotency
│   │   ├── dto/order.dto.ts
│   │   └── entities/order.entity.ts    # Order + OrderItem snapshot
│   ├── ai/
│   │   ├── ai.module.ts
│   │   ├── ai.controller.ts            # POST /api/ai/chat
│   │   ├── ai.service.ts               # Điều phối hiểu nhu cầu → DB → tư vấn
│   │   ├── llm.service.ts              # OpenAI Responses API + JSON schema
│   │   ├── ai.prompts.ts               # System Instructions tiếng Việt
│   │   ├── ai.schemas.ts               # Schema nhu cầu và câu trả lời
│   │   ├── chat-memory.service.ts      # Redis hoặc Memory, TTL và session lock
│   │   └── dto/chat.dto.ts
│   └── database/
│       ├── data-source.ts
│       ├── seed.ts                     # Admin tùy chọn + catalog và mã mẫu
│       └── migrations/
│           └── 1760000000000-initial-schema.ts
├── docs/
│   └── AI-FLOW.md                       # Tài liệu ngắn về cơ chế tư vấn
├── test/
│   ├── ai.spec.ts
│   ├── chat-memory.spec.ts
│   ├── money.spec.ts
│   ├── product-search.spec.ts
│   └── commerce.integration.ts
├── .env.example
├── .gitignore
├── .prettierrc.json
├── compose.yaml
├── jest.config.cjs
├── jest.integration.config.cjs
├── package.json
├── package-lock.json
├── tsconfig.json
├── VERIFICATION.md
└── README.md
```

Controller nhận HTTP và DTO, service thực thi nghiệp vụ, entity mô tả bảng. Service không phụ thuộc vào request/response Express. Guard xử lý xác thực và quyền truy cập. Module giới hạn phạm vi dependency; chỉ ProductService được export cho AI. Migration quản lý schema, `synchronize` luôn tắt.

## 2. Chạy dự án

Cần Node.js 22 trở lên, npm, Docker Compose hoặc một PostgreSQL có sẵn. Lệnh dưới đây chạy từ thư mục `nest-commerce` trong PowerShell.

```powershell
npm ci
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Dán chuỗi ngẫu nhiên vừa tạo vào `JWT_SECRET` trong `.env`. Điền `OPENAI_API_KEY` để dùng chatbot và chọn `OPENAI_MODEL` hỗ trợ Responses API + Structured Outputs. Giá trị mẫu là `gpt-4.1-mini`; model khả dụng phụ thuộc tài khoản của bạn. Không đưa `.env` vào Git hoặc frontend.

Nếu cần admin ban đầu, đặt `SEED_ADMIN_EMAIL` và `SEED_ADMIN_PASSWORD` (ít nhất 10 ký tự, tối đa 72 byte UTF-8). Seed không đổi mật khẩu hoặc nâng quyền một email đã tồn tại; nếu không cấu hình mật khẩu thì chỉ thêm sản phẩm mẫu.

```powershell
docker compose up -d
npm run migration:run
npm run seed
npm run start:dev
```

API: `http://localhost:3000/api`. Kiểm tra `GET /api/health`.

Trong môi trường development, mở Swagger tại `http://localhost:3000/api/docs` để bấm **Try it out** và **Execute**. OpenAPI JSON nằm tại `/api/docs-json`. Đăng nhập, sao chép `accessToken`, rồi bấm **Authorize** để dùng các API cần xác thực. Swagger tắt khi `NODE_ENV=production`. Khi chạy build:

```powershell
npm run build
npm start
```

Có thể dùng PostgreSQL riêng bằng cách đổi `DATABASE_URL`. Với database từ xa, thiết lập kết nối TLS theo nhà cung cấp trong URL/cấu hình driver và dùng tài khoản database phù hợp. Migration đầu tiên dùng `pgcrypto`; tài khoản migration cần quyền tạo extension đó hoặc DBA cài sẵn.

Nếu không muốn Redis, để `REDIS_URL=`. Memory hoạt động thật, có TTL và giới hạn số phiên; phù hợp một tiến trình. Khi khởi động lại server, lịch sử Memory bị mất. Nếu đã cấu hình Redis mà Redis lỗi, API trả 503, không tự chuyển sang Memory làm phân tán lịch sử.

## 3. API và phân quyền

| Method | Đường dẫn | Quyền | Nội dung |
|---|---|---|---|
| GET | /api/health | Public | Liveness của API |
| POST | /api/auth/register | Public | Đăng ký Customer, trả JWT |
| POST | /api/auth/login | Public | Đăng nhập, trả JWT |
| POST | /api/auth/logout | Đã đăng nhập | Thu hồi mọi JWT của tài khoản |
| PATCH | /api/auth/users/:id/role | Admin | Đổi role: admin/staff/customer |
| GET | /api/products | Public | q, category, minPrice, maxPrice, page, limit |
| GET | /api/products/:id | Public | Chi tiết sản phẩm đang hoạt động |
| POST | /api/products | Admin, Staff | Tạo sản phẩm |
| PATCH | /api/products/:id | Admin, Staff | Cập nhật sản phẩm |
| DELETE | /api/products/:id | Admin | Ngừng bán, giữ dữ liệu lịch sử |
| GET | /api/cart | Đã đăng nhập | Giỏ hàng của chính mình |
| PUT | /api/cart/items | Đã đăng nhập | Đặt số lượng tuyệt đối cho một sản phẩm |
| DELETE | /api/cart/items/:productId | Đã đăng nhập | Xóa dòng giỏ hàng |
| POST | /api/orders/checkout | Đã đăng nhập | Tạo đơn từ giỏ hàng của chính mình |
| GET | /api/orders | Đã đăng nhập | Customer xem đơn mình; Staff/Admin xem tối đa 100 đơn mới nhất |
| GET | /api/orders/:id | Chủ đơn, Staff, Admin | Chi tiết và snapshot các mặt hàng |
| PATCH | /api/orders/:id/status | Staff, Admin | confirmed → shipped → delivered |
| POST | /api/ai/chat | Đã đăng nhập | userId bắt buộc trùng chủ JWT |

Header xác thực: `Authorization: Bearer <accessToken>`. JWT mặc định hết hạn sau 900 giây; logout tăng `tokenVersion`. Guard đọc role hiện tại từ DB, vì vậy việc đổi quyền có hiệu lực ngay. Bản này dùng access token, chưa có refresh-token endpoint; sau khi token hết hạn, đăng nhập lại.

DTO từ chối field lạ, giá/số lượng âm, UUID lỗi và tin chat chỉ có khoảng trắng. Password được bcrypt hash với cost 12 và giới hạn 72 byte. Không trả password hash ra API. Rate limit mặc định 100 request/phút/IP; register 5, login 10, AI 15. Rate limiter hiện dùng Memory, cần shared storage nếu triển khai nhiều instance. Nếu đặt sau reverse proxy, cấu hình trusted proxy theo đúng hạ tầng để xác định IP khách.

### Ví dụ chạy xuyên suốt bằng PowerShell

```powershell
$base = 'http://localhost:3000/api'
$account = @{
  email = 'customer@example.com'
  password = 'customer-password-123'
} | ConvertTo-Json

$auth = Invoke-RestMethod -Method Post -Uri "$base/auth/register" `
  -ContentType 'application/json' -Body $account
# Nếu đã đăng ký: dùng /auth/login với cùng body.
$headers = @{ Authorization = "Bearer $($auth.accessToken)" }

$catalog = Invoke-RestMethod -Uri "$base/products?q=giay"
$productId = $catalog.items[0].id
$cartBody = @{ productId = $productId; quantity = 1 } | ConvertTo-Json
Invoke-RestMethod -Method Put -Uri "$base/cart/items" -Headers $headers `
  -ContentType 'application/json' -Body $cartBody

# Tạo một key cho mỗi lần đặt hàng. Retry cùng lần đặt hàng phải giữ nguyên key.
$checkoutBody = @{ idempotencyKey = [guid]::NewGuid().ToString() } | ConvertTo-Json
$order = Invoke-RestMethod -Method Post -Uri "$base/orders/checkout" -Headers $headers `
  -ContentType 'application/json' -Body $checkoutBody

$sessionId = [guid]::NewGuid().ToString()
$chatBody = @{
  userId = $auth.user.id
  sessionId = $sessionId
  message = 'Tôi muốn mua giày thể thao nam dưới 700 nghìn'
} | ConvertTo-Json
$answer = Invoke-RestMethod -Method Post -Uri "$base/ai/chat" -Headers $headers `
  -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($chatBody))
$answer

# Giữ nguyên sessionId để AI nhớ giới tính, loại sản phẩm và ngân sách.
$followUp = @{
  userId = $auth.user.id
  sessionId = $sessionId
  message = 'Có màu đen không?'
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$base/ai/chat" -Headers $headers `
  -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($followUp))
```

Một response chat thành công có HTTP 200 và cấu trúc sau (nội dung lời tư vấn thay đổi theo model):

```json
{
  "sessionId": "30000000-0000-4000-8000-000000000001",
  "text": "Bạn có thể tham khảo Giày thể thao nam Urban, giá 650.000 VND. Bạn thích màu đen chứ?",
  "productIds": ["10000000-0000-4000-8000-000000000001"],
  "products": [
    {
      "id": "10000000-0000-4000-8000-000000000001",
      "name": "Giày thể thao nam Urban",
      "description": "Giày nam màu đen, đế cao su, phù hợp đi bộ hằng ngày.",
      "price": 650000,
      "stock": 20,
      "category": "Giày",
      "tags": ["nam", "giày thể thao", "sneaker", "đen", "đi bộ"],
      "isActive": true,
      "createdAt": "2026-11-05T00:00:00.000Z",
      "updatedAt": "2026-11-05T00:00:00.000Z"
    }
  ]
}
```

Đây là ví dụ minh họa contract, không phải kết quả gọi OpenAI thật trong lần bàn giao. Khi cần hỏi thêm, `productIds`/`products` có thể rỗng. Frontend lấy giá/tồn kho và thẻ sản phẩm từ `products` do server truy vấn, không tách các giá trị đó từ lời thoại.

## 4. Cơ chế “Khách nhắn → AI hiểu → Database → Đề xuất”

1. **Nhận tin và xác thực:** `AiController` nhận `userId`, `message`, `sessionId`. JWT guard xác định người dùng; `AiService` từ chối nếu client dùng userId khác, kể cả Staff/Admin.
2. **Nạp lịch sử:** `ChatMemoryService` dùng key `chat:<userId>:<sessionId>`. Lịch sử tối đa 24 tin, tương đương 12 lượt hỏi đáp, TTL mặc định 30 phút kể từ lần xử lý thành công. Hai user có cùng sessionId vẫn tách biệt. Session lock từ chối tin đồng thời bằng HTTP 409; Redis có lock token và fencing trước khi ghi.
3. **Hiểu nhu cầu:** `LlmService` gọi OpenAI Responses API với `NeedsSchema`. LLM đọc lịch sử và câu mới, trích keywords, category, minPrice/maxPrice nguyên VND và một câu hỏi làm rõ nếu cần. Không có loại sản phẩm thì server hỏi lại thay vì quét toàn bộ catalog để đề xuất tùy tiện.
4. **Truy vấn database:** `ProductService.search()` chuẩn hóa chữ có dấu/không dấu, tìm keywords trong tên, mô tả, danh mục và tags. Các từ khóa kết hợp AND, lọc khoảng giá, chỉ lấy sản phẩm đang bán và tồn kho dương; tối đa 12 ứng viên, sắp xếp giá tăng dần. Mọi giá trị đều là bound parameters. Model không được viết hoặc chạy SQL.
5. **Tạo lời tư vấn:** server chỉ gửi catalog ứng viên cho lượt gọi LLM thứ hai. `SALES_SYSTEM_INSTRUCTION` yêu cầu không bịa sản phẩm/giá/tính năng, không làm theo chỉ dẫn ẩn trong mô tả sản phẩm, đặt một câu hỏi gợi mở khi cần và chỉ trả `{ text, productIds }`. Responses API dùng `zodTextFormat` với strict JSON schema; server parse lại bằng Zod.
6. **Kiểm tra kết quả:** loại ID trùng; nếu có bất kỳ ID ngoài catalog thì bỏ toàn bộ lời tư vấn đó và trả câu hỏi an toàn. Server đọc lại sản phẩm theo ID, kiểm tra còn bán/còn hàng và thay đổi dữ liệu. Giá hoặc thông tin thay đổi thì bỏ tư vấn cũ. Response đính kèm entity từ DB theo đúng thứ tự ID.
7. **Ghi nhớ:** chỉ ghi cả tin khách và câu trả lời cuối cùng khi lượt xử lý thành công. Lượt tiếp theo dùng cùng sessionId để giữ ngữ cảnh; lỗi OpenAI hoặc Redis không ghi dở hội thoại.

Ví dụ: “giày thể thao nam dưới 700 nghìn” được hiểu thành các từ khóa sản phẩm, đối tượng nam và `maxPrice = 700000`. Database tìm trong catalog thật; mẫu giày nam Urban 650.000 VND có thể được đưa vào catalog. Lượt sau “màu đen nhé” được hiểu cùng với nhu cầu trước đó.

Đây là **retrieval + prompt + conversation memory**, không phải huấn luyện lại trọng số model. Tìm kiếm hiện là lexical trên keywords/tags, chưa dùng embeddings/pgvector. Có thể thêm từ đồng nghĩa vào tags; khi catalog lớn nên thay query LIKE bằng chỉ mục phù hợp hoặc pgvector. Không có fallback giả lập câu trả lời nếu thiếu API key; endpoint trả HTTP 503, còn phần thương mại vẫn hoạt động.

Ranh giới kiểm soát: server kiểm chứng cứng ID và dữ liệu của sản phẩm đính kèm. System prompt hạn chế nội dung bịa trong lời thoại nhưng không chứng minh mọi câu văn tự do của LLM đều chính xác. Nếu cần bảo đảm tuyệt đối mọi phát biểu về giá/tính năng, dùng lời thoại theo template từ entity thay cho prose tự do của model. Tồn kho vẫn có thể thay đổi sau response; checkout luôn kiểm tra lại.

## 5. Transaction đặt hàng

- Giỏ hàng chỉ lưu số lượng mong muốn; thêm giỏ không giữ tồn kho và không nhận giá/tổng tiền từ client.
- Giỏ tối đa 50 mặt hàng; mỗi mặt hàng 1–1.000 đơn vị. Giá mỗi sản phẩm 0–1 tỷ VND; tổng đơn tối đa 1.000 tỷ VND. Giá/tổng tiền dùng số nguyên an toàn, cột PostgreSQL bigint; transformer đổi bigint sang number trong các giới hạn đã kiểm soát.
- Mọi sửa giỏ và checkout khóa hàng User trước. Checkout đọc giỏ, sau đó khóa Product theo thứ tự UUID cố định bằng `SELECT ... FOR UPDATE`, kiểm tra tồn kho, giảm tồn kho, lưu Order/OrderItem snapshot và xóa giỏ trong **cùng transaction**.
- Dùng duy nhất EntityManager của transaction. Bất kỳ lỗi nào cũng rollback cả tồn kho, đơn và việc xóa giỏ. Không gọi LLM hoặc dịch vụ mạng trong transaction.
- Unique `(userId, idempotencyKey)` kết hợp user lock bảo đảm retry/simultaneous retry trả lại đơn cũ và không trừ hàng lần nữa. Một lần mua mới phải có key mới.
- OrderItem chụp tên/đơn giá lúc đặt. Xóa sản phẩm là ngừng bán để giữ tham chiếu giỏ và đơn lịch sử.
- Checkout hiện là xác nhận đơn hàng kiểu COD/manual: trạng thái `confirmed` **không có nghĩa đã thu tiền**. Chưa tích hợp payment gateway, phí vận chuyển, thuế, hoàn tiền hay hủy đơn. Nếu thêm thanh toán trực tuyến, cần payment intent/webhook được xác minh và idempotency; không cho client tự khai “đã thanh toán”.

## 6. Kiểm tra mã nguồn

```powershell
npm run typecheck
npm run build
npm test
npm run format:check
npm audit --omit=dev
```

Integration test chạy trên database thử riêng có tên kết thúc `_test`, không dùng database đang phục vụ người dùng. Test chạy migration nếu cần và thêm dữ liệu có UUID riêng, không truncate database.

```powershell
# Với PostgreSQL từ compose đang chạy:
docker compose exec postgres createdb -U commerce commerce_test
$env:TEST_DATABASE_URL = 'postgresql://commerce:commerce_dev@localhost:5432/commerce_test'
npm run test:integration
```

Các test AI dùng mock provider để kiểm chứng logic một cách xác định, không tiêu tốn API. Xem `VERIFICATION.md` để biết những bước đã thực sự chạy và giới hạn xác minh.

## 7. Tài liệu kỹ thuật tham chiếu

- [OpenAI: Structured Outputs và Responses API](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
- [OpenAI Node SDK: Structured Outputs](https://github.com/openai/openai-node/blob/main/docs/structured-outputs.md)
- [TypeORM: Transactions và transactional EntityManager](https://typeorm.io/docs/transactions/)

Dependency lockfile đi kèm để tái lập cài đặt. Override `multer` và `typeorm > glob` chọn phiên bản đã vá thay vì nâng major framework/ORM ngoài phạm vi; build và kiểm thử database được chạy với dependency đã resolve. Tài khoản database, secrets và cấu hình truy cập mạng cho môi trường triển khai cần được cấp riêng.
