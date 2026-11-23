/* HUYỀN DASHBOARD — lõi: lưu cài đặt, gọi AI, đọc dữ liệu, sandbox, Excel. */
'use strict';

const HDA = {};

/* ============================ CÀI ĐẶT ============================ */
HDA.STORE_KEY = 'hda_settings_v1';
HDA.CHAT_KEY = 'hda_chat_v1';
HDA.clone = o => JSON.parse(JSON.stringify(o));

HDA.normalizeSettings = function (raw) {
  const s = Object.assign(HDA.clone(HDA_DEFAULT_SETTINGS), raw || {});
  s.skills = Array.isArray(s.skills) ? s.skills : [];
  HDA_DEFAULT_SETTINGS.skills.forEach(d => { if (!s.skills.find(x => x.id === d.id)) s.skills.push(HDA.clone(d)); });
  s.ai = Object.assign(HDA.clone(HDA_DEFAULT_SETTINGS.ai), s.ai || {});
  if (!Array.isArray(s.ai.routes) || !s.ai.routes.length) s.ai.routes = HDA.clone(HDA_DEFAULT_SETTINGS.ai.routes);
  return s;
};
/** Đọc Cài đặt: bản trên máy trước (mở nhanh), rồi lấy bản dùng chung trên Firebase nếu mới hơn. */
HDA.loadSettings = async function (opts) {
  const got = await chrome.storage.local.get(HDA.STORE_KEY);
  let local = got[HDA.STORE_KEY] || null;
  HDA.settings = HDA.normalizeSettings(local);
  HDA.syncState = 'local';
  if (opts && opts.localOnly) return HDA.settings;
  try {
    const remote = await HDA.fbGet(HDA_SHARED.db, HDA_SHARED.path);
    if (remote && typeof remote === 'object' && (!local || Number(remote.updatedAt || 0) >= Number(local.updatedAt || 0))) {
      HDA.settings = HDA.normalizeSettings(remote);
      await chrome.storage.local.set({ [HDA.STORE_KEY]: HDA.settings });
    }
    HDA.syncState = 'firebase';
  } catch (e) { HDA.syncState = 'offline: ' + e.message; }
  return HDA.settings;
};
/** Lưu Cài đặt: ghi trên máy + ghi Firebase để mọi máy dùng chung (real time). */
HDA.saveSettings = async function (s) {
  s.updatedAt = Date.now();
  HDA.settings = s;
  await chrome.storage.local.set({ [HDA.STORE_KEY]: s });
  try { await HDA.fbPut(HDA_SHARED.db, HDA_SHARED.path, s); HDA.syncState = 'firebase'; return { ok: true }; }
  catch (e) { HDA.syncState = 'offline: ' + e.message; return { ok: false, error: e.message }; }
};
HDA.skill = id => (HDA.settings.skills || []).find(s => s.id === id);
HDA.passwordsOf = sk => [...new Set(String(sk && sk.passwords || '').split(/[\n,]+/).map(x => x.trim()).filter(Boolean)
  .concat(typeof HDA_BUILTIN_PASS !== 'undefined' ? HDA_BUILTIN_PASS : []))];

HDA.sha = async function (text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('hda::' + text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
};

/* ============================ TIỆN ÍCH ============================ */
HDA.norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
HDA.pad = n => String(n).padStart(2, '0');
HDA.ymd = d => d.getFullYear() + '-' + HDA.pad(d.getMonth() + 1) + '-' + HDA.pad(d.getDate());
HDA.sleep = ms => new Promise(r => setTimeout(r, ms));
HDA.clip = (s, n) => { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + ' …[đã cắt bớt ' + (s.length - n) + ' ký tự]' : s; };
HDA.fetchTimeout = async function (url, opts, ms, outerSignal) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms || 60000);
  const onAbort = () => ctl.abort();
  if (outerSignal) outerSignal.addEventListener('abort', onAbort);
  try { return await fetch(url, Object.assign({}, opts, { signal: ctl.signal })); }
  finally { clearTimeout(t); if (outerSignal) outerSignal.removeEventListener('abort', onAbort); }
};

