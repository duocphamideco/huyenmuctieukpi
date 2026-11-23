# HUYỀN QUẢN LÝ KPI - KHÁCH HÀNG · bản điện thoại (v1.0.0)

Ứng dụng web cài lên màn hình chính (PWA), chạy trên **Chrome Android** và **Safari iPhone/iPad**.
Dùng chung lõi với bản máy tính (Huyền KPI 1.5.0 trong IDECO SUITE).

## 1. Đưa lên GitHub Pages (làm 1 lần)
1. Trên GitHub tài khoản **duocphamideco**, tạo kho mới tên **`huyenkpi`** (Public).
2. Bấm **Add file → Upload files**, kéo toàn bộ NỘI DUNG thư mục `huyenkpi` vào: `index.html`, `app.js`, `app.css`, … cùng 2 thư mục `lib/` và `icons/`. Sau đó bấm **Commit changes**.
3. Vào **Settings → Pages**. Ở mục Source chọn **Deploy from a branch → main → / (root)**, rồi bấm **Save**.
4. Chờ 1–2 phút, rồi mở **https://duocphamideco.github.io/huyenkpi/**

> Ứng dụng BẮT BUỘC nằm trên `duocphamideco.github.io`, cùng tên miền với 2 website Dashboard. Chỉ khi đó Huyền mới mở, đăng nhập và tự bấm được bên trong 2 website. Đặt ở tên miền khác thì Huyền chỉ đọc dữ liệu, không điều khiển được màn hình.

## 2. Cài lên điện thoại
- **Android (Chrome):** mở link → bấm **⋮** → **Cài đặt ứng dụng / Thêm vào Màn hình chính**.
- **iPhone (Safari):** mở link → bấm nút **Chia sẻ ⬆️** → **Thêm vào MH chính**.
Biểu tượng logo IDECO xuất hiện trên màn hình chính, mở ra toàn màn hình như app thật.

## 3. Sử dụng
- Đăng nhập: `congtyideco@2026` (có nút 👁, có ô ghi nhớ). Cài đặt ⚙️: `minhtriett1973`.
- Cài đặt (key AI, mật khẩu website, mật khẩu BGĐ, mẫu lệnh riêng) **dùng chung Firebase** với bản máy tính, không phải nhập lại.
- **Chat:** chọn skill AI-AGENT HOẠT ĐỘNG BH hoặc AI-AGENT MỤC TIÊU KPI, rồi hỏi bằng chữ hoặc bấm 🎤 để nói. Nút 📋 Mẫu lệnh có 21 mẫu soạn sẵn.
- **Màn hình:** xem trang website mà Huyền đang mở và lọc (bảng Module 02, Báo cáo giao dịch…), có nút ⟳ để tải lại.
- **Excel:** file tự tải về. Bấm **📤 Mở / Chia sẻ** để gửi qua Zalo hoặc lưu vào Tệp (iPhone).

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
