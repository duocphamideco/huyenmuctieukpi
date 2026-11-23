/* HUYỀN DASHBOARD — cấu hình mặc định.
 * Cài đặt dùng chung cho mọi máy: lưu Firebase Realtime DB (HDA_SHARED) + bản sao trên máy. */
'use strict';

const HDA_DB = {
  quetbarcode: 'https://quetbarcode-2361a-default-rtdb.firebaseio.com',   // Module 02 Quản lý đặt hàng
  chamsockh:   'https://chamsockh-a1bb7-default-rtdb.firebaseio.com',     // Báo cáo giao dịch khách hàng
  kehoach:     'https://kehoachnew-532cf-default-rtdb.firebaseio.com',    // Kế hoạch & báo cáo tuần/tháng
  kpi:         'https://kpikdchuyenvien-default-rtdb.firebaseio.com',     // KPI tổ chức
  muctieu:     'https://chuoint-2df9d-default-rtdb.firebaseio.com',       // Mục tiêu kinh doanh
  baocaothang: 'https://dungchung-c6546-default-rtdb.firebaseio.com',     // Báo cáo cuối tháng (VoiceReport) + Thông báo BH (Module 01)
  bevy:        'https://bevy-3c9da-default-rtdb.firebaseio.com',          // Module 05 Doanh thu kỳ trước vs kỳ này
  qldulieukh:  'https://qldulieukh-default-rtdb.firebaseio.com',          // Module 03 KH chưa đặt lại SP kỳ trước
  phantich:    'https://phantich-a94a3-default-rtdb.firebaseio.com',      // Module 04 KH không lấy đơn kỳ trước
  khuyenmai:   'https://minhtriet-bb978-default-rtdb.firebaseio.com'      // Chương trình khuyến mại + chính sách SP (file tổng / Huyền Sales)
};

/** Nơi lưu Cài đặt dùng chung (CSDL của website dashboard-ideco · Module 02). */
const HDA_SHARED = { db: 'quetbarcode', path: 'huyenDashboardAgent/settings' };
const HDA_KIE_KEY = 'ba484ce61313ee513b360100df604c73';

/** Các mô-đun trên 2 website (khớp mã nguồn hiện tại của Minh). */
const HDA_MODULES = {
  bh: [
    { id: 'notice', num: '01', name: 'Thông báo & hỗ trợ bán hàng' },
    { id: 'orders', num: '02', name: 'Quản lý đặt hàng trong kỳ (hoạt động đặt hàng, NV phụ trách, KH đã/chưa đặt)' },
    { id: 'dropped-products', num: '03', name: 'KH chưa đặt lại sản phẩm cũ các kỳ trước' },
    { id: 'no-order', num: '04', name: 'KH không lấy đơn kỳ trước' },
    { id: 'revenue-compare', num: '05', name: 'Doanh thu kỳ trước vs kỳ này' },
    { id: 'period-end', num: '06', name: 'Phân tích kinh doanh cuối kỳ' },
    { id: 'soan-thao-phan-tich', num: '07', name: 'IDECO AI · Soạn thảo & phân tích' }
  ],
  kpi: [
    { id: 'apps/MUC_TIEU_KINH_DOANH.html', num: '01', name: 'Mục tiêu kinh doanh' },
    { id: 'apps/KPI_TO_CHUC.html', num: '02', name: 'KPI tổ chức' },
    { id: 'apps/KE_HOACH.html', num: '03', name: 'Kế hoạch & Báo cáo' },
    { id: 'apps/BAO_CAO_GIAO_DICH_KH.html', num: '04', name: 'Báo cáo giao dịch khách hàng (khai báo real time)' },
    { id: 'apps/AI_AGENT_KE_HOACH_BAO_CAO_V17.html', num: '05', name: 'Trung tâm AI Agent V17 (cần mật khẩu quản trị)' }
  ]
};