/* ============================ GỌI AI ============================ */
HDA.extractText = function (raw) {
  const pickObj = obj => {
    if (!obj || typeof obj !== 'object') return '';
    if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) { const t = pickObj(obj.data); if (t) return t; }
    if (typeof obj.output_text === 'string' && obj.output_text.trim()) return obj.output_text;
    const ch = obj.choices && obj.choices[0];
    if (ch) {
      const c = ch.message ? ch.message.content : ch.delta ? ch.delta.content : ch.text;
      if (typeof c === 'string') return c;
      if (Array.isArray(c)) return c.map(p => p.text || '').join('');
    }
    if (Array.isArray(obj.output)) {
      const t = obj.output.map(o => Array.isArray(o.content) ? o.content.map(p => p.text || '').join('') : (o.text || '')).join('');
      if (t.trim()) return t;
    }
    if (Array.isArray(obj.candidates)) {
      const t = obj.candidates.map(c => ((c.content || {}).parts || []).map(p => p.text || '').join('')).join('');
      if (t.trim()) return t;
    }
    if (typeof obj.text === 'string') return obj.text;
    if (typeof obj.result === 'string') return obj.result;
    return '';
  };
  const s = String(raw || '').trim();
  if (/^(data:|event:)/m.test(s) && !/^\s*\{/.test(s)) {
    let out = '', finalText = '';
    s.split(/\r?\n/).forEach(line => {
      const m = /^data:\s*(.*)$/.exec(line.trim()); if (!m || m[1] === '[DONE]') return;
      try {
        const o = JSON.parse(m[1]);
        if (o.type === 'response.output_text.delta' && typeof o.delta === 'string') { out += o.delta; return; }
        if (o.type === 'response.completed' && o.response) { finalText = pickObj(o.response) || finalText; return; }
        const ch = o.choices && o.choices[0];
        if (ch && ch.delta && typeof ch.delta.content === 'string') { out += ch.delta.content; return; }
        const t = pickObj(o); if (t) out += t;
      } catch (e) {}
    });
    return finalText || out;
  }
  const obj = JSON.parse(s);
  const err = obj.error || (obj.code && obj.code !== 200 && obj.code !== 0 && !obj.choices ? (obj.msg || obj.message || ('code ' + obj.code)) : null);
  const text = pickObj(obj);
  if (!text && err) throw new Error(typeof err === 'string' ? err : (err.message || JSON.stringify(err)));
  return text;
};

HDA.callRoute = async function (route, messages, signal) {
  const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + route.key };
  let body;
  if (route.type === 'codex') {
    // Kie GPT 6.1 Terra: POST /codex/v1/responses (chuẩn OpenAI Responses)
    const sys = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
    const conv = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
    const mk = input => JSON.stringify({ model: route.model || 'gpt-6-1-terra', instructions: sys, input, reasoning: { effort: route.effort || 'low' }, stream: false });
    let res = await HDA.fetchTimeout(route.url, { method: 'POST', headers, body: mk(conv) }, 90000, signal);
    let raw = await res.text();
    if (res.status === 400 || res.status === 422) {
      // một số cổng chỉ nhận input dạng chuỗi → gộp hội thoại
      const flat = messages.filter(m => m.role !== 'system').map(m => (m.role === 'assistant' ? 'HUYỀN: ' : 'NGƯỜI DÙNG: ') + m.content).join('\n\n');
      res = await HDA.fetchTimeout(route.url, { method: 'POST', headers, body: mk(flat) }, 120000, signal);
      raw = await res.text();
    }
    if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + HDA.clip(raw, 300));
    const text = HDA.extractText(raw);
    if (!text || !text.trim()) throw new Error('AI trả về rỗng: ' + HDA.clip(raw, 200));
    return text;
  }
  if (route.type === 'responses') {
    // Kie /openai/v1/responses: gộp hội thoại thành một input văn bản (cách các app IDECO đang chạy ổn định).
    const text = messages.map(m => (m.role === 'system' ? '### HỆ THỐNG\n' : m.role === 'assistant' ? '### HUYỀN (trả lời trước)\n' : '### NGƯỜI DÙNG / KẾT QUẢ CÔNG CỤ\n') + m.content).join('\n\n');
    body = { model: route.model || 'deepseek-v4-1-flash', stream: false, thinking: { type: 'disabled' }, input: [{ role: 'user', content: [{ type: 'input_text', text }] }] };
  } else {
    body = { messages: messages.map(m => ({ role: m.role, content: m.content })), stream: false };
    if (route.model) body.model = route.model;
  }
  const res = await HDA.fetchTimeout(route.url, { method: 'POST', headers, body: JSON.stringify(body) }, 90000, signal);
  const raw = await res.text();
  if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + HDA.clip(raw, 300));
  const text = HDA.extractText(raw);
  if (!text || !text.trim()) throw new Error('AI trả về rỗng: ' + HDA.clip(raw, 200));
  return text;
};

