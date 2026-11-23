/* (Bản mobile: chạy trong Web Worker riêng) Sandbox phân tích dữ liệu: chạy đoạn JS do Huyền AI viết trên BẢN SAO dữ liệu.
 * Trang sandbox không có quyền extension, không đụng tới website hay Firebase,
 * nên đoạn mã chỉ có thể đọc/tính toán, không thể ghi/xóa dữ liệu công ty. */
'use strict';
const DATA = Object.create(null);
const RESULTS = [];
let LAST = null;

const H = {
  norm(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  },
  has(text, q) { const a = H.norm(text), b = H.norm(q); return !!b && a.includes(b); },
  pad(n) { return String(n).padStart(2, '0'); },
  ymd(d) { return d.getFullYear() + '-' + H.pad(d.getMonth() + 1) + '-' + H.pad(d.getDate()); },
  today() { return H.ymd(new Date()); },
  daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return H.ymd(d); },
  /** Đưa mọi kiểu ngày (ms, giây, ISO, YYYY-MM-DD, DD/MM/YYYY) về 'YYYY-MM-DD' theo giờ máy. */
  dayOf(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'number' || /^\d{9,13}$/.test(String(v))) {
      let n = Number(v); if (n < 1e11) n *= 1000; const d = new Date(n); return isNaN(d) ? '' : H.ymd(d);
    }
    const s = String(v).trim();
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s); if (m) return m[1] + '-' + H.pad(m[2]) + '-' + H.pad(m[3]);
    m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/.exec(s); if (m) return m[3] + '-' + H.pad(m[2]) + '-' + H.pad(m[1]);
    const d = new Date(s); return isNaN(d) ? '' : H.ymd(d);
  },
  isToday(v) { return H.dayOf(v) === H.today(); },
  inRange(v, from, to) { const d = H.dayOf(v); return !!d && (!from || d >= from) && (!to || d <= to); },
  uniq(arr) { return [...new Set(arr)]; },
  countBy(arr, fn) { const o = {}; (arr || []).forEach(x => { const k = typeof fn === 'function' ? fn(x) : x[fn]; const kk = k == null || k === '' ? '(trống)' : String(k); o[kk] = (o[kk] || 0) + 1; }); return o; },
  groupBy(arr, fn) { const o = {}; (arr || []).forEach(x => { const k = typeof fn === 'function' ? fn(x) : x[fn]; const kk = k == null || k === '' ? '(trống)' : String(k); (o[kk] = o[kk] || []).push(x); }); return o; },
  pick(o, keys) { const r = {}; keys.forEach(k => { r[k] = o == null ? undefined : o[k]; }); return r; },
  sum(arr, fn) { return (arr || []).reduce((s, x) => s + (Number(typeof fn === 'function' ? fn(x) : x[fn]) || 0), 0); },
  /** Số từ chuỗi kiểu Việt Nam: "1.234.567", "1,234,567 đ", 1234567 */
  num(v) {
    if (typeof v === 'number') return v;
    let s = String(v == null ? '' : v).replace(/[^\d,.\-]/g, '');
    if (/^-?\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, '');
    else if (/^-?\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.');
    else if (/,\d{1,2}$/.test(s) && s.indexOf('.') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
    const n = parseFloat(s); return isNaN(n) ? 0 : n;
  },
  money(n) { return Math.round(Number(n) || 0).toLocaleString('vi-VN'); },
  pct(a, b) { a = Number(a) || 0; b = Number(b) || 0; return b ? Math.round((a - b) / b * 1000) / 10 : (a ? 100 : 0); },
  /** Chuẩn hóa tên KH/SP để so khớp gần đúng: bỏ dấu, viết tắt NT/QT/CT/PK/BV… */
  key(s) {
    let t = ' ' + H.norm(s) + ' ';
    const ab = [[' nha thuoc ', ' nt '], [' quay thuoc ', ' qt '], [' cong ty ', ' ct '], [' cty ', ' ct '], [' phong kham ', ' pk '], [' benh vien ', ' bv '], [' trung tam ', ' tt '], [' tnhh ', ' '], [' co phan ', ' '], [' cp ', ' '], [' duoc pham ', ' dp '], [' hieu thuoc ', ' ht '], [' dai ly ', ' dl ']];
    ab.forEach(([a, b]) => { t = t.split(a).join(b); });
    return t.replace(/\s+/g, ' ').trim();
  },
  /** Độ giống 0..1 giữa 2 tên (từ chung + bigram ký tự), chịu được sai dấu, viết tắt, thiếu chữ. */
  similar(a, b) {
    const x = H.key(a), y = H.key(b); if (!x || !y) return 0; if (x === y) return 1;
    const wa = x.split(' '), wb = y.split(' ');
    const common = wa.filter(w => wb.includes(w) || wb.some(v => v.length > 2 && (v.startsWith(w) || w.startsWith(v)))).length;
    const wscore = common / Math.max(wa.length, wb.length);
    const bg = s => { const o = new Map(); const z = s.replace(/ /g, ''); for (let i = 0; i < z.length - 1; i++) { const g = z.slice(i, i + 2); o.set(g, (o.get(g) || 0) + 1); } return o; };
    const A = bg(x), B = bg(y); let inter = 0, tot = 0;
    A.forEach((n, g) => { inter += Math.min(n, B.get(g) || 0); tot += n; }); B.forEach(n => { tot += n; });
    const dice = tot ? 2 * inter / tot : 0;
    let score = 0.55 * dice + 0.45 * wscore;
    // mọi từ người dùng gõ đều có trong tên (vd "lan" ⊂ "nguyen thi lan", "minh chau" ⊂ "nt minh chau 2")
    const shortW = wa.length <= wb.length ? wa : wb, longW = shortW === wa ? wb : wa;
    const hit = w => longW.some(v => v === w || (w.length >= 3 && v.startsWith(w)) || (v.length >= 3 && w.startsWith(v)));
    if (shortW.length && shortW.every(hit)) score = Math.max(score, 0.72 + 0.25 * shortW.length / longW.length);
    return Math.round(Math.min(1, score) * 1000) / 1000;
  },
  /** Tìm gần đúng: trả [{item, score, name}] giảm dần. field = tên trường hoặc hàm. */
  match(arr, field, q, limit) {
    const get = typeof field === 'function' ? field : x => x && x[field];
    return (arr || []).map(x => ({ item: x, name: get(x), score: H.similar(get(x), q) }))
      .filter(r => r.score >= 0.35).sort((a, b) => b.score - a.score).slice(0, limit || 8);
  },
  /** Danh sách tên duy nhất gần đúng nhất (dùng đoán tên KH/NV/SP từ nhiều nguồn). */
  guess(names, q, limit) {
    const u = [...new Set((names || []).filter(Boolean).map(String))];
    return u.map(n => ({ name: n, score: H.similar(n, q) })).filter(r => r.score >= 0.35).sort((a, b) => b.score - a.score).slice(0, limit || 5);
  },
  /** Tìm trường có tên gần đúng trong 1 dòng (vd "sản phẩm", "số lượng", "khách hàng"). */
  col(row, ...names) {
    const ks = Object.keys(row || {});
    for (const n of names) { const nn = H.norm(n); const k = ks.find(k => H.norm(k) === nn) || ks.find(k => H.norm(k).includes(nn)); if (k) return k; }
    return null;
  },
  /** Lịch hẹn phẳng từ gdkh_customers: {date,time,content,isCompleted,customer,salesRep,phone,customerId} */
  appointments(customers) {
    const out = [];
    (customers || []).forEach(c => (Array.isArray(c.appointments) ? c.appointments : Object.values(c.appointments || {})).forEach(a => {
      if (a) out.push({ date: H.dayOf(a.date) || a.date || '', time: a.time || '', content: a.content || '', isCompleted: !!a.isCompleted, customer: c.name || '', salesRep: c.salesRep || '', phone: c.phone || '', customerId: c.id || c._key || '' });
    }));
    return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  },
  /** Tóm tắt 1 kế hoạch tuần: số việc, hoàn thành, chuyển tiếp, báo cáo cuối tuần, nhận xét BGĐ */
  planSummary(p) {
    const tasks = [];
    Object.keys((p && p.days) || {}).forEach(d => ((p.days[d] && p.days[d].tasks) || []).forEach(t => tasks.push(Object.assign({ day: d }, t))));
    const done = tasks.filter(t => t.isCompleted).length, cont = tasks.filter(t => t.isContinued).length;
    return { id: p && (p.id || p._key), employee: p && p.employeeName, department: p && p.department, created: p && p.creationDate,
      objective: p && p.objective, tasks: tasks.length, completed: done, continued: cont, notDone: tasks.length - done - cont,
      completionRate: tasks.length ? Math.round(done / tasks.length * 100) : 0, weeklyReport: p && p.report,
      directorEvaluation: p && p.directorEvaluation, directorRating: p && p.directorRating, evaluationStatus: p && p.evaluationStatus,
      taskList: tasks.map(t => ({ day: t.day, name: t.name, expected: t.expectedResult, done: !!t.isCompleted, continued: !!t.isContinued, feedback: t.feedback || '' })) };
  },
  /** Tuần (thứ Hai) của 1 ngày → 'YYYY-MM-DD' */
  weekOf(v) { const d0 = H.dayOf(v); if (!d0) return ''; const d = new Date(d0 + 'T00:00:00'); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return H.ymd(d); },
  monthOf(v) { const d = H.dayOf(v); return d ? d.slice(0, 7) : ''; },
  /** Tìm bản ghi khớp tên gần đúng nhất (bỏ dấu, chứa từ khóa). */
  find(arr, field, q, limit) {
    const nq = H.norm(q); if (!nq) return [];
    const words = nq.split(' ');
    return (arr || []).map(x => {
      const t = H.norm(typeof field === 'function' ? field(x) : x[field]);
      let sc = t === nq ? 100 : t.includes(nq) ? 80 : 0;
      if (!sc) { const hit = words.filter(w => t.includes(w)).length; sc = hit ? Math.round(60 * hit / words.length) : 0; }
      return { x, sc };
    }).filter(r => r.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, limit || 20).map(r => r.x);
  }
};

function safeClone(v) {
  try { return JSON.parse(JSON.stringify(v === undefined ? null : v)); }
  catch (e) { return String(v); }
}

self.addEventListener('message', ev => {
  const msg = ev.data || {};
  const reply = payload => self.postMessage(Object.assign({ id: msg.id }, payload));
  try {
    if (msg.cmd === 'set') { DATA[msg.name] = msg.value; reply({ ok: true }); return; }
    if (msg.cmd === 'drop') { delete DATA[msg.name]; reply({ ok: true }); return; }
    if (msg.cmd === 'run') {
      const t0 = Date.now();
      const fn = new Function('DATA', 'H', 'RESULTS', 'LAST', '"use strict";\n' + String(msg.code || ''));
      let out = fn(DATA, H, RESULTS, LAST);
      Promise.resolve(out).then(v => {
        v = safeClone(v);
        RESULTS.push(v); LAST = v;
        reply({ ok: true, value: v, index: RESULTS.length - 1, ms: Date.now() - t0 });
      }).catch(e => reply({ ok: false, error: String(e && e.message || e) }));
      return;
    }
    if (msg.cmd === 'result') { reply({ ok: true, value: msg.index == null ? LAST : RESULTS[msg.index] }); return; }
    reply({ ok: false, error: 'Lệnh không hợp lệ' });
  } catch (e) {
    reply({ ok: false, error: String(e && e.message || e) });
  }
});