/** Bộ dữ liệu Huyền đọc trực tiếp (chỉ ĐỌC). */
const HDA_DATASETS = {
  orders_customers: {
    skill: 'bh', db: 'quetbarcode', path: 'customerManagement/customers', live: 'orders',
    desc: 'Danh sách KH của Module 02 Quản lý đặt hàng trong kỳ. Trường: code (mã KH), name (tên KH), contact (người liên hệ), phone, email, area (khu vực), address, staff (NV phụ trách, có thể dạng "Tên - Bộ phận"), medicineCategory (danh mục thuốc), ordered (true = đã đặt non-drugs trong kỳ), medicineOrdered (true = đã đặt thuốc trong kỳ), note (báo cáo - ghi chú), periodOrder. KH CHƯA ĐẶT HÀNG trong kỳ = !ordered && !medicineOrdered.'
  },
  orders_today: {
    skill: 'bh', db: 'quetbarcode', path: 'customerManagement/orderAlertDailyV7/{date}', flatten: 'daily',
    desc: 'Nhật ký KH được tick ĐÃ ĐẶT HÀNG theo ngày (ghi nhận 08:00–16:00, Thứ 2–Thứ 7). Mỗi dòng: date, staffName (NV), customerId (mã/tên KH), customerName, at (thời điểm ms). Tham số date "YYYY-MM-DD" (mặc định hôm nay).'
  },
  orders_staff_assign: {
    skill: 'bh', db: 'quetbarcode', path: 'customerManagement/staffAssign',
    desc: 'Sổ giao NV phụ trách: _key = mã KH đã chuẩn hóa, staff = NV được giao, at, by.'
  },
  gdkh_customers: {
    skill: 'kpi', db: 'chamsockh', path: 'customers',
    desc: 'Khai báo GIAO DỊCH KHÁCH HÀNG real time (module Báo cáo giao dịch KH). Trường: id, salesRep (NV khai báo), transactionDate ("YYYY-MM-DD" ngày giao dịch), name (KH), contactPerson, phone, address, province, type (loại KH), status (trạng thái), report (nội dung báo cáo), customerFeedback, appointments[] (lịch hẹn), reportHistory[] ({recordedAt ms, transactionDate, report, status, salesRep}), feedback (góp ý BGĐ {text,by,at,seenAt}), createdAt, updatedAt, firstReportedAt, isCalled, claimedBy. "Hôm nay ai đã khai báo" = bản ghi có transactionDate/updatedAt/createdAt/firstReportedAt hoặc reportHistory[].recordedAt là hôm nay, nhóm theo salesRep.'
  },
  gdkh_staff: { skill: 'kpi', db: 'chamsockh', path: 'staff', desc: 'Danh sách nhân viên của app Báo cáo giao dịch KH (tên, trạng thái khóa...).' },
  gdkh_excel_customers: { skill: 'kpi', db: 'chamsockh', path: 'excelCustomers', desc: 'Danh sách KH tiềm năng upload Excel để khai thác: name, contactPerson, phone, address, claimedBy (NV đã nhận khai thác), fileId.' },
  kpi_boards: { skill: 'kpi', db: 'kpi', path: 'kpiBoards_kd', desc: 'Bảng KPI kinh doanh theo nhân viên/kỳ (KPI tổ chức).' },
  kpi_reviews: { skill: 'kpi', db: 'kpi', path: 'kpiEvaluationReviews_v11/periods', desc: 'Đánh giá KPI theo kỳ (BGĐ duyệt).' },
  weekly_plans: { skill: 'kpi', db: 'kehoach', path: 'weekly_plans', desc: 'Kế hoạch tuần của nhân viên (Kế hoạch & Báo cáo).' },
  monthly_plans: { skill: 'kpi', db: 'kehoach', path: 'ideco_monthly_plans_v1', desc: 'Kế hoạch/báo cáo tháng của nhân viên.' },
  company_goals: { skill: 'kpi', db: 'kehoach', path: 'settings/companyPlanGoalsV1', desc: 'Mục tiêu kế hoạch công ty theo tháng.' },
  executive_reviews: { skill: 'kpi', db: 'kehoach', path: 'huyen_executive_reviews_v1', desc: 'Nhận xét của BGĐ/Huyền theo tháng.' },
  monthly_reports: { skill: 'kpi', db: 'baocaothang', path: 'monthly_reports', desc: 'Báo cáo cuối tháng (VoiceReport) của nhân viên.' },
  goal_broadcast: { skill: 'kpi', db: 'muctieu', path: 'broadcasts/current', desc: 'Thông báo mục tiêu tháng đang phát.' }
};