/** Tên hiển thị trong khung chat: không lộ tên model. */
HDA.publicName = function (idx) { return idx === 0 ? 'Huyền 6.1' : 'Huyền 6.1 · dự phòng ' + idx; };
HDA.sanitize = function (text) {
  let t = String(text || '');
  (HDA.settings && HDA.settings.ai && HDA.settings.ai.routes || []).forEach((r, i) => { if (r.name) t = t.split(r.name).join(HDA.publicName(i)); if (r.model) t = t.split(r.model).join('Huyền 6.1'); });
  return t.replace(/gpt[\s-]*6[.\-]?1[\s-]*terra/ig, 'Huyền 6.1').replace(/gemini[\s-]*[\d.]+[\s-]*flash/ig, 'Huyền 6.1').replace(/deepseek[\s-]*v?[\d.]*[\s-]*(flash)?/ig, 'Huyền 6.1').replace(/kie(\.ai)?\s*·\s*/ig, '');
};
const HDA_RETRYABLE = e => e && (e.name === 'TypeError' || /HTTP (429|5\d\d)|Failed to fetch|NetworkError|network|ECONN|quá thời gian|AbortError|rỗng/i.test(String(e.message || e)));
const HDA_TOO_LONG = e => /HTTP (400|413)|context|too long|maximum|token|quá dài|length/i.test(String(e && e.message || e));

HDA.callAI = async function (messages, signal) {
  const all = (HDA.settings.ai.routes || []);
  const routes = all.map((r, i) => ({ r, i })).filter(x => x.r && x.r.url && x.r.key);
  if (!routes.length) throw new Error('Chưa có API key AI. Vào tab Cài đặt → AI để nhập key.');
  const errs = [];
  for (const { r, i } of routes) {
    // mỗi tuyến thử tối đa 3 lần khi mạng chập chờn (1,5s → 4s)
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (signal && signal.aborted) throw new Error('Đã dừng');
      try {
        const text = await HDA.callRoute(r, messages, signal);
        return { text, route: HDA.publicName(i), routeIndex: i };
      } catch (e) {
        if (signal && signal.aborted) throw new Error('Đã dừng');
        if (HDA_TOO_LONG(e)) { const err = new Error('TOO_LONG'); err.tooLong = true; throw err; }
        const retry = HDA_RETRYABLE(e) && attempt < 3;
        if (!retry) { errs.push(HDA.publicName(i) + ': ' + (e.name === 'AbortError' ? 'quá thời gian' : String(e.message || e).slice(0, 120))); break; }
        HDA.ui && HDA.ui.progress('🔄 Mạng chậm, Huyền kết nối lại… (lần ' + (attempt + 1) + ')');
        await HDA.sleep(attempt === 1 ? 1500 : 4000);
      }
    }
  }
  throw new Error(HDA.sanitize('Huyền chưa kết nối được AI → ' + errs.join(' | ')));
};

