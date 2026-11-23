# HUYỀN QUẢN LÝ KPI - KHÁCH HÀNG · bản điện thoại (v1.0.6)

Ứng dụng web cài lên màn hình chính (PWA), chạy trên **Chrome Android** và **Safari iPhone/iPad**.
Dùng chung lõi với bản máy tính (Huyền KPI 1.5.0 trong IDECO SUITE).

## 1. Đưa lên GitHub Pages (làm 1 lần)
1. Trên GitHub tài khoản **duocphamideco**, tạo kho mới tên **`huyenkpi`** (Public).
2. Bấm **Add file → Upload files** → **choose your files** → chọn **TẤT CẢ 29 file** trong thư mục `huyenkpi` (từ v1.0.4 không còn thư mục con, logo nằm ngay cạnh `index.html`). Bấm **Commit changes**.
   - Bản cũ có thư mục `icons/` và `lib/`: nếu chỉ chọn file thì GitHub BỎ QUA thư mục con → thiếu logo → Chrome cài ra chữ "H". Đây là nguyên nhân thường gặp nhất.
   - Kiểm tra: mở https://duocphamideco.github.io/huyenkpi/huyenkpi-icon-512.png phải thấy logo. Nếu thiếu file, khi mở app sẽ hiện khung đỏ "Thiếu file logo trên GitHub".
3. Vào **Settings → Pages**. Ở mục Source chọn **Deploy from a branch → main → / (root)**, rồi bấm **Save**.
4. Chờ 1–2 phút, rồi mở **https://duocphamideco.github.io/huyenkpi/**

> Ứng dụng BẮT BUỘC nằm trên `duocphamideco.github.io`, cùng tên miền với 2 website Dashboard. Chỉ khi đó Huyền mới mở, đăng nhập và tự bấm được bên trong 2 website. Đặt ở tên miền khác thì Huyền chỉ đọc dữ liệu, không điều khiển được màn hình.

## 2. Cài lên điện thoại
- **Android (Chrome):** mở link → bấm **⋮** → **Cài đặt ứng dụng / Thêm vào Màn hình chính**.
- **Đã cài bản cũ ra chữ "H":** (1) nhấn giữ biểu tượng cũ → **Gỡ cài đặt / Xóa**; (2) Chrome → **⋮ → Cài đặt → Cài đặt trang web → Tất cả trang web → duocphamideco.github.io → Xóa dữ liệu**; (3) đóng hẳn Chrome, mở lại link, chờ 5 giây, rồi mới bấm **⋮ → Cài đặt ứng dụng**.
- Phải mở bằng **Chrome** (không mở từ Zalo / Facebook, vì trình duyệt trong app không cài được logo).
- **iPhone (Safari):** mở link → bấm nút **Chia sẻ ⬆️** → **Thêm vào MH chính**.
Biểu tượng logo IDECO xuất hiện trên màn hình chính, mở ra toàn màn hình như app thật.

## 3. Sử dụng
- Đăng nhập: `congtyideco@2026` (có nút 👁, có ô ghi nhớ). Cài đặt ⚙️: `minhtriett1973`.
- Cài đặt (key AI, mật khẩu website, mật khẩu BGĐ, mẫu lệnh riêng) **dùng chung Firebase** với bản máy tính, không phải nhập lại.
- **Chat:** chọn skill AI-AGENT HOẠT ĐỘNG BH hoặc AI-AGENT MỤC TIÊU KPI, rồi hỏi bằng chữ hoặc bấm 🎤 để nói. Nút 📋 Mẫu lệnh có 21 mẫu soạn sẵn.
- **Màn hình:** xem trang website mà Huyền đang mở và lọc (bảng Module 02, Báo cáo giao dịch…), có nút ⟳ để tải lại.
- **Excel:** file tự tải về. Bấm **📤 Mở / Chia sẻ** để gửi qua Zalo hoặc lưu vào Tệp (iPhone).