Object.assign(HDA_DATASETS, {
  rev_current: { skill: 'bh', db: 'bevy', path: 'kpi_data/current', flatten: 'json',
    desc: 'Module 05 · Dữ liệu bán hàng KỲ NÀY (mỗi dòng là 1 dòng file Excel xuất từ ERP). Trường chính: "Khách hàng", "Nhân viên", "Tổng tiền" (số), "Thuốc?" (TRUE = thuốc) + các cột khác của file (sản phẩm, số lượng, ngày… — xem fields khi load).' },
  rev_previous: { skill: 'bh', db: 'bevy', path: 'kpi_data/previous', flatten: 'json',
    desc: 'Module 05 · Dữ liệu bán hàng KỲ TRƯỚC, cùng cấu trúc rev_current. So sánh doanh thu kỳ này/kỳ trước theo NV, KH, thuốc/không thuốc; tìm SP + sản lượng KH đã lấy kỳ trước mà kỳ này không lấy.' },
  rev_excluded: { skill: 'bh', db: 'bevy', path: 'kpi_data/excluded_customers',
    desc: 'Module 05 · Danh sách KH bị loại khỏi so sánh doanh thu (value = tên KH). Module 05 không tính các KH này.' },
  dropped_analysis: { skill: 'bh', db: 'qldulieukh', path: 'customers', flatten: 'dropped',
    desc: 'Module 03 · KH chưa đặt lại SP cũ: mỗi dòng 1 KH: key, name, phone, contactPerson, productsPrev[] (SP đã mua kỳ trước), droppedProducts[] (SP kỳ trước có mà KỲ NÀY KHÔNG lấy), notOrderThisPeriod (true = kỳ này không đặt gì), isNew. Không có số lượng — sản lượng lấy từ rev_previous/noorder_previous.' },
  noorder_current: { skill: 'bh', db: 'phantich', path: 'orders/current',
    desc: 'Module 04 · Đơn hàng kỳ này (dòng đơn từ file Excel; xem fields khi load: thường có khách hàng, sản phẩm, số lượng, thành tiền, nhân viên…).' },
  noorder_previous: { skill: 'bh', db: 'phantich', path: 'orders/previous',
    desc: 'Module 04 · Đơn hàng kỳ trước — dùng để lấy TÊN SẢN PHẨM + SẢN LƯỢNG khách đã lấy kỳ trước.' },
  noorder_analysis: { skill: 'bh', db: 'phantich', path: 'analysis/result',
    desc: 'Module 04 · Kết quả "Phân tích tình hình khách hàng" đã lưu (mỗi KH: doanh thu 2 kỳ, tăng/giảm, khuyến nghị…).' },
  noorder_customers: { skill: 'bh', db: 'phantich', path: 'customers', desc: 'Module 04 · Danh bạ KH (tên, người liên hệ, SĐT, NV).' },
  notices: { skill: 'bh', db: 'baocaothang', path: 'THONGBAO_BANHANG/items', desc: 'Module 01 · Các thông báo / hỗ trợ bán hàng trong kỳ (tiêu đề, nội dung, kỳ, ảnh…).' },
  executive_reviews: { skill: 'kpi', db: 'kehoach', path: 'huyen_executive_reviews_v1', flatten: 'nested2',
    desc: 'Kế hoạch & Báo cáo · CÁC BẢN "Huyền phân tích tổng hợp kế hoạch tuần" của BGĐ đã lưu: month, _key, name, report (nội dung phân tích), createdAt, scope…' }
});
HDA_DATASETS.weekly_plans.desc = 'Kế hoạch TUẦN của từng nhân viên: employeeName, department, creationDate, objective (mục tiêu tuần), days{Thứ…:{tasks:[{name, expectedResult, isCompleted, isContinued, feedback, startDate, endDate}]}}, report (BÁO CÁO CUỐI TUẦN của NV), directorEvaluation (nhận xét BGĐ), directorRating, evaluationStatus, savedReports. Dùng H.planSummary(plan) để tóm tắt.';
HDA_DATASETS.gdkh_customers.desc += ' Lịch hẹn: appointments[{id,date "YYYY-MM-DD",time,content,isCompleted}] — dùng H.appointments(DATA.gdkh_customers) để có danh sách phẳng kèm KH + NV.';

/* CHƯƠNG TRÌNH KHUYẾN MẠI — đọc thẳng Firebase dùng chung với Huyền Sales / file tổng (không cần mở trang ERP, không cần mật khẩu). */
Object.assign(HDA_DATASETS, {
  promotions: { skill: 'bh', db: 'khuyenmai', path: 'ideco_order_promotions/items', flatten: 'promo',
    desc: 'CHƯƠNG TRÌNH KHUYẾN MẠI / KHUYẾN MÃI đơn hàng (nút "🎁 Khuyến mại đơn hàng" của Huyền Sales, dùng chung mọi máy). Mỗi dòng: id, name (tên CT), content (nguyên văn nội dung KM), match[] (nhóm/SP áp dụng), segments[] (đối tượng KH: retail/agent/chain…), ck (% chiết khấu thêm), minQty (SL tối thiểu), from, to ("YYYY-MM-DD"), active, status (Đang chạy / Sắp chạy / Hết hạn / Tạm tắt — đã tính sẵn theo hôm nay), updatedAt, by.' },
  product_policies: { skill: 'bh', db: 'khuyenmai', path: 'ideco_product_policies/list', flatten: 'promo',
    desc: 'CHÍNH SÁCH SẢN PHẨM (file tổng → ⚙ Cài đặt → 📋 Chính sách sản phẩm): chiết khấu / điều kiện theo nhóm SP, có from/to/active/status như promotions. Dùng kèm promotions khi hỏi KM, chiết khấu, chính sách bán hàng.' }
});