/* ============================ FIREBASE (CHỈ ĐỌC) ============================ */
HDA.fbGet = async function (dbAlias, path, opts) {
  opts = opts || {};
  const base = HDA_DB[dbAlias] || (/^https:\/\/[a-z0-9-]+\.(firebaseio\.com|firebasedatabase\.app)\/?$/i.test(dbAlias) ? dbAlias.replace(/\/$/, '') : null);
  if (!base) throw new Error('CSDL "' + dbAlias + '" không có trong danh sách cho phép: ' + Object.keys(HDA_DB).join(', '));
  const clean = String(path || '').replace(/^\/+|\/+$/g, '').split('/').map(encodeURIComponent).join('/');
  const url = base + '/' + clean + '.json' + (opts.shallow ? '?shallow=true' : '');
  const res = await HDA.fetchTimeout(url, { method: 'GET', cache: 'no-store' }, 45000);
  const txt = await res.text();
  if (!res.ok) throw new Error('Firebase ' + res.status + ': ' + HDA.clip(txt, 200));
  return txt ? JSON.parse(txt) : null;
};
HDA.fbPut = async function (dbAlias, path, value) {
  const base = HDA_DB[dbAlias]; if (!base) throw new Error('CSDL không hợp lệ');
  const clean = String(path).replace(/^\/+|\/+$/g, '').split('/').map(encodeURIComponent).join('/');
  const res = await HDA.fetchTimeout(base + '/' + clean + '.json', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }, 30000);
  if (!res.ok) throw new Error('Firebase ' + res.status + ': ' + HDA.clip(await res.text(), 150));
  return true;
};
/** Theo dõi Cài đặt dùng chung thay đổi (SSE của Firebase REST). */
HDA.fbWatch = function (dbAlias, path, onChange) {
  try {
    const es = new EventSource(HDA_DB[dbAlias] + '/' + path + '.json');
    const h = () => onChange();
    es.addEventListener('put', h); es.addEventListener('patch', h);
    return es;
  } catch (e) { return null; }
};
HDA.toRows = function (data) {
  if (data == null) return [];
  if (Array.isArray(data)) return data.map((v, i) => v && typeof v === 'object' ? Object.assign({ _key: String(i) }, v) : { _key: String(i), value: v }).filter(r => r.value !== null);
  if (typeof data === 'object') return Object.keys(data).map(k => { const v = data[k]; return v && typeof v === 'object' && !Array.isArray(v) ? Object.assign({ _key: k }, v) : { _key: k, value: v }; });
  return [{ value: data }];
};

/* ============================ SANDBOX ============================ */
HDA.sb = { frame: null, seq: 0, wait: new Map(), loaded: new Set() };
HDA.sbInit = function () {
  if (HDA.sb.worker) return;
  const w = new Worker(HDA.SANDBOX_WORKER || 'worker.js');
  HDA.sb.worker = w; HDA.sb.ready = Promise.resolve();
  w.onmessage = ev => {
    const m = HDA.sb.wait.get(ev.data && ev.data.id); if (!m) return;
    HDA.sb.wait.delete(ev.data.id); clearTimeout(m.t); m.resolve(ev.data);
  };
};
/** Phân tích chạy quá lâu → hủy worker, tạo lại và nạp lại dữ liệu đang có. */
HDA.sbReset = async function () {
  try { HDA.sb.worker && HDA.sb.worker.terminate(); } catch (e) {}
  HDA.sb.worker = null; HDA.sb.wait.forEach(m => { clearTimeout(m.t); m.resolve({ ok: false, error: 'Đã dừng phân tích' }); }); HDA.sb.wait.clear();
  HDA.sbInit();
  for (const [name, e] of HDA.cache) { try { await HDA.sbCall({ cmd: 'set', name, value: e.rows }, 30000); } catch (x) {} }
};
HDA.sbCall = async function (msg, ms) {
  HDA.sbInit(); await HDA.sb.ready;
  const id = ++HDA.sb.seq;
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { HDA.sb.wait.delete(id); reject(new Error('Phân tích quá ' + Math.round((ms || 20000) / 1000) + ' giây')); if (msg.cmd === 'run') HDA.sbReset(); }, ms || 20000);
    HDA.sb.wait.set(id, { resolve, t });
    HDA.sb.worker.postMessage(Object.assign({ id }, msg));
  });
};

/* ============================ BỘ DỮ LIỆU ============================ */
HDA.cache = new Map(); // name -> {rows, at, source, key}
HDA.robust = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]/g, '');