## 3b. 💰 Báo giá (gộp từ HUYỀN MARKETING 2)
- Tab **💰 Báo giá**: tích sản phẩm (tìm theo tên/mã, lọc nhóm) → chọn mức **Đầy đủ / Từ 6 hộp / Từ 12 hộp+** → tìm khách (danh sách khách đã lưu của HUYỀN MARKETING) → sửa lời nhắn → **📗 Tạo file báo giá Excel**.
- **📤 Gửi Zalo**: bảng chia sẻ của máy hiện ra → chọn **Zalo** → chọn khách → Gửi. Lời nhắn đã chép sẵn, nếu Zalo không tự điền thì giữ ô chat → Dán.
- **💬 Mở chat Zalo khách**: mở thẳng cuộc trò chuyện Zalo theo SĐT của khách.
- **🌐 Website**: mở nguyên trang bảng báo giá để chọn sản phẩm như trên máy tính, bấm **✓ Xong** để mang danh sách đã chọn về.
- File Excel do chính nút "Xuất báo giá Excel" của website tạo (đúng mẫu, đúng giá, như HUYỀN MARKETING 2). Mật khẩu Cài đặt 2 của website: `congtyideco@2026`, tự thử thêm `congtyideco2026`.
- Hỏi trong Chat cũng được: *"Gửi báo giá UVS Oral Gel, Garcinar từ 12 hộp cho khách hàng KH001 qua Zalo, tin nhắn: …"* → Huyền tạo file và hiện nút **📤 Gửi Zalo** ngay trong chat (điện thoại không cho ứng dụng tự bấm gửi trong Zalo, anh/chị bấm 1 lần để gửi).
- Chat còn là **chatbot đa năng**: hỏi kiến thức thuốc, soạn tin nhắn, dịch, tính toán… Huyền trả lời luôn, không cần mở website.

## 3c. 📋 Mẫu lệnh gửi báo giá · 📎 Đính kèm · ⏰ Giờ chat tự do
- **📋 Mẫu lệnh → nhóm "💰 Gửi báo giá Zalo"**: gửi báo giá sản phẩm cho khách · gửi FILE bảng giá đính kèm (Excel/PDF/ảnh) · gửi SP đang chọn · gửi cả nhóm/danh mục · gửi toàn bộ bảng giá · chỉ xuất file · soạn lời nhắn Zalo. Chỉ cần điền Sản phẩm, Mức giá, Khách hàng, Tin nhắn (có gợi ý tên).
- **📎 Đính kèm** (nút cạnh 🎤): ảnh chụp, PDF, Excel/CSV, Word, văn bản — tối đa 6 tệp, mỗi tệp 15 MB. Huyền đọc ảnh/PDF, nạp Excel để tính đúng số liệu. Chỉ đính kèm không gõ chữ → Huyền tự tóm tắt + đề xuất.
- **⏰ Giờ chat tự do** (⚙️ Cài đặt): chọn ngày + giờ. Ngoài giờ Huyền chỉ trả lời việc công ty, câu hỏi tự do trả lời tại máy, không gọi AI → không tốn credit Kie. Dòng trạng thái màu xanh/cam ở tab Chat cho biết đang trong hay ngoài giờ.

## 4. Lưu ý
- Khi Huyền đang làm, giữ màn hình sáng và không chuyển sang app khác. iPhone/Android sẽ tạm dừng trang khi khóa máy.
- Phân tích kế hoạch tuần BGĐ chạy được nhưng chậm hơn máy tính, vì trang Kế hoạch & Báo cáo khá nặng.
- Huyền chỉ ghi dữ liệu khi được yêu cầu rõ. Huyền không bấm Xóa, Tải lên hay Reset.
- Cập nhật phiên bản: chỉ cần upload đè file mới lên kho `huyenkpi`. Ứng dụng tự lấy bản mới khi có mạng.

## 5. Cấu trúc
| File | Vai trò |
|---|---|
| `index.html`, `app.css`, `app.js` | Giao diện điện thoại: Chat · Màn hình · Cài đặt |
| `core.js`, `agent.js`, `config.js`, `templates.js` | Lõi Huyền 6.1 (chung với bản máy tính) |
| `mobile-bridge.js`, `pagectl.js` | Mở 2 website trong ứng dụng, tự đăng nhập, bấm, lọc, đọc |
| `worker.js` | Chạy phần phân tích dữ liệu tách riêng khỏi giao diện |
| `shim.js` | Thay API extension bằng API web |
| `sw.js`, `manifest.webmanifest`, `icons/` | Cài như ứng dụng, mở nhanh |
