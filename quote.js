/* HUYỀN KPI MOBILE — 💰 GỬI BÁO GIÁ (lấy từ HUYỀN MARKETING 2).
 * Mở website báo giá https://duocphamideco.github.io/bangbaogia/ ngay trong ứng dụng (cùng tên miền),
 * dùng đúng bộ xuất Excel của HUYỀN MARKETING 2 (mkt-quote-core.js + mkt-quote-adapter.js) để tạo file báo giá
 * theo sản phẩm + mức giá đã chọn, rồi gửi Zalo trên điện thoại bằng bảng Chia sẻ của máy.
 * Không sửa dữ liệu website / Firebase: chỉ đọc bảng giá + danh sách khách đã lưu của HUYỀN MARKETING. */
'use strict';
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
  const money = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n).toLocaleString('vi-VN') + ' đ' : ''; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const LS = 'hdam:quote';
  const TIER_NAME = { 0: 'Đầy đủ mức giá', 6: 'Mua từ 6 hộp', 12: 'Từ 12 hộp trở lên' };

  /* ---------------- cài đặt riêng của Báo giá (lưu trên máy, không đè Cài đặt dùng chung) ---------------- */
  const DEF = (typeof HDA_DEFAULT_SETTINGS !== 'undefined' && HDA_DEFAULT_SETTINGS.quote) || {};
  function cfg() { let c = {}; try { c = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) {} return Object.assign({}, DEF, c); }
  function saveCfg(patch) { const c = Object.assign(cfg(), patch); try { localStorage.setItem(LS, JSON.stringify(c)); } catch (e) {} return c; }
  const passList = () => [...new Set(String(cfg().passwords || '').split(/[\n,]+/).map(x => x.trim()).filter(Boolean).concat(['congtyideco@2026', 'congtyideco2026']))];

  const st = { frame: null, ready: null, products: [], selected: new Set(), tier: 12, customers: [], cust: null, file: null, cat: '', q: '', kq: '', busy: false };

  /* ---------------- KHÁCH HÀNG (danh sách đã lưu của HUYỀN MARKETING) ---------------- */
  function firstPhone(t) { const m = String(t == null ? '' : t).replace(/[.\s\-()]/g, '').match(/(?:\+?84|0)\d{9,10}/); if (!m) return ''; let d = m[0].replace(/^\+/, ''); if (/^84/.test(d)) d = '0' + d.slice(2); return d; }
  const custPhone = x => (x && (firstPhone(x.sdt) || firstPhone(x.hl))) || '';
  function custContact(x) { if (!x) return ''; if (x.lh) return x.lh; return (x.hl || '').split(' · ').filter(p => p.replace(/\D/g, '').length < 8)[0] || ''; }
  function cleanContact(t) { const s = String(t || '').replace(/\s*[-–(].*$/, '').replace(/\s+/g, ' ').trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
  function xungHo(c) { const w = fold(c).split(' ')[0] || ''; return ({ anh: 'anh', chi: 'chị', co: 'cô', chu: 'chú', em: 'em', ong: 'ông', ba: 'bà', bac: 'bác', thay: 'thầy' })[w] || ''; }
  function personalize(tpl, c) {
    const lh = cleanContact(custContact(c)), xh = xungHo(lh), d = new Date();
    const map = { ten: c ? c.ten : 'Quý khách', lienhe: lh || 'Quý khách', xungho: xh || (lh ? 'anh/chị' : 'Quý khách'), ma: (c && c.ma) || '', sdt: custPhone(c),
      nv: String((c && c.nv) || '').replace(/\s*[-–].*$/, '').trim() || 'IDECO', ngay: ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear() };
    const alias = { tenkhachhang: 'ten', khachhang: 'ten', tenkh: 'ten', nhathuoc: 'ten', nguoilienhe: 'lienhe', nguoiphutrach: 'lienhe', danhxung: 'xungho', makh: 'ma', sodienthoai: 'sdt', nhanvien: 'nv' };
    return String(tpl || '').replace(/\{([^{}]{1,30})\}/g, (m, k) => { const key = fold(k).replace(/[^a-z]/g, ''); const kk = map[key] !== undefined ? key : alias[key]; return kk && map[kk] !== undefined ? map[kk] : m; });
  }
  async function loadCustomers(force) {
    if (st.customers.length && !force) return st.customers;
    const c = cfg();
    const r = await fetch(String(c.custDb).replace(/\/+$/, '') + '/' + c.custPath + '.json', { cache: 'no-store' });
    if (!r.ok) throw new Error('Không đọc được danh sách khách (HTTP ' + r.status + ')');
    const v = await r.json();
    let arr = v && v.items; if (arr && !Array.isArray(arr)) arr = Object.values(arr);
    st.customers = (Array.isArray(arr) ? arr : []).filter(x => x && String(x.ten || '').trim())
      .map(x => ({ ma: String(x.ma || '').trim(), ten: String(x.ten || '').trim(), hl: String(x.hl || '').trim(), sdt: String(x.sdt || '').trim(), lh: x.lh ? String(x.lh).trim() : '', nv: x.nv ? String(x.nv).trim() : '' }));
    return st.customers;
  }

  /* ---------------- WEBSITE BÁO GIÁ trong ứng dụng ---------------- */
  let SRC = null;
  const srcs = async () => SRC || (SRC = (await Promise.all(['mkt-quote-core.js', 'mkt-quote-adapter.js'].map(f => fetch(f, { cache: 'no-cache' }).then(r => r.text())))));
  function site() {
    if (st.frame && st.frame.isConnected) return st.frame;
    const f = document.createElement('iframe');
    f.className = 'quote-site'; f.title = 'Bảng báo giá IDECO';
    f.setAttribute('allow', 'clipboard-read; clipboard-write');
    document.body.appendChild(f);
    st.frame = f; st.ready = null;
    f.src = cfg().url;
    return f;
  }
  async function win() {
    const f = site();
    if (!st.ready) st.ready = (async () => {
      await new Promise(r => { if (f.contentDocument && f.contentDocument.readyState === 'complete' && f.contentWindow.location.href !== 'about:blank') r(); else { f.addEventListener('load', r, { once: true }); setTimeout(r, 45000); } });
      let w; try { w = f.contentWindow; void w.document.body; } catch (e) { throw new Error('Không mở được website báo giá trong ứng dụng (ứng dụng phải đặt trên duocphamideco.github.io).'); }
      const [core, adapter] = await srcs();
      if (!w.HuyenQuoteCore) w.eval(core);
      if (!w.__IDECO_QUOTE2) w.eval(adapter);
      return w;
    })().catch(e => { st.ready = null; throw e; });
    const w = await st.ready;
    if (!w.__IDECO_QUOTE2) { const [core, adapter] = await srcs(); if (!w.HuyenQuoteCore) w.eval(core); w.eval(adapter); }
    return w;
  }
  async function snapshot(timeout) {
    const w = await win();
    const end = Date.now() + (timeout || 45000);
    let last = null;
    while (Date.now() < end) {
      try { const s = w.__IDECO_QUOTE2.snapshot(); if (s.products.length) return JSON.parse(JSON.stringify(s)); } catch (e) { last = e; }
      await sleep(400);
    }
    throw new Error((last && last.message) || 'Bảng giá chưa tải xong sản phẩm. Kiểm tra mạng rồi bấm ⟳.');
  }
  async function refreshProducts(keepSel) {
    status('⏳ Đang mở bảng giá…');
    const s = await snapshot();
    st.products = s.products;
    if (!keepSel) { st.selected = new Set(s.selected.filter(c => s.products.some(p => p.code === c))); }
    else st.selected = new Set([...st.selected].filter(c => s.products.some(p => p.code === c)));
    status('✅ ' + s.products.length + ' sản phẩm trên bảng giá');
    paintProducts(); paintSummary();
    return s;
  }

  /** Xuất file Excel báo giá bằng chính nút "Xuất báo giá Excel" của website (qua bộ chuyển của HUYỀN MARKETING 2). */
  async function exportQuote(codes, tier) {
    const w = await win();
    await snapshot();
    let lastErr = null;
    for (const pw of passList()) {
      try {
        const r = await w.__IDECO_QUOTE2.exportFile({ codes: codes.slice(), tier: Number(tier), password: pw });
        const bin = atob(r.dataUrl.split(',')[1]); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        const name = r.name.replace(/_[0-9a-f]{8}\.xlsx$/i, '.xlsx');
        return { blob: new Blob([u8], { type: r.mime }), filename: name, size: r.size, tier: r.tier, codes: r.codes };
      } catch (e) {
        lastErr = e;
        if (!/mật khẩu/i.test(String(e.message))) throw e;
        try { const m = w.document.getElementById('quoteSettingsLoginMessage'); if (m) m.classList.add('hidden'); } catch (y) {}
        await sleep(400);
      }
    }
    throw new Error((lastErr && lastErr.message) || 'Không xuất được báo giá') ;
  }

  /* ---------------- GỬI ZALO trên điện thoại ---------------- */
  async function copy(t) { try { await navigator.clipboard.writeText(t); return true; } catch (e) { return false; } }
  async function shareZalo(file, text) {
    const f = new File([file.blob], file.filename, { type: file.blob.type });
    await copy(text);
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      try { await navigator.share({ files: [f], text, title: file.filename }); return 'shared'; }
      catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
    }
    HDA.saveBlob ? HDA.saveBlob(file.blob, file.filename) : null;
    return 'downloaded';
  }
  const zaloLink = phone => 'https://zalo.me/' + String(phone || '').replace(/\D/g, '');

  /* ---------------- GIAO DIỆN ---------------- */
  const view = () => $('#view-quote');
  function status(t) { const e = $('#qtStatus'); if (e) e.textContent = t; }
  function priceOf(p, tier) { return tier === 6 ? p.price6 : tier === 12 ? p.price12 : p.price; }
  function paintProducts() {
    const box = $('#qtProducts'); if (!box) return;
    const cats = [...new Set(st.products.map(p => p.category).filter(Boolean))];
    const sel = $('#qtCat');
    if (sel && sel.options.length !== cats.length + 1) sel.innerHTML = '<option value="">Tất cả nhóm</option>' + cats.map(c => '<option>' + esc(c) + '</option>').join('');
    if (sel) sel.value = st.cat;
    const q = fold(st.q);
    const list = st.products.filter(p => (!st.cat || p.category === st.cat) && (!q || fold(p.name + ' ' + p.code).includes(q)));
    const show = list.slice(0, 200);
    box.innerHTML = show.map(p => {
      const pr = money(priceOf(p, st.tier)) || money(p.price);
      return '<label class="qt-row' + (st.selected.has(p.code) ? ' on' : '') + '"><input type="checkbox" data-code="' + esc(p.code) + '"' + (st.selected.has(p.code) ? ' checked' : '') + '>' +
        '<span class="qt-name"><b>' + esc(p.name) + '</b><small>' + esc(p.code) + (p.category ? ' · ' + esc(p.category) : '') + '</small></span><span class="qt-price">' + esc(pr) + '</span></label>';
    }).join('') + (list.length > show.length ? '<p class="muted">… còn ' + (list.length - show.length) + ' sản phẩm — gõ tìm để thu hẹp.</p>' : '') +
      (!list.length ? '<p class="muted">Không có sản phẩm khớp.</p>' : '');
  }
  function paintCustomers() {
    const box = $('#qtCustList'); if (!box) return;
    const q = fold(st.kq), dq = st.kq.replace(/\D/g, '');
    if (!q) { box.innerHTML = ''; return; }
    const list = st.customers.filter(c => fold(c.ten + ' ' + c.ma + ' ' + (c.lh || '') + ' ' + (c.nv || '')).includes(q) || (dq.length >= 4 && custPhone(c).includes(dq))).slice(0, 30);
    box.innerHTML = list.map((c, i) => '<button class="qt-cust" data-i="' + st.customers.indexOf(c) + '"><b>' + esc(c.ten) + '</b><small>' + esc([c.ma, custPhone(c), cleanContact(custContact(c)), c.nv].filter(Boolean).join(' · ')) + '</small></button>').join('') ||
      '<p class="muted">Không thấy khách trong danh sách đã lưu — có thể nhập SĐT Zalo bên dưới.</p>';
  }
  function paintSummary() {
    const n = st.selected.size;
    const el = $('#qtSelInfo'); if (el) el.textContent = n ? 'Đã chọn ' + n + ' sản phẩm' : 'Chưa chọn sản phẩm';
    document.querySelectorAll('#qtTier button').forEach(b => b.classList.toggle('on', Number(b.dataset.t) === st.tier));
    const c = st.cust;
    $('#qtCustSel').innerHTML = c ? '<div class="qt-picked"><b>' + esc(c.ten) + '</b><small>' + esc([c.ma, custPhone(c) || 'chưa có SĐT', cleanContact(custContact(c))].filter(Boolean).join(' · ')) + '</small><button class="ghost" id="qtCustX">✕</button></div>' : '';
    const x = $('#qtCustX'); if (x) x.onclick = () => { st.cust = null; paintSummary(); };
    const phone = ($('#qtPhone').value || '').replace(/\D/g, '') || custPhone(c);
    $('#qtPreview').textContent = personalize($('#qtMsg').value, c);
    $('#qtZaloChat').disabled = !(phone.length >= 9);
    $('#qtMake').disabled = !n || st.busy;
    const f = st.file;
    $('#qtFile').innerHTML = f ? '📗 <b>' + esc(f.filename) + '</b> · ' + Math.max(1, Math.round(f.size / 1024)) + ' KB · ' + esc(TIER_NAME[f.tier]) + ' · ' + f.codes.length + ' SP' : '';
    $('#qtSend').disabled = !f; $('#qtSave').disabled = !f;
  }

  function mount() {
    const v = view(); if (!v || v.dataset.mounted) return; v.dataset.mounted = '1';
    const c = cfg();
    v.innerHTML = `
<div class="qt-wrap">
  <div class="card qt-head">
    <div class="row"><b class="sp-flex">💰 Gửi báo giá Zalo</b><button class="ghost" id="qtSite" title="Xem website báo giá">🌐 Website</button><button class="ghost" id="qtReload" title="Tải lại bảng giá">⟳</button></div>
    <p class="muted" id="qtStatus">Bấm vào đây để mở bảng giá…</p>
  </div>
  <div class="card">
    <h3>1️⃣ Chọn sản phẩm <span class="qt-badge" id="qtSelInfo"></span></h3>
    <div class="row qt-filter"><input id="qtSearch" type="search" placeholder="🔎 Tìm tên / mã thuốc"><select id="qtCat"><option value="">Tất cả nhóm</option></select></div>
    <div class="row wrap qt-mini"><button class="ghost" id="qtAll">☑ Chọn tất cả đang lọc</button><button class="ghost" id="qtNone">✕ Bỏ chọn hết</button></div>
    <div class="qt-list" id="qtProducts"></div>
  </div>
  <div class="card">
    <h3>2️⃣ Mức giá báo</h3>
    <div class="qt-seg" id="qtTier"><button data-t="0">Đầy đủ</button><button data-t="6">Từ 6 hộp</button><button data-t="12">Từ 12 hộp+</button></div>
  </div>
  <div class="card">
    <h3>3️⃣ Khách hàng</h3>
    <input id="qtCustQ" type="search" placeholder="🔎 Tên nhà thuốc / mã KH / SĐT" class="qt-input">
    <div id="qtCustList" class="qt-custs"></div>
    <div id="qtCustSel"></div>
    <label class="lbl">SĐT Zalo (để trống = dùng SĐT của khách) <input id="qtPhone" type="tel" inputmode="tel" placeholder="vd. 0909123456"></label>
    <label class="lbl">Lời nhắn kèm theo ({lienhe} {ten} {xungho} {ngay} tự thay theo khách)
      <textarea id="qtMsg" rows="3"></textarea></label>
    <div class="tpl-preview" id="qtPreview"></div>
  </div>
  <div class="card qt-actions">
    <button class="primary wide" id="qtMake">📗 Tạo file báo giá Excel</button>
    <div id="qtFile" class="qt-file"></div>
    <div class="row wrap">
      <button class="primary" id="qtSend" disabled>📤 Gửi Zalo</button>
      <button class="ghost" id="qtZaloChat" disabled>💬 Mở chat Zalo khách</button>
      <button class="ghost" id="qtSave" disabled>⬇️ Lưu file</button>
    </div>
    <p class="muted">📤 Gửi Zalo: chọn <b>Zalo</b> trong bảng chia sẻ → chọn đúng khách → Gửi. Lời nhắn đã được chép sẵn, giữ ô chat Zalo → <b>Dán</b> nếu Zalo không tự điền.</p>
  </div>
</div>`;
    $('#qtMsg').value = c.tpl || '';
    $('#qtSearch').addEventListener('input', e => { st.q = e.target.value; paintProducts(); });
    $('#qtCat').addEventListener('change', e => { st.cat = e.target.value; paintProducts(); });
    $('#qtProducts').addEventListener('change', e => {
      const code = e.target.dataset && e.target.dataset.code; if (!code) return;
      if (e.target.checked) st.selected.add(code); else st.selected.delete(code);
      e.target.closest('.qt-row').classList.toggle('on', e.target.checked);
      st.file = null; paintSummary();
    });
    $('#qtAll').onclick = () => { const q = fold(st.q); st.products.filter(p => (!st.cat || p.category === st.cat) && (!q || fold(p.name + ' ' + p.code).includes(q))).forEach(p => st.selected.add(p.code)); st.file = null; paintProducts(); paintSummary(); };
    $('#qtNone').onclick = () => { st.selected.clear(); st.file = null; paintProducts(); paintSummary(); };
    $('#qtTier').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.tier = Number(b.dataset.t); st.file = null; paintProducts(); paintSummary(); });
    $('#qtCustQ').addEventListener('focus', () => loadCustomers().then(paintCustomers).catch(e => status('⚠️ ' + e.message)), { once: true });
    $('#qtCustQ').addEventListener('input', e => { st.kq = e.target.value; loadCustomers().then(paintCustomers).catch(err => status('⚠️ ' + err.message)); });
    $('#qtCustList').addEventListener('click', e => { const b = e.target.closest('.qt-cust'); if (!b) return; st.cust = st.customers[+b.dataset.i]; st.kq = ''; $('#qtCustQ').value = ''; paintCustomers(); paintSummary(); });
    $('#qtPhone').addEventListener('input', paintSummary);
    $('#qtMsg').addEventListener('input', () => { saveCfg({ tpl: $('#qtMsg').value }); paintSummary(); });
    $('#qtReload').onclick = () => { if (st.frame) { st.frame.remove(); st.frame = null; st.ready = null; } refreshProducts(true).catch(e => status('⚠️ ' + e.message)); };
    $('#qtSite').onclick = () => toggleSite(true);
    $('#qtMake').onclick = make;
    $('#qtSend').onclick = async () => {
      if (!st.file) return;
      const r = await shareZalo(st.file, personalize($('#qtMsg').value, st.cust));
      status(r === 'shared' ? '✅ Đã mở Zalo để gửi báo giá' + (st.cust ? ' cho ' + st.cust.ten : '') : r === 'cancel' ? 'Đã hủy chia sẻ' : '⬇️ Máy không hỗ trợ chia sẻ file — đã lưu file, mở Zalo và đính kèm thủ công.');
    };
    $('#qtZaloChat').onclick = async () => {
      const phone = ($('#qtPhone').value || '').replace(/\D/g, '') || custPhone(st.cust);
      await copy(personalize($('#qtMsg').value, st.cust));
      window.open(zaloLink(phone), '_blank');
    };
    $('#qtSave').onclick = () => st.file && HDA.saveBlob(st.file.blob, st.file.filename);
    const close = document.createElement('button'); close.className = 'qt-site-close primary'; close.id = 'qtSiteClose'; close.textContent = '✓ Xong — dùng các SP đã chọn trên website'; close.hidden = true;
    close.onclick = () => toggleSite(false);
    document.body.appendChild(close);
    paintSummary();
  }
  function toggleSite(on) {
    site();
    document.body.classList.toggle('show-quote-site', !!on);
    $('#qtSiteClose').hidden = !on;
    if (!on) refreshProducts(false).catch(e => status('⚠️ ' + e.message));
  }
  async function make() {
    if (st.busy || !st.selected.size) return;
    st.busy = true; st.file = null; paintSummary();
    const b = $('#qtMake'); b.textContent = '⏳ Đang tạo báo giá trên website…';
    try {
      const codes = st.products.filter(p => st.selected.has(p.code)).map(p => p.code);
      st.file = await exportQuote(codes, st.tier);
      status('✅ Đã tạo báo giá — bấm 📤 Gửi Zalo');
    } catch (e) { status('⚠️ ' + (e.message || e)); }
    finally { st.busy = false; b.textContent = '📗 Tạo file báo giá Excel'; paintSummary(); }
  }

  /* ---------------- dùng từ CHAT (Huyền 6.1) ---------------- */
  /** Gửi chính TỆP người dùng đính kèm (bảng giá Excel/PDF/ảnh) cho khách — không cần mở website. */
  async function sendAttached(text) {
    const files = (HDA.lastAttachments || []).filter(f => f && f.blob);
    if (!files.length) throw new Error('Chưa có tệp đính kèm. Bấm 📎 chọn file bảng giá rồi gửi lại lệnh.');
    await loadCustomers().catch(() => []);
    const core = window.HuyenQuoteCore || (await win()).HuyenQuoteCore;
    const cap = text.match(/(?:tin nhắn|lời nhắn|nội dung|kèm lời)\s*[:：]\s*([\s\S]*)$/iu);
    const head = cap ? text.slice(0, cap.index) : text;
    const m = head.replace(/,\s*$/, '').match(/cho\s+(?:các\s+)?(?:khách hàng|khách|kh|nhà thuốc)\s*[:：]?\s*([\s\S]+?)(?:\s+(?:qua|bằng|trên)\s+zalo[\s\S]*)?$/iu);
    let cust = null;
    if (m) cust = core.resolve([m[1].replace(/[.,!?]+$/, '').trim()], st.customers, 'ten', 'ma')[0];
    mount();
    if (cust) st.cust = cust;
    const msg = cap ? cap[1].trim() : $('#qtMsg').value;
    const textOut = personalize(msg, cust);
    const msgs = document.getElementById('msgs');
    const d = document.createElement('div'); d.className = 'file qt-chat-card';
    d.innerHTML = '<span>📎 ' + esc(files.map(f => f.name).join(', ')) + (cust ? ' · ' + esc(cust.ten) + (custPhone(cust) ? ' · ' + esc(custPhone(cust)) : '') : '') + '</span>';
    const b1 = document.createElement('button'); b1.className = 'primary'; b1.textContent = '📤 Gửi Zalo';
    b1.onclick = async () => {
      const fl = files.map(f => new File([f.blob], f.name, { type: f.type || f.blob.type || 'application/octet-stream' }));
      await copy(textOut);
      if (navigator.canShare && navigator.canShare({ files: fl })) { try { await navigator.share({ files: fl, text: textOut }); } catch (e) {} }
      else fl.forEach(f => HDA.saveBlob(f, f.name));
    };
    d.appendChild(b1);
    if (cust && custPhone(cust)) { const b2 = document.createElement('button'); b2.className = 'ghost'; b2.textContent = '💬 Mở chat Zalo'; b2.onclick = async () => { await copy(textOut); window.open(zaloLink(custPhone(cust)), '_blank'); }; d.appendChild(b2); }
    if (msgs) { msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; }
    return { ok: true, files: files.map(f => f.name), customer: cust ? { ten: cust.ten, ma: cust.ma, sdt: custPhone(cust) } : null, message: textOut,
      note: 'Đã sẵn sàng. Người dùng bấm "📤 Gửi Zalo" trong chat → chọn Zalo → chọn khách → Gửi.' };
  }

  async function chatQuote(a) {
    let text0 = String(a.text || a.request || '').replace(/gởi/giu, 'gửi');
    if (a.useAttachment || /(file|tệp|tep)\s+(bảng giá|báo giá|bang gia|bao gia)?\s*(excel|pdf|ảnh)?\s*(đính kèm|dinh kem)|đính kèm/iu.test(text0)) return sendAttached(text0);
    // "đầy đủ mức giá" → mẫu đầy đủ (bộ đọc lệnh chỉ hiểu số hộp)
    if (/đầy đủ(?:\s+mức)?(?:\s+giá)?|giá đầy đủ|tất cả mức(?:\s+giá)?/iu.test(text0)) { a.tier = 0; text0 = text0.replace(/(?:giá\s+)?đầy đủ(?:\s+mức)?(?:\s+giá)?|tất cả mức(?:\s+giá)?/giu, ' ').replace(/\s{2,}/g, ' '); }
    a = Object.assign({}, a, { text: text0 });
    mount();
    const s = await refreshProducts(true);
    await loadCustomers().catch(() => []);
    const core = (await win()).HuyenQuoteCore;
    const text = String(a.text || a.request || '');
    const p = core.plan(text, s, st.customers, [], null, null, a.tier != null ? Number(a.tier) : 12);
    st.selected = new Set(p.codes); st.tier = p.tier; st.cust = p.targets[0] || st.cust;
    if (p.caption) { $('#qtMsg').value = p.caption; }
    paintProducts(); paintSummary();
    st.file = await exportQuote(p.codes, p.tier);
    paintSummary();
    addChatCard();
    const names = p.codes.map(c => (st.products.find(x => x.code === c) || {}).name || c);
    return { ok: true, file: st.file.filename, tier: TIER_NAME[p.tier], products: names.slice(0, 40), productCount: names.length, customer: st.cust ? { ten: st.cust.ten, ma: st.cust.ma, sdt: custPhone(st.cust) } : null,
      note: 'Đã tạo file. Trên điện thoại cần NGƯỜI DÙNG bấm nút "📤 Gửi Zalo" hiện trong chat để chọn Zalo và gửi (máy không cho tự gửi).' };
  }
  function addChatCard() {
    const msgs = document.getElementById('msgs'); if (!msgs || !st.file) return;
    const f = st.file, c = st.cust, text = personalize($('#qtMsg').value, c);
    const d = document.createElement('div'); d.className = 'file qt-chat-card';
    d.innerHTML = '<span>📗 ' + esc(f.filename) + ' · ' + esc(TIER_NAME[f.tier]) + ' · ' + f.codes.length + ' SP' + (c ? ' · ' + esc(c.ten) : '') + '</span>';
    const b1 = document.createElement('button'); b1.className = 'primary'; b1.textContent = '📤 Gửi Zalo';
    b1.onclick = () => shareZalo(f, text);
    const b2 = document.createElement('button'); b2.className = 'ghost'; b2.textContent = '💰 Xem / sửa';
    b2.onclick = () => document.querySelector('.tab[data-view="quote"]').click();
    d.append(b1, b2); msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
  }

  /* ---------------- MẪU LỆNH GỬI BÁO GIÁ ---------------- */
  if (typeof HDA_TEMPLATES !== 'undefined' && !HDA_TEMPLATES.some(t => t.id === 'bg1')) {
    const G = '💰 Gửi báo giá Zalo';
    HDA_TEMPLATES.unshift(
      { id: 'bg1', group: G, skill: '', title: 'Gửi báo giá sản phẩm cho khách hàng', need: ['SP', 'MUC', 'KH', 'MSG'], text: 'Gửi báo giá {SP} {MUC} cho khách hàng {KH} qua Zalo{MSG}' },
      { id: 'bg5', group: G, skill: '', title: 'Gửi FILE bảng giá đính kèm (Excel / PDF / ảnh)', need: ['ATT', 'KH', 'MSG'], text: 'Gửi file bảng giá đính kèm cho khách hàng {KH} qua Zalo{MSG}' },
      { id: 'bg2', group: G, skill: '', title: 'Gửi báo giá các SP đang chọn ở tab 💰 Báo giá', need: ['MUC', 'KH', 'MSG'], text: 'Gửi báo giá sản phẩm đã chọn {MUC} cho khách hàng {KH} qua Zalo{MSG}' },
      { id: 'bg3', group: G, skill: '', title: 'Gửi báo giá cả nhóm / danh mục', need: ['NHOM', 'MUC', 'KH', 'MSG'], text: 'Gửi báo giá danh mục {NHOM} {MUC} cho khách hàng {KH} qua Zalo{MSG}' },
      { id: 'bg4', group: G, skill: '', title: 'Gửi TOÀN BỘ bảng giá cho khách', need: ['MUC', 'KH', 'MSG'], text: 'Gửi báo giá toàn bộ sản phẩm {MUC} cho khách hàng {KH} qua Zalo{MSG}' },
      { id: 'bg6', group: G, skill: '', title: 'Chỉ xuất file báo giá (chưa gửi)', need: ['SP', 'MUC'], text: 'Xuất báo giá {SP} {MUC}' },
      { id: 'bg7', group: G, skill: '', title: 'Soạn lời nhắn Zalo gửi kèm báo giá', need: ['SP', 'KH'], text: 'Soạn 3 mẫu tin nhắn Zalo ngắn gọn, lịch sự, xưng IDECO, để gửi kèm báo giá {SP} cho khách hàng {KH}: nêu điểm nổi bật sản phẩm, mời đặt hàng; không tự bịa giá.' }
    );
  }

  HDA.quote = { mount, refresh: refreshProducts, exportQuote, chatQuote, personalize, loadCustomers, cfg, saveCfg, _st: st };
  HDA.tools = HDA.tools || {};
  HDA.tools.quote = a => chatQuote(a || {});

  // mở tab lần đầu → nạp bảng giá
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('.tab[data-view="quote"]'); if (!t) return;
    mount();
    if (!st.products.length) refreshProducts(true).catch(err => status('⚠️ ' + err.message));
  });
})();
