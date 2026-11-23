/* HUYỀN QUẢN LÝ KPI - KHÁCH HÀNG — Mẫu lệnh chọn sẵn.
 * {NV} nhân viên · {KH} khách hàng · {KY} kỳ (vd "tháng 11/2026", "từ 01/11/2026 đến 23/11/2026")
 * {TUAN} tuần · {EXCEL} câu "và xuất file Excel" khi tick. */
'use strict';
const HDA_TEMPLATES = [
  /* ---------- KẾ HOẠCH & BÁO CÁO TUẦN ---------- */
  { id: 'kh1', group: '📅 Kế hoạch & báo cáo tuần', skill: 'kpi', title: 'Xem báo cáo kế hoạch tuần của 1 NV', need: ['NV', 'TUAN'],
    text: 'Xem báo cáo kế hoạch {TUAN} của {NV}: mục tiêu tuần, danh sách công việc theo ngày (đã hoàn thành / chuyển tiếp / chưa làm), tỉ lệ hoàn thành, nội dung báo cáo cuối tuần và nhận xét của Ban Giám đốc. Mở màn hình Kế hoạch & Báo cáo cho tôi xem.{EXCEL}' },
  { id: 'kh2', group: '📅 Kế hoạch & báo cáo tuần', skill: 'kpi', title: 'Tóm tắt báo cáo cuối tuần của TẤT CẢ NV + góp ý', need: ['TUAN'],
    text: 'Tóm tắt báo cáo kế hoạch cuối {TUAN} của từng nhân viên (mỗi người 3–5 dòng): mục tiêu, số việc, % hoàn thành, kết quả nổi bật, việc trễ. Sau đó góp ý từng người và đề xuất xử lý cụ thể cho Ban Giám đốc; nêu ai chưa nộp báo cáo cuối tuần.{EXCEL}' },
  { id: 'kh3', group: '📅 Kế hoạch & báo cáo tuần', skill: 'kpi', title: 'Kiểm tra kế hoạch tuần & KPI của 1 NV', need: ['NV', 'TUAN'],
    text: 'Kiểm tra kế hoạch {TUAN} của {NV} so với KPI tháng của bạn ấy: công việc nào bám KPI, KPI nào chưa có việc thực hiện, việc nào thiếu kết quả đo được, tỉ lệ hoàn thành. Kết luận mức độ đạt và đề xuất điều chỉnh kế hoạch tuần tới.' },
  { id: 'kh4', group: '📅 Kế hoạch & báo cáo tuần', skill: 'kpi', title: 'Bấm PHÂN TÍCH kế hoạch tuần BGĐ và LƯU', need: [],
    text: 'Vào Kế hoạch & Báo cáo, bấm "Ban Giám đốc · Phân tích tổng hợp kế hoạch tuần", nhập mật khẩu Ban Giám đốc, bấm "1. Nạp dữ liệu đúng kỳ" rồi "2. Huyền phân tích tổng hợp kế hoạch tuần", chờ xong và đảm bảo bản phân tích đã LƯU Firebase. Sau đó tóm tắt kết quả: điểm mạnh, điểm yếu, nhân viên cần nhắc nhở, đề xuất của Huyền.' },
  { id: 'kh5', group: '📅 Kế hoạch & báo cáo tuần', skill: 'kpi', title: 'Xem lại bản phân tích kế hoạch BGĐ đã lưu', need: [],
    text: 'Đọc bản "Phân tích tổng hợp kế hoạch tuần" của Ban Giám đốc đã lưu gần nhất và tóm tắt lại: nhận định chung, từng bộ phận, nhân viên cần lưu ý, việc BGĐ cần quyết định.' },
  { id: 'kh6', group: '📅 Kế hoạch & báo cáo tuần', skill: 'kpi', title: 'NV chưa lập kế hoạch / chưa báo cáo tuần', need: ['TUAN'],
    text: 'Liệt kê nhân viên CHƯA lập kế hoạch {TUAN} và nhân viên đã lập nhưng CHƯA viết báo cáo cuối tuần, kèm bộ phận.{EXCEL}' },

  /* ---------- GIAO DỊCH & LỊCH HẸN ---------- */
  { id: 'gd1', group: '🤝 Giao dịch & lịch hẹn KH', skill: 'kpi', title: 'Báo cáo giao dịch KH trong kỳ của 1 NV', need: ['NV', 'KY'],
    text: 'Tổng hợp báo cáo giao dịch khách hàng {KY} của {NV}: số KH đã khai báo, liệt kê từng KH (ngày giao dịch, trạng thái, nội dung báo cáo tóm tắt, phản hồi KH), KH đang theo dõi cần chốt, góp ý của BGĐ nếu có. Mở màn hình Báo cáo giao dịch khách hàng.{EXCEL}' },
  { id: 'gd2', group: '🤝 Giao dịch & lịch hẹn KH', skill: 'kpi', title: 'Hôm nay ai đã / chưa khai báo giao dịch', need: [],
    text: 'Hôm nay những nhân viên nào đã khai báo giao dịch khách hàng (bao nhiêu KH mỗi người) và nhân viên nào CHƯA khai báo?{EXCEL}' },
  { id: 'gd3', group: '🤝 Giao dịch & lịch hẹn KH', skill: 'kpi', title: 'Lịch hẹn KH trong kỳ của 1 NV', need: ['NV', 'KY'],
    text: 'Tổng hợp lịch hẹn khách hàng {KY} của {NV}: chia 3 nhóm Đã hoàn thành / Sắp tới / Quá hạn chưa hoàn thành; mỗi lịch ghi ngày giờ, khách hàng, nội dung. Nhắc những lịch quá hạn cần xử lý.{EXCEL}' },
  { id: 'gd4', group: '🤝 Giao dịch & lịch hẹn KH', skill: 'kpi', title: 'Lịch hẹn QUÁ HẠN toàn công ty', need: [],
    text: 'Liệt kê tất cả lịch hẹn khách hàng đã QUÁ HẠN mà chưa hoàn thành, nhóm theo nhân viên (số lượng mỗi người), sắp xếp quá hạn lâu nhất lên đầu.{EXCEL}' },
  { id: 'gd5', group: '🤝 Giao dịch & lịch hẹn KH', skill: 'kpi', title: 'Lịch sử giao dịch của 1 khách hàng', need: ['KH'],
    text: 'Xem toàn bộ lịch sử giao dịch của khách hàng {KH} (đoán đúng tên gần đúng): nhân viên phụ trách, các lần báo cáo theo thời gian, trạng thái hiện tại, lịch hẹn, góp ý BGĐ. Đề xuất bước tiếp theo để chốt đơn.' },
  { id: 'gd6', group: '🤝 Giao dịch & lịch hẹn KH', skill: 'kpi', title: 'Thống kê giao dịch trong kỳ theo NV', need: ['KY'],
    text: 'Thống kê báo cáo giao dịch {KY}: mỗi nhân viên có bao nhiêu KH đã khai báo, bao nhiêu lịch hẹn (hoàn thành / quá hạn), bao nhiêu KH theo trạng thái. Xếp hạng nhân viên tích cực nhất và cần nhắc nhở.{EXCEL}' },

  /* ---------- KHÁCH HÀNG & ĐƠN HÀNG ---------- */
  { id: 'dh1', group: '🛒 Khách hàng & đơn hàng', skill: 'bh', title: 'Lọc KH CHƯA CÓ ĐƠN trong kỳ theo NV', need: ['NV'],
    text: 'Lọc danh sách khách hàng CHƯA có đơn hàng trong kỳ của {NV} (chưa đặt cả thuốc lẫn không thuốc): tên KH, mã, SĐT, khu vực, ghi chú. Hiện đúng danh sách đó trên bảng Module 02.{EXCEL}' },
  { id: 'dh2', group: '🛒 Khách hàng & đơn hàng', skill: 'bh', title: 'KH chưa có đơn trong kỳ — TẤT CẢ NV', need: [],
    text: 'Thống kê khách hàng CHƯA có đơn trong kỳ theo từng nhân viên: tổng KH được giao, số KH đã đặt, số KH chưa đặt, % đã đặt; xếp hạng nhân viên có tỉ lệ thấp nhất.{EXCEL}' },
  { id: 'dh3', group: '🛒 Khách hàng & đơn hàng', skill: 'bh', title: 'KH chưa lên đơn HÔM NAY của 1 NV', need: ['NV'],
    text: 'Khách hàng nào của {NV} chưa lên đơn hôm nay? Liệt kê và lọc trên màn hình Module 02.{EXCEL}' },
  { id: 'dh4', group: '🛒 Khách hàng & đơn hàng', skill: 'bh', title: 'NV nào phụ trách khách hàng', need: ['KH'],
    text: 'Khách hàng {KH} do nhân viên nào phụ trách? Cho biết mã KH, SĐT, đã đặt hàng trong kỳ chưa.' },
  { id: 'dh5', group: '🛒 Khách hàng & đơn hàng', skill: 'bh', title: 'SP + sản lượng KH lấy kỳ trước, kỳ này CHƯA lấy', need: ['KH'],
    text: 'Khách hàng {KH} kỳ trước đã lấy những sản phẩm nào, sản lượng và tiền bao nhiêu, mà kỳ này CHƯA lấy? So sánh tổng doanh thu 2 kỳ của KH này và gợi ý sản phẩm cần chào lại.{EXCEL}' },
  { id: 'dh6', group: '🛒 Khách hàng & đơn hàng', skill: 'bh', title: 'KH bỏ sản phẩm cũ của 1 NV', need: ['NV'],
    text: 'Liệt kê khách hàng của {NV} đã mua kỳ trước nhưng kỳ này bỏ sản phẩm (hoặc chưa đặt gì): tên KH, SĐT, sản phẩm bỏ, sản lượng kỳ trước.{EXCEL}' },

  /* ---------- KHUYẾN MẠI ---------- */
  { id: 'km1', group: '🎁 Khuyến mại & chính sách', skill: 'bh', title: 'Chương trình khuyến mại đang chạy', need: [],
    text: 'Liệt kê các chương trình khuyến mại / chính sách sản phẩm ĐANG CHẠY hôm nay: tên chương trình, sản phẩm/nhóm áp dụng, đối tượng khách hàng, % chiết khấu, số lượng tối thiểu, thời gian bắt đầu – kết thúc; kèm các chương trình sắp chạy.{EXCEL}' },
  { id: 'km2', group: '🎁 Khuyến mại & chính sách', skill: 'bh', title: 'KM áp dụng cho 1 khách hàng', need: ['KH'],
    text: 'Khách hàng {KH} hiện được hưởng những chương trình khuyến mại / chính sách nào (theo đối tượng KH và sản phẩm KH hay lấy kỳ trước)? Gợi ý sản phẩm nên chào kèm khuyến mại.' },

  /* ---------- DOANH THU ---------- */
  { id: 'dt1', group: '💰 Doanh thu kỳ này vs kỳ trước', skill: 'bh', title: 'Doanh thu theo NV: kỳ này vs kỳ trước', need: [],
    text: 'So sánh doanh thu kỳ này với kỳ trước theo từng nhân viên: kỳ này, kỳ trước, chênh lệch, % tăng giảm, tách thuốc / không thuốc; nêu tổng công ty, nhân viên tăng mạnh nhất và giảm mạnh nhất. Mở Module 05 cho tôi xem.{EXCEL}' },
  { id: 'dt2', group: '💰 Doanh thu kỳ này vs kỳ trước', skill: 'bh', title: 'Top KH GIẢM doanh thu mạnh nhất', need: [],
    text: 'Liệt kê 20 khách hàng giảm doanh thu mạnh nhất kỳ này so với kỳ trước (kỳ trước, kỳ này, chênh lệch, %, nhân viên phụ trách), kèm KH mất đơn hoàn toàn.{EXCEL}' },
  { id: 'dt3', group: '💰 Doanh thu kỳ này vs kỳ trước', skill: 'bh', title: 'Doanh thu của 1 NV: chi tiết theo KH', need: ['NV'],
    text: 'Phân tích doanh thu kỳ này so với kỳ trước của {NV} theo từng khách hàng: KH tăng, KH giảm, KH mất đơn, KH mới; đề xuất 5 việc cần làm ngay để bù doanh thu.{EXCEL}' }
];

/** Ghép mẫu với giá trị người dùng chọn. */
function hdaFillTemplate(t, v) {
  const map = {
    NV: v.NV ? 'nhân viên ' + v.NV : 'tất cả nhân viên',
    KH: v.KH || '(khách hàng)',
    KY: v.KY || 'trong kỳ hiện tại (tháng này)',
    TUAN: v.TUAN || 'tuần này',
    EXCEL: v.EXCEL ? ' Xuất file Excel danh sách kết quả.' : '',
    SP: v.SP || '(tên sản phẩm, cách nhau dấu phẩy)',
    NHOM: v.NHOM || '(nhóm / danh mục)',
    MUC: v.MUC === '0' ? 'đầy đủ mức giá' : v.MUC === '6' ? 'mua từ 6 hộp' : 'mua từ 12 hộp trở lên',
    MSG: v.MSG ? ', tin nhắn: ' + v.MSG : ''
  };
  return String(t.text).replace(/\{(NV|KH|KY|TUAN|EXCEL|SP|NHOM|MUC|MSG)\}/g, (_, k) => map[k]);
}