HDA.loadDataset = async function (name, params, ctx) {
  params = params || {};
  const def = HDA_DATASETS[name];
  if (!def) throw new Error('Không có bộ dữ liệu "' + name + '". Có: ' + Object.keys(HDA_DATASETS).join(', '));
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date || '') ? params.date : HDA.ymd(new Date());
  const cacheKey = name + '|' + (def.path.includes('{date}') ? date : '');
  const hit = HDA.cache.get(name);
  if (hit && hit.key === cacheKey && !params.refresh && Date.now() - hit.at < 120000) return hit;

  let rows = null, source = '';
  if (def.live === 'orders' && ctx && ctx.liveOrders) {
    try { const r = await ctx.liveOrders(); if (r && r.ok && r.rows && r.rows.length) { rows = r.rows; source = 'màn hình Module 02 (đúng dữ liệu đang hiển thị)'; } } catch (e) {}
  }
  if (!rows) {
    const data = await HDA.fbGet(def.db, def.path.replace('{date}', date));
    if (def.flatten === 'daily') {
      rows = [];
      Object.keys(data || {}).forEach(sk => {
        const staff = data[sk] || {};
        Object.keys(staff).forEach(ck => { const r = staff[ck] || {}; rows.push({ date, staffName: r.staffName || '', customerId: r.customerId || '', customerName: r.customerName || '', at: r.at || '' }); });
      });
    } else if (def.flatten === 'json') {
      // Module 05 lưu cả file Excel dưới dạng chuỗi JSON
      let v = data;
      if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = []; } }
      rows = Array.isArray(v) ? v.map((r, i) => Object.assign({ _key: String(i) }, r)) : HDA.toRows(v);
    } else if (def.flatten === 'nested2') {
      rows = [];
      Object.keys(data || {}).forEach(k1 => Object.keys((data || {})[k1] || {}).forEach(k2 => {
        const r = data[k1][k2]; if (r && typeof r === 'object') rows.push(Object.assign({ month: k1, _key: k2 }, r));
      }));
    } else if (def.flatten === 'dropped') {
      const p2 = await HDA.fbGet(def.db, 'period2_analysis').catch(() => null) || {};
      const dropped = p2.products || {}, missing = p2.missing || {}, fresh = new Set((p2.newCustomers || []).map(x => x && (x.key || x.name)));
      rows = HDA.toRows(data).map(c => ({
        key: c.key || c._key, name: c.name || '', phone: c.phone || '', contactPerson: c.contactPerson || '',
        productsPrev: Array.isArray(c.products) ? c.products : [],
        droppedProducts: Array.isArray(dropped[c.key || c._key]) ? dropped[c.key || c._key] : [],
        notOrderThisPeriod: !!missing[c.key || c._key],
        isNew: fresh.has(c.key) || fresh.has(c.name)
      }));
      (p2.newCustomers || []).forEach(n => { if (n && !rows.find(r => r.key === n.key)) rows.push(Object.assign({ isNew: true, productsPrev: [], droppedProducts: [], notOrderThisPeriod: false }, n)); });
      rows.analysisSavedAt = p2.savedAt || '';
    } else if (def.flatten === 'promo') {
      const today = HDA.ymd(new Date());
      rows = HDA.toRows(data).filter(r => r && (r.name || r.content || r.ten)).map(r => {
        const from = String(r.from || '').slice(0, 10), to = String(r.to || '').slice(0, 10);
        const status = r.active === false ? 'Tạm tắt' : (from && today < from) ? 'Sắp chạy' : (to && today > to) ? 'Hết hạn' : 'Đang chạy';
        return Object.assign({}, r, { status });
      });
      rows.sort((a, b) => (a.status === 'Đang chạy' ? 0 : 1) - (b.status === 'Đang chạy' ? 0 : 1) || String(b.from || '').localeCompare(String(a.from || '')));
    } else rows = HDA.toRows(data);
    source = 'Firebase ' + def.db + '/' + def.path.replace('{date}', date);
    if (name === 'orders_customers') {
      // áp sổ giao NV giống Module 02
      try {
        const assign = await HDA.fbGet('quetbarcode', 'customerManagement/staffAssign');
        if (assign) rows.forEach(c => {
          const k = (HDA.robust(c.code) ? 'c:' + HDA.robust(c.code) : 'n:' + HDA.robust(c.name)).replace(/[.#$\[\]\/]/g, '_');
          const a = assign[k]; if (a && typeof a.staff === 'string') c.staff = a.staff;
        });
      } catch (e) {}
    }
  }
  const entry = { name, rows, at: Date.now(), source, key: cacheKey };
  HDA.cache.set(name, entry);
  await HDA.sbCall({ cmd: 'set', name, value: rows }, 30000);
  return entry;
};

