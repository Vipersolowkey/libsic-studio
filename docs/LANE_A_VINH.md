# Phần nhạc — Vinh

Ngày bàn giao: 17/11/2026. Nhánh: `lane-a-music`. Đây là phần triển khai để Tony review; chưa tự merge vào `main`.

## Đã triển khai

| Task | Kết quả |
| --- | --- |
| 3a | Model Track/Cd, 12 bài nhạc gốc và 3 CD chính thức, seed có thể chạy lại |
| 5a | GET danh sách/chi tiết bài hát và CD |
| 8 | Nối CD API vào hologram có sẵn; Play/Pause, Previous/Next, seek, âm lượng, lặp CD |
| 9a | Tạo/sửa/xóa CD, hash edit key, từ chối CD rỗng, bài không tồn tại, bài trùng và quá 30 bài |
| 10a | `/music`: chọn bài, đổi thứ tự, đặt tên, tạo CD, lưu danh sách CD của trình duyệt |
| 11 | Swagger/OpenAPI cho Tracks và CDs, kiểm tra schema phản hồi |
| 13 | Loading/error/retry, CD đã xóa, khóa sửa khi storage bị chặn, bố cục điện thoại |

Phần tranh, chuyển động và trang trí phòng của Tony được dùng lại. Player trong phòng là hologram hiện có; trang CD có thêm đĩa quay.

## Cách chạy

1. Dùng Node 26. Trong `api`: `npm ci`, sao chép `.env.example` thành `.env` và điền `MONGODB_URI`.
2. Chạy `npm run seed:scenes` và `npm run seed:music`, sau đó `npm start`.
3. Trong `client`: `npm ci`, `npm run dev`. API mặc định ở cổng 4000; đổi bằng `VITE_API_URL` nếu cần.
4. Vào `/new`, chọn CD ở CD shelf, bấm vật phát nhạc trong phòng để mở player và bấm Play.
5. Vào `/music` để tạo CD. Dùng share link để mở lại hoặc đưa vào phòng; Save room giữ mã CD cùng phòng.

12 bản nhạc dài khoảng 43–67 giây, được tổng hợp từ sóng âm, không dùng sample. Chúng là nhạc mẫu cho đồ án, chưa phải một thư viện album thương mại. Mã tái tạo và credit ở `docs/art-tools/make_music_tracks.py` và `client/public/audio/music/CREDITS.md`.

## API chính

| Phương thức | Đường dẫn | Công dụng |
| --- | --- | --- |
| GET | `/api/tracks`, `/api/tracks/:id` | Thư viện bài hát |
| GET | `/api/cds` | Chỉ danh sách CD chính thức |
| GET | `/api/cds/:code` | CD đầy đủ và bài hát theo đúng thứ tự |
| POST | `/api/cds` | `{ title, trackIds }` → `{ cd, editKey }` |
| PUT | `/api/cds/:code` | Sửa tên/danh sách bài; cần `x-edit-key` |
| DELETE | `/api/cds/:code` | Xóa CD tự tạo; cần `x-edit-key` |

CD chính thức không sửa/xóa qua API. CD tự tạo không nằm trên kệ công khai; ai có code vẫn đọc được. Edit key chỉ trả lúc tạo, database giữ hash. Trình duyệt nhớ key bằng localStorage; xóa dữ liệu trình duyệt sẽ mất quyền sửa nếu không giữ key ở nơi khác.

## Kiểm chứng

Trong `api`: `npm test -- --runInBand`. Trong `client`: `npm test`, `npm run build`.

Sau khi API và MongoDB chạy: `npm run try:music`. Nếu API dùng cổng khác, đặt `API_URL` trước. Script tạo CD/phòng thử, kiểm tra quyền và mã lỗi, rồi xóa đúng những bản ghi nó vừa tạo. Không chạy script này trên database nộp bài nếu không muốn có thao tác ghi thử.

GitHub Actions chạy kiểm thử API/client và build client bằng Node 26. Kiểm thử API thông thường dùng model giả; `try:music` bổ sung kiểm chứng với MongoDB thật.

## Triển khai API — phần còn cần cấu hình của nhóm

API đã có `Dockerfile` chạy bằng user `node`, không đóng gói `.env`. Build từ thư mục `api`: `docker build -t libsic-api .`. Host chạy `node src/server.js`; đặt `MONGODB_URI`, `PORT` (mặc định 4000), `NODE_ENV=production`. Có thể dùng Node trực tiếp với `npm ci --omit=dev` và `npm start`.

Chạy seed scenes/music vào database đích một lần trước demo. Không xóa dữ liệu custom khi seed lại. Client phải chứa toàn bộ `public/audio/music/`; đặt `VITE_API_URL` thành địa chỉ API HTTPS trước khi build. Cấu hình SPA rewrite để `/cd/:code`, `/r/:code` và `/music` mở trực tiếp được; `client/vercel.json` đã có rewrite.

Chưa có credential Atlas hoặc host triển khai trong checkout nên chưa xác nhận URL công khai. Cần kiểm tra health, Swagger, tạo CD/phòng và phát MP3 trên URL thật, rồi thử từ điện thoại trước khi đánh dấu Task 12 hoàn thành.

## Checklist review của Tony

- Tạo CD một bài và nhiều bài, đổi thứ tự, mở link từ trình duyệt khác.
- Xác nhận người nhận link nghe được nhưng không sửa nếu thiếu key.
- Sửa/xóa CD của mình, xác nhận CD chính thức không sửa được.
- Lưu phòng với CD, mở lại; phòng vẫn mở được khi CD bị xóa.
- Xác nhận cảnh và đồ trang trí cũ vẫn hoạt động.
- Review rồi mới tick các task và merge PR theo quy ước nhóm.