/** Mật khẩu đăng nhập dashboard LUÔN được thử (kể cả khi Cài đặt dùng chung chưa có). */
const HDA_BUILTIN_PASS = ['congtyideco@2026', 'congtyideco2026'];

/** Mật khẩu riêng của từng module (đọc từ Firebase của chính module đó khi module hiện màn hình đăng nhập). */
const HDA_MODULE_PASS = {
  'apps/KE_HOACH.html': { db: 'kehoach', path: 'settings/appPassword', defaults: ['ideco2026', 'congtyideco2026', 'congtyideco@2026'] },
  'apps/BAO_CAO_GIAO_DICH_KH.html': { db: 'chamsockh', path: 'settings/password', defaults: ['ideco2026', 'congtyideco2026', 'congtyideco@2026'] }
};

/** Khi mở module, Huyền tự bấm các nút nạp / tính số liệu này (không bao giờ bấm Xóa / Tải lên). */
const HDA_MODULE_AUTOLOAD = {
  'dropped-products': ['☁️ Tải Dữ Liệu'],
  'no-order': ['📥 Tải từ Firebase', '🔍 Phân tích tình hình khách hàng'],
  'revenue-compare': ['CẬP NHẬT PHÂN TÍCH'],
  'period-end': ['Tính toán KPI kỳ này', 'Tính toán KPI kỳ trước']
};

/** Hiểu biết về từng màn hình để Huyền tự bấm đúng nút. */
const HDA_PLAYBOOK = `
CHƯƠNG TRÌNH KHUYẾN MẠI / KHUYẾN MÃI / CHIẾT KHẤU / CHÍNH SÁCH BÁN HÀNG: KHÔNG cần mở trang nào → load promotions + product_policies (+ notices Module 01 nếu cần thông báo hỗ trợ bán hàng). Trả lời theo status (ưu tiên "Đang chạy"), nêu tên CT, nội dung, SP/nhóm áp dụng, đối tượng KH, % CK, SL tối thiểu, thời gian.
WEBSITE HOẠT ĐỘNG BH (skill bh):
• 02 orders: bảng KH trong kỳ; lọc NV bằng orders_filter_staff; ô tìm kiếm KH; KH chưa đặt = !ordered && !medicineOrdered.
• 03 dropped-products: nút "☁️ Tải Dữ Liệu", "🔎 Khách Không Lấy SP" (lọc KH bỏ SP), ô tìm KH, "📥 Xuất Excel". Biến màn hình: analysisResult, period2Products, period2MissingCustomers.
• 04 no-order: nút "📥 Tải từ Firebase", "🔍 Phân tích tình hình khách hàng", "📥 Xuất Excel". Biến: currentPeriodData, previousPeriodData, customerAnalysis.
• 05 revenue-compare: tự tải dữ liệu 2 kỳ; bảng doanh thu theo NV (kỳ này / kỳ trước / chênh lệch / tăng trưởng); nút lọc "Tất cả" / "Thuốc" / "Không Thuốc" (bấm lọc sẽ đổi bộ lọc dùng chung — chỉ bấm khi người dùng yêu cầu); ô "cust-search" loại trừ KH. Biến: currentPeriodData, previousPeriodData, excludedCustomers.
• 06 period-end: "KPI Analytics Pro" — nút tính toán, "Phân tích AI", "KH Ưu tiên", "Lưu toàn bộ". Biến: currentRevenueByEmployee, previousRevenueByEmployee, customerRevenueData, totalCurrent, totalPrevious, totalGrowth, topEmployee, lowestEmployee.
WEBSITE MỤC TIÊU KPI (skill kpi):
• apps/KE_HOACH.html (Kế hoạch & Báo cáo): xem kế hoạch tuần từng NV (dataset weekly_plans). PHÂN TÍCH KẾ HOẠCH TUẦN BGĐ: click "Ban Giám đốc · Phân tích tổng hợp kế hoạch tuần" → hiện hộp "Mật khẩu Ban Giám đốc" → gọi tool unlock → chọn Kỳ/Tuần nếu người dùng nói → click "1. Nạp dữ liệu đúng kỳ" → wait đến khi có chữ "Đã nạp" → click "2. Huyền phân tích tổng hợp kế hoạch tuần" → wait (tối đa 300 giây) đến khi xuất hiện "Bản phân tích đã lưu" hoặc "Kết quả đã gắn với bản lưu Firebase" → read để lấy kết quả. Hệ thống TỰ LƯU sau khi phân tích; nếu thấy "Chưa xác nhận lưu Firebase" thì click "Thử lưu kết quả". Bản đã lưu: dataset executive_reviews hoặc click "📖 Xem lại". Bảng công khai: "📖 Bảng phân tích kế hoạch từ BGĐ".
• apps/BAO_CAO_GIAO_DICH_KH.html: khai báo giao dịch + lịch hẹn KH (dataset gdkh_customers).
• apps/KPI_TO_CHUC.html: "📊 BẢNG ĐÁNH GIÁ", "👔 Chế độ Ban Giám Đốc — Duyệt KPI theo kỳ", "🔍 Xem KPI kỳ này" (dataset kpi_boards, kpi_reviews).
• apps/MUC_TIEU_KINH_DOANH.html: mục tiêu kinh doanh; apps/AI_AGENT_KE_HOACH_BAO_CAO_V17.html: Trung tâm AI Agent (cần mật khẩu quản trị).
`;