/** Tóm tắt cấu trúc dữ liệu để AI hiểu mà không phải gửi toàn bộ. */
HDA.summarize = function (rows, name) {
  const n = rows.length;
  const freq = {}, types = {}, distinct = {};
  rows.slice(0, 3000).forEach(r => {
    Object.keys(r || {}).forEach(k => {
      freq[k] = (freq[k] || 0) + 1;
      const v = r[k];
      const t = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
      (types[k] = types[k] || new Set()).add(t);
      if (typeof v === 'string' || typeof v === 'boolean') {
        const d = distinct[k] = distinct[k] || new Map();
        if (d.size <= 41) d.set(String(v), (d.get(String(v)) || 0) + 1);
      }
    });
  });
  const fields = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 45)
    .map(k => k + ':' + [...types[k]].join('/') + '(' + freq[k] + ')');
  const cats = {};
  Object.keys(distinct).forEach(k => {
    const d = distinct[k];
    if (d.size > 0 && d.size <= 40 && !/^_key$|phone|address|report|note|name$|^id$/i.test(k)) cats[k] = [...d.entries()].sort((a, b) => b[1] - a[1]).map(([v, c]) => (v.length > 40 ? v.slice(0, 40) + '…' : v) + ' (' + c + ')');
  });
  const shrink = v => {
    if (Array.isArray(v)) return '[' + v.length + ' phần tử' + (v[0] && typeof v[0] === 'object' ? ' {' + Object.keys(v[0]).slice(0, 8).join(',') + '}' : '') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).slice(0, 8).join(',') + '}';
    if (typeof v === 'string' && v.length > 100) return v.slice(0, 100) + '…';
    return v;
  };
  const sample = rows.slice(0, 2).map(r => { const o = {}; Object.keys(r || {}).slice(0, 30).forEach(k => { o[k] = shrink(r[k]); }); return o; });
  return { dataset: name, rows: n, fields, categories: cats, sample };
};

/* ============================ EXCEL ============================ */
HDA.toExcel = async function (rows, filename, columns, sheetName) {
  if (!Array.isArray(rows)) {
    if (rows && typeof rows === 'object') {
      const arr = Object.values(rows).find(Array.isArray);
      rows = arr || Object.keys(rows).map(k => ({ 'Nhóm': k, 'Giá trị': typeof rows[k] === 'object' ? JSON.stringify(rows[k]) : rows[k] }));
    } else throw new Error('Không có dữ liệu dạng danh sách để xuất Excel');
  }
  if (!rows.length) throw new Error('Danh sách rỗng — không có gì để xuất');
  const flat = v => v == null ? '' : Array.isArray(v) ? v.map(x => typeof x === 'object' ? JSON.stringify(x) : x).join('; ') : typeof v === 'object' ? JSON.stringify(v) : typeof v === 'boolean' ? (v ? 'TRUE' : '') : v;
  let cols = Array.isArray(columns) && columns.length ? columns.map(c => typeof c === 'string' ? { key: c, label: c } : { key: c.key, label: c.label || c.key }) : null;
  if (!cols) { const ks = []; rows.forEach(r => Object.keys(r || {}).forEach(k => { if (!ks.includes(k) && k !== '_key') ks.push(k); })); cols = ks.slice(0, 40).map(k => ({ key: k, label: k })); }
  const aoa = [['STT'].concat(cols.map(c => c.label))];
  rows.forEach((r, i) => aoa.push([i + 1].concat(cols.map(c => flat(r ? r[c.key] : '')))));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = aoa[0].map((h, ci) => ({ wch: Math.min(60, Math.max(6, ...aoa.slice(0, 300).map(row => String(row[ci] == null ? '' : row[ci]).length + 2))) }));
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: aoa[0].length - 1 } }) };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, String(sheetName || 'Huyen').slice(0, 31).replace(/[\\\/?*\[\]:]/g, ' '));
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  let fn = String(filename || 'HUYEN_KPI_KHACH_HANG').replace(/[\\\/:*?"<>|]+/g, '_').replace(/\.xlsx$/i, '');
  fn += '_' + HDA.ymd(new Date()).replace(/-/g, '') + '.xlsx';
  await HDA.saveBlob(blob, fn);
  return { filename: fn, rows: rows.length, columns: cols.map(c => c.label) };
};
