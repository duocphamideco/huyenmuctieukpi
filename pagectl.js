/* HUYỀN DASHBOARD — bộ điều khiển chạy trong trang Dashboard (MAIN world).
 * Được nạp bằng chrome.scripting.executeScript({files:['pagectl.js'], world:'MAIN'}).
 * Chỉ làm những gì người dùng làm bằng tay: đăng nhập, mở module, bấm, nhập, lọc, đọc.
 * Không ghi/xóa dữ liệu Firebase. */
(function () {
  if (window.__HDA__ && window.__HDA__.v === 6) return;

  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };

  function kind() {
    if (document.getElementById('idecoLoginGate') || document.getElementById('frames')) return 'bh';
    if (document.getElementById('moduleGrid') && document.getElementById('appFrame')) return 'kpi';
    return 'other';
  }

  function visible(el) {
    if (!el || !el.ownerDocument) return false;
    const w = el.ownerDocument.defaultView;
    if (el.closest && el.closest('[hidden]')) return false;
    const st = w.getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  /** Khung module đang hiển thị (srcdoc cùng origin nên đọc trực tiếp được). */
  function activeFrame() {
    const k = kind();
    let fr = null;
    if (k === 'bh') {
      const view = document.getElementById('appView');
      if (view && view.classList.contains('active')) fr = document.querySelector('.app-frame.active');
    } else if (k === 'kpi') {
      const ws = document.getElementById('workspace');
      if (ws && !ws.classList.contains('hidden')) {
        const g = document.getElementById('goalFrame'), a = document.getElementById('appFrame');
        fr = (a && !a.hidden) ? a : (g && !g.hidden ? g : null);
      }
    }
    try { if (fr && fr.contentDocument && fr.contentDocument.body) return fr; } catch (e) {}
    return null;
  }
  function activeDoc(scope) {
    if (scope === 'top') return document;
    const fr = activeFrame();
    return fr ? fr.contentDocument : document;
  }

  function setValue(el, value) {
    const w = el.ownerDocument.defaultView;
    const proto = el.tagName === 'TEXTAREA' ? w.HTMLTextAreaElement.prototype :
      el.tagName === 'SELECT' ? w.HTMLSelectElement.prototype : w.HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value); else el.value = value;
    el.dispatchEvent(new w.Event('input', { bubbles: true }));
    el.dispatchEvent(new w.Event('change', { bubbles: true }));
  }
  function pressEnter(el) {
    const w = el.ownerDocument.defaultView;
    ['keydown', 'keypress', 'keyup'].forEach(t => el.dispatchEvent(new w.KeyboardEvent(t, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true })));
  }
  function realClick(el) {
    const w = el.ownerDocument.defaultView;
    try { el.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (e) {}
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup'].forEach(t => {
      try { el.dispatchEvent(new w.MouseEvent(t, { bubbles: true, cancelable: true, view: w })); } catch (e) {}
    });
    el.click();
  }
  function submitForm(form, btn) {
    if (!form) { if (btn) realClick(btn); return; }
    if (typeof form.requestSubmit === 'function') form.requestSubmit(btn || undefined);
    else if (btn) realClick(btn); else form.submit();
  }

  /* ----------------------------- ĐĂNG NHẬP ----------------------------- */
  function probe() {
    const k = kind();
    const info = { kind: k, url: location.href, title: document.title, locked: false, module: '', moduleLoaded: false };
    if (k === 'bh') {
      info.locked = document.documentElement.classList.contains('ideco-locked');
      try { info.module = typeof currentApp !== 'undefined' && currentApp ? currentApp : ''; } catch (e) {}
    } else if (k === 'kpi') {
      try { info.goalGate = typeof goalGateActive !== 'undefined' ? !!goalGateActive : false; } catch (e) {}
      const lock = document.getElementById('idecoAgentLock');
      info.agentLockOpen = !!(lock && !lock.hidden);
      const t = document.getElementById('appTitle');
      const ws = document.getElementById('workspace');
      info.module = ws && !ws.classList.contains('hidden') && t ? t.textContent.trim() : '';
    }
    const fr = activeFrame();
    if (fr) {
      try {
        const d = fr.contentDocument;
        info.moduleLoaded = d.readyState !== 'loading' && (d.body.innerText || '').trim().length > 20;
        const pw = [...d.querySelectorAll('input[type=password]')].find(visible);
        info.moduleNeedsPassword = !!pw;
      } catch (e) {}
    }
    return info;
  }

  async function unlock(passwords) {
    const k = kind();
    const list = (passwords || []).filter(Boolean);
    if (k === 'bh') {
      if (!document.documentElement.classList.contains('ideco-locked')) return { ok: true, already: true };
      const input = document.getElementById('idecoLoginPassword');
      const form = document.getElementById('idecoLoginForm');
      if (!input || !form) return { ok: false, error: 'Không thấy ô mật khẩu đăng nhập' };
      const remember = document.getElementById('idecoLoginRemember'); if (remember) remember.checked = true;
      for (const p of list) {
        setValue(input, p);
        submitForm(form, document.getElementById('idecoLoginSubmit'));
        await sleep(250);
        if (!document.documentElement.classList.contains('ideco-locked')) return { ok: true };
      }
      return { ok: false, error: 'Mật khẩu đăng nhập Dashboard chưa đúng (đã thử ' + list.length + ' mật khẩu trong Cài đặt).' };
    }
    if (k === 'kpi') {
      try {
        if (typeof goalGateActive !== 'undefined' && goalGateActive && typeof continueGoalInBackground === 'function') continueGoalInBackground();
      } catch (e) {}
      return { ok: true };
    }
    return { ok: true };
  }

  /** Mở khóa ô mật khẩu bên trong module (vd. app Báo cáo giao dịch KH có màn đăng nhập riêng). */
  async function frameUnlock(passwords) {
    const fr = activeFrame(); if (!fr) return { ok: true, none: true };
    const d = fr.contentDocument;
    const list = (passwords || []).filter(Boolean);
    for (const p of list) {
      const pw = [...d.querySelectorAll('input[type=password]')].find(visible);
      if (!pw) return { ok: true };
      setValue(pw, p);
      const form = pw.closest('form');
      const btn = (form || d).querySelector('button[type=submit], input[type=submit]') ||
        [...(form || d).querySelectorAll('button')].filter(visible).find(b => /dang nhap|mo khoa|vao|login|xac nhan/.test(norm(b.textContent)));
      if (form) submitForm(form, btn); else if (btn) realClick(btn); else pressEnter(pw);
      await sleep(700);
    }
    const still = [...d.querySelectorAll('input[type=password]')].find(visible);
    return still ? { ok: false, error: 'Module yêu cầu mật khẩu riêng — mật khẩu trong Cài đặt chưa đúng.' } : { ok: true };
  }

  /* ----------------------------- MỞ MODULE ----------------------------- */
  async function openModule(moduleId, adminPassword) {
    const k = kind();
    if (k === 'bh') {
      if (typeof openApp !== 'function') return { ok: false, error: 'Trang chưa sẵn sàng' };
      if (!moduleId || moduleId === 'home') { if (typeof showHome === 'function') showHome(); return { ok: true }; }
      const app = (typeof APPS !== 'undefined' ? APPS : []).find(a => a.id === moduleId || a.num === moduleId);
      if (!app) return { ok: false, error: 'Không có module ' + moduleId };
      openApp(app.id);
      return { ok: true, module: app.short || app.menu };
    }
    if (k === 'kpi') {
      if (typeof openApp !== 'function' || typeof modules === 'undefined') return { ok: false, error: 'Trang chưa sẵn sàng' };
      try { if (typeof goalGateActive !== 'undefined' && goalGateActive && typeof continueGoalInBackground === 'function') continueGoalInBackground(); } catch (e) {}
      if (!moduleId || moduleId === 'home') { if (typeof backDashboard === 'function') backDashboard(); return { ok: true }; }
      const m = modules.find(x => x.file === moduleId || x.file.indexOf(moduleId) >= 0 || norm(x.title) === norm(moduleId));
      if (!m) return { ok: false, error: 'Không có module ' + moduleId };
      openApp(m);
      await sleep(150);
      const lock = document.getElementById('idecoAgentLock');
      if (lock && !lock.hidden) {
        if (!adminPassword) return { ok: false, error: 'Module "' + m.title + '" cần mật khẩu quản trị — hãy nhập ở Cài đặt (ô Mật khẩu quản trị module).' };
        const inp = document.getElementById('idecoAgentPassword');
        setValue(inp, adminPassword);
        submitForm(document.getElementById('idecoAgentLockForm'));
        await sleep(250);
        if (!lock.hidden) return { ok: false, error: 'Mật khẩu quản trị module chưa đúng.' };
      }
      return { ok: true, module: m.title };
    }
    return { ok: false, error: 'Đây không phải trang Dashboard IDECO' };
  }

  /* ----------------------------- ĐỌC MÀN HÌNH ----------------------------- */
  function labelOf(el) {
    const d = el.ownerDocument;
    let t = el.getAttribute('aria-label') || el.placeholder || el.title || '';
    if (el.id) { const l = d.querySelector('label[for="' + el.id + '"]'); if (l) t = l.textContent + (t ? ' / ' + t : ''); }
    if (!t) { const l = el.closest('label'); if (l) t = l.textContent; }
    return clip(t, 60);
  }
  function read(opts) {
    opts = opts || {};
    const d = activeDoc(opts.scope);
    const maxRows = Math.min(Number(opts.maxRows) || 25, 120);
    const out = { where: d === document ? 'trang chính' : 'module đang mở', title: d.title, headings: [], buttons: [], inputs: [], selects: [], tables: [], text: '' };
    d.querySelectorAll('h1,h2,h3').forEach(h => { if (visible(h) && out.headings.length < 20) out.headings.push(clip(h.textContent, 90)); });
    const seen = new Set();
    d.querySelectorAll('button,[role=button],[role=tab],a.nav-item,.nav-item,.tab,input[type=button],input[type=submit]').forEach(b => {
      if (!visible(b)) return; const t = clip(b.textContent || b.value || b.title, 50); if (!t || seen.has(t)) return; seen.add(t);
      if (out.buttons.length < 80) out.buttons.push(t);
    });
    d.querySelectorAll('input:not([type=hidden]):not([type=button]):not([type=submit]),textarea').forEach(i => {
      if (!visible(i) || out.inputs.length >= 30) return;
      out.inputs.push({ id: i.id || i.name || '', type: i.type || 'text', label: labelOf(i), value: i.type === 'password' ? '' : clip(i.type === 'checkbox' ? String(i.checked) : i.value, 40) });
    });
    d.querySelectorAll('select').forEach(s => {
      if (!visible(s) || out.selects.length >= 15) return;
      out.selects.push({ id: s.id || s.name || '', label: labelOf(s), selected: clip(s.options[s.selectedIndex] && s.options[s.selectedIndex].text, 40), options: [...s.options].slice(0, 25).map(o => clip(o.text, 40)) });
    });
    d.querySelectorAll('table').forEach(tb => {
      if (!visible(tb) || out.tables.length >= 4) return;
      const head = [...tb.querySelectorAll('thead th, tr:first-child th')].map(th => clip(th.textContent, 30));
      const rows = [...tb.querySelectorAll('tbody tr')].filter(visible);
      out.tables.push({ id: tb.id || '', headers: head, visibleRows: rows.length, rows: rows.slice(0, maxRows).map(r => [...r.cells].map(c => clip(c.textContent, 40)).join(' | ')) });
    });
    out.text = clip(d.body ? d.body.innerText : '', Math.min(Number(opts.maxText) || 2500, 12000));
    return out;
  }

  /* ----------------------------- BẤM / NHẬP ----------------------------- */
  function findClickable(d, text, nth) {
    const q = norm(text); if (!q) return null;
    const sel = 'button,a,[role=button],[role=tab],[role=menuitem],[onclick],.tab,.nav-item,.card,summary,label,li,input[type=button],input[type=submit],th,span,div';
    const cands = [];
    d.querySelectorAll(sel).forEach(el => {
      if (!visible(el)) return;
      const t = norm(el.textContent || el.value || el.title || el.getAttribute('aria-label'));
      if (!t || !t.includes(q)) return;
      const tag = el.tagName;
      const interactive = /^(BUTTON|A|SUMMARY|INPUT|LABEL)$/.test(tag) || el.hasAttribute('onclick') || el.getAttribute('role');
      // ưu tiên phần tử tương tác, chữ khớp sát, chữ ngắn
      const score = (interactive ? 0 : 1000) + (t === q ? 0 : 100) + t.length;
      cands.push({ el, score, t });
    });
    cands.sort((a, b) => a.score - b.score);
    // bỏ phần tử cha nếu đã có phần tử con khớp
    const picked = cands.filter((c, i) => !cands.some((o, j) => j !== i && o.score <= c.score && c.el !== o.el && c.el.contains(o.el) && o.score < 1000));
    return picked[Math.max(0, (Number(nth) || 1) - 1)] || null;
  }
  async function click(text, nth, scope) {
    let d = activeDoc(scope);
    let hit = findClickable(d, text, nth);
    if (!hit && d !== document) { d = document; hit = findClickable(d, text, nth); }
    if (!hit) return { ok: false, error: 'Không thấy nút/mục có chữ "' + text + '" trên màn hình' };
    realClick(hit.el);
    await sleep(400);
    return { ok: true, clicked: clip(hit.el.textContent || hit.el.value, 60), where: d === document ? 'trang chính' : 'module' };
  }
  function findField(d, target) {
    if (!target) return null;
    try { const el = d.querySelector(target.startsWith('#') ? target : '#' + CSS.escape(target)); if (el) return el; } catch (e) {}
    const q = norm(target);
    const fields = [...d.querySelectorAll('input:not([type=hidden]),textarea,select')].filter(visible);
    return fields.find(f => norm(f.id) === q || norm(f.name) === q) ||
      fields.find(f => norm(labelOf(f)).includes(q)) ||
      fields.find(f => norm(f.placeholder).includes(q)) || null;
  }
  async function fill(target, value, enter, scope) {
    let d = activeDoc(scope);
    let el = findField(d, target);
    if (!el && d !== document) { d = document; el = findField(d, target); }
    if (!el) return { ok: false, error: 'Không thấy ô "' + target + '"' };
    if (el.tagName === 'SELECT') {
      const q = norm(value);
      const opt = [...el.options].find(o => norm(o.value) === q || norm(o.text) === q) || [...el.options].find(o => norm(o.text).includes(q) || (q && q.includes(norm(o.text)) && norm(o.text).length > 2));
      if (!opt) return { ok: false, error: 'Ô "' + target + '" không có lựa chọn "' + value + '"', options: [...el.options].slice(0, 40).map(o => o.text) };
      setValue(el, opt.value);
      return { ok: true, field: el.id || labelOf(el), selected: opt.text };
    }
    if (el.type === 'checkbox' || el.type === 'radio') {
      const want = !/^(false|0|off|khong|bo)$/i.test(norm(value));
      if (el.checked !== want) realClick(el);
      return { ok: true, field: el.id || labelOf(el), checked: el.checked };
    }
    el.focus(); setValue(el, String(value == null ? '' : value));
    if (enter) pressEnter(el);
    await sleep(250);
    return { ok: true, field: el.id || labelOf(el) };
  }

  /* --------------------- MODULE 02 · QUẢN LÝ ĐẶT HÀNG --------------------- */
  function ordersWin() {
    const fr = document.getElementById('frame-orders');
    try { return fr && fr.contentWindow && fr.contentDocument && fr.contentDocument.body ? fr.contentWindow : null; } catch (e) { return null; }
  }
  function ordersData() {
    const w = ordersWin(); if (!w) return { ok: false, error: 'Module 02 chưa mở' };
    let list = null;
    try { list = w.eval('typeof customers !== "undefined" && Array.isArray(customers) ? customers : null'); } catch (e) {}
    if (!list || !list.length) return { ok: false, error: 'Module 02 chưa có dữ liệu khách hàng' };
    return { ok: true, rows: JSON.parse(JSON.stringify(list)) };
  }
  function ordersFilterStaff(name) {
    const w = ordersWin(); if (!w) return { ok: false, error: 'Module 02 chưa mở' };
    const d = w.document, sel = d.getElementById('staffSearchInput');
    if (!sel) return { ok: false, error: 'Không thấy ô lọc theo NV' };
    if (!name) { setValue(sel, ''); try { w.searchByStaff(); } catch (e) {} return { ok: true, cleared: true }; }
    const q = norm(name);
    const opts = [...sel.options];
    const opt = opts.find(o => norm(o.text) === q || norm(o.value) === q) || opts.find(o => norm(o.text).includes(q)) || opts.find(o => q.split(' ').every(wd => norm(o.text).includes(wd)));
    if (!opt) {
      // Ô lọc chưa có tên này (danh sách NV chưa khai báo) → lọc trực tiếp theo cột NV phụ trách
      let list; try { list = w.eval('customers'); } catch (e) { list = []; }
      let n = 0;
      d.querySelectorAll('#customerTable tbody tr').forEach(row => {
        const c = list[Number(row.dataset.idx)];
        const ok = !!c && norm(c.staff).includes(q);
        row.style.display = ok ? '' : 'none'; if (ok) n++;
      });
      if (n) return { ok: true, staff: name, visibleRows: n, note: 'lọc trực tiếp theo cột NV phụ trách' };
      return { ok: false, error: 'Không có nhân viên "' + name + '" trong ô lọc', options: opts.map(o => o.text).filter(Boolean).slice(0, 60) };
    }
    setValue(sel, opt.value);
    try { w.searchByStaff(); } catch (e) { return { ok: false, error: 'Lọc NV lỗi: ' + e.message }; }
    const n = [...d.querySelectorAll('#customerTable tbody tr')].filter(r => r.style.display !== 'none').length;
    return { ok: true, staff: opt.text, visibleRows: n };
  }
  function ordersShowOnly(keys, label) {
    const w = ordersWin(); if (!w) return { ok: false, error: 'Module 02 chưa mở' };
    const set = new Set((keys || []).map(k => norm(k)).filter(Boolean));
    let list; try { list = w.eval('customers'); } catch (e) { return { ok: false, error: 'Không đọc được bảng' }; }
    let n = 0;
    w.document.querySelectorAll('#customerTable tbody tr').forEach(row => {
      const c = list[Number(row.dataset.idx)];
      const ok = !set.size || (!!c && (set.has(norm(c.code)) || set.has(norm(c.name))));
      row.style.display = ok ? '' : 'none'; if (ok) n++;
    });
    try { if (set.size && typeof w.idecoToast === 'function') w.idecoToast('🤖 Huyền lọc: ' + n + ' khách hàng' + (label ? ' · ' + label : '')); } catch (e) {}
    return { ok: true, visibleRows: n };
  }

  /** Module 02 chỉ hiện bảng khi đã chọn Bộ phận + NV làm việc. */
  function ordersEnsureStaff(name) {
    const w = ordersWin(); if (!w) return { ok: false, error: 'Module 02 chưa mở' };
    let selected = false;
    try { selected = !!w.eval('isStaffSelected()'); } catch (e) {}
    if (selected) { let cur = ''; try { cur = w.eval('currentStaff.name'); } catch (e) {} return { ok: true, staff: cur, already: true }; }
    if (!name) return { ok: false, error: 'Module 02 chưa chọn NV làm việc nên bảng chưa hiện. Chọn Bộ phận + Nhân viên một lần trên màn hình, hoặc nhập "Tên NV làm việc" ở Cài đặt skill BH.' };
    const sel = w.document.getElementById('staffSelect');
    if (!sel) return { ok: false, error: 'Không thấy ô chọn nhân viên' };
    const q = norm(name);
    const opt = [...sel.options].find(o => o.value !== '' && norm(o.text) === q) || [...sel.options].find(o => o.value !== '' && norm(o.text).includes(q));
    if (!opt) return { ok: false, error: 'Danh sách NV của Module 02 không có "' + name + '"', options: [...sel.options].map(o => o.text).filter(Boolean).slice(0, 40) };
    setValue(sel, opt.value);
    try { w.onStaffChange(); } catch (e) {}
    return { ok: true, staff: opt.text };
  }

    /** Đọc 1 biến toàn cục (chỉ tên biến, không chạy mã) trong module đang mở → bản sao JSON. */
  function moduleVar(name, maxBytes) {
    if (!/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(String(name || ''))) return { ok: false, error: 'Tên biến không hợp lệ' };
    const fr = activeFrame(); if (!fr) return { ok: false, error: 'Chưa mở module nào' };
    let v;
    try { v = fr.contentWindow.eval('typeof ' + name.split('.')[0] + ' === "undefined" ? undefined : ' + name); }
    catch (e) { return { ok: false, error: 'Không đọc được biến ' + name + ': ' + e.message }; }
    if (v === undefined) return { ok: false, error: 'Module không có biến ' + name };
    let json;
    try { json = JSON.stringify(v, (k, x) => (x instanceof Map ? Object.fromEntries(x) : x instanceof Set ? [...x] : (typeof x === 'object' && x && x.nodeType) ? undefined : x)); }
    catch (e) { return { ok: false, error: 'Biến không chuyển được thành dữ liệu: ' + e.message }; }
    if (json && json.length > (maxBytes || 30e6)) return { ok: false, error: 'Biến quá lớn (' + Math.round(json.length / 1e6) + ' MB)' };
    return { ok: true, value: json === undefined ? null : JSON.parse(json) };
  }

  /** Chờ trên màn hình module xuất hiện (hoặc biến mất) một dòng chữ. */
  async function waitFor(text, gone, ms) {
    const q = norm(text); const end = Date.now() + Math.min(Number(ms) || 30000, 600000);
    while (Date.now() < end) {
      const d = activeDoc();
      const t = norm(d && d.body ? d.body.innerText : '');
      const has = !!q && t.includes(q);
      if (gone ? !has : has) return { ok: true, found: !gone, waitedMs: Date.now() - (end - Math.min(Number(ms) || 30000, 600000)) };
      await sleep(1200);
    }
    return { ok: false, error: (gone ? 'Chữ "' + text + '" vẫn còn' : 'Chưa thấy chữ "' + text + '"') + ' sau ' + Math.round((Number(ms) || 30000) / 1000) + ' giây' };
  }

  /** Bấm lần lượt MỌI nút khớp từng nhãn (dùng cho nút nạp dữ liệu). Không bao giờ bấm nút có chữ xóa/tải lên/reset. */
  async function clickAll(labels) {
    const d = activeDoc(); const done = [];
    for (const lab of labels || []) {
      const q = norm(lab);
      const els = [...d.querySelectorAll('button,[role=button],input[type=button]')].filter(el => visible(el) && !el.disabled && norm(el.textContent || el.value).includes(q) && !/xoa|tai len|upload|reset|delete/.test(norm(el.textContent || el.value)));
      for (const el of els) { realClick(el); done.push(clip(el.textContent || el.value, 40)); await sleep(900); }
    }
    return { ok: true, clicked: done };
  }

  window.__HDA__ = { v: 6, clickAll, moduleVar, waitFor, ordersEnsureStaff, probe, unlock, frameUnlock, openModule, read, click, fill, ordersData, ordersFilterStaff, ordersShowOnly };
})();