const HDA_DEFAULT_SETTINGS = {
  skills: [
    {
      id: 'bh', name: 'AI-AGENT HOẠT ĐỘNG BH', url: 'https://duocphamideco.github.io/dashboard-ideco/',
      passwords: 'congtyideco@2026, congtyideco2026', adminPassword: '', workingStaff: '', enabled: true,
      guide: 'Hỏi về khách hàng, NV phụ trách, KH đã/chưa đặt hàng trong kỳ hoặc hôm nay, xuất Excel danh sách.'
    },
    {
      id: 'kpi', name: 'AI-AGENT MỤC TIÊU KPI', url: 'https://duocphamideco.github.io/dashboadmuctieukehoach/',
      passwords: 'congtyideco@2026, congtyideco2026', adminPassword: '', directorPassword: '', enabled: true,
      guide: 'Hỏi về báo cáo giao dịch khách hàng (ai đã khai báo hôm nay), KPI, mục tiêu, kế hoạch tuần/tháng.'
    }
  ],
  ai: {
    routes: [
      { name: 'Kie · GPT 6.1 Terra', type: 'codex', url: 'https://api.kie.ai/codex/v1/responses', model: 'gpt-6-1-terra', effort: 'low', key: HDA_KIE_KEY },
      { name: 'Kie · Gemini 3.8 Flash (dự phòng)', type: 'chat', url: 'https://api.kie.ai/gemini-3-8-flash-openai/v1/chat/completions', model: '', key: HDA_KIE_KEY },
      { name: 'Kie · DeepSeek V4.1 Flash (dự phòng 2)', type: 'responses', url: 'https://api.kie.ai/openai/v1/responses', model: 'deepseek-v4-1-flash', key: HDA_KIE_KEY }
    ],
    maxSteps: 16,
    showSteps: true
  },
  extraGuide: '',
  quote: {                               // 💰 Gửi báo giá (lấy từ HUYỀN MARKETING 2)
    url: 'https://duocphamideco.github.io/bangbaogia/',
    passwords: 'congtyideco@2026, congtyideco2026',   // mật khẩu "Cài đặt 2" của website báo giá
    custDb: 'https://thauam1-8ad89-default-rtdb.firebaseio.com',
    custPath: 'TAOANH_CONTROL/mktAgentCustomers',
    tpl: 'Kính gửi {lienhe} – {ten},\nIDECO xin gửi {xungho} báo giá thuốc mới nhất. Cần tư vấn thêm, {xungho} nhắn lại giúp IDECO nhé. Cảm ơn {xungho} đã luôn đồng hành cùng IDECO!'
  },
  appPassword: 'congtyideco@2026',      // mật khẩu mở ứng dụng HUYỀN DASHBOARD
  settingsPassHash: '',                  // rỗng = dùng mật khẩu Cài đặt mặc định
  updatedAt: 0
};

/** Mật khẩu vào Cài đặt mặc định (khi chưa đổi). */
const HDA_SETTINGS_PASS_DEFAULT = ['minhtriett1973', 'minhtriet1973'];
