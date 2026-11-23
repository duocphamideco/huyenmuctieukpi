/* HUYỀN QUẢN LÝ KPI - KHÁCH HÀNG — giao diện khung bên phải. */
'use strict';
(async function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  await HDA.loadSettings({ localOnly: true });
  const remoteReady = HDA.loadSettings().catch(() => {});
  HDA.sbInit();

  /* ---------------- ĐĂNG NHẬP ỨNG DỤNG ---------------- */
  const LOGIN_KEY = 'hda_login_v1';
  const appPass = () => HDA.settings.appPassword || HDA_DEFAULT_SETTINGS.appPassword;
  document.querySelectorAll('.eye').forEach(b => b.addEventListener('click', () => { const i = b.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; }));
  async function loggedIn() {
    let tok = null; try { tok = localStorage.getItem(LOGIN_KEY) || sessionStorage.getItem(LOGIN_KEY); } catch (e) {}
    return !!tok && tok === await HDA.sha('login:' + appPass());
  }
  async function requireLogin() {
    if (await loggedIn()) { $('#loginGate').hidden = true; return; }
    $('#loginGate').hidden = false; $('#loginPass').value = ''; $('#loginPass').focus();
    await new Promise(resolve => {
      $('#loginForm').onsubmit = async ev => {
        ev.preventDefault();
        await remoteReady;                    // dùng mật khẩu mới nhất trên Firebase
        if ($('#loginPass').value === appPass()) {
          const tok = await HDA.sha('login:' + appPass());
          try { ($('#loginRemember').checked ? localStorage : sessionStorage).setItem(LOGIN_KEY, tok); } catch (e) {}
          $('#loginErr').textContent = ''; $('#loginGate').hidden = true; resolve();
        } else { $('#loginErr').textContent = 'Mật khẩu chưa đúng.'; $('#loginPass').select(); }
      };
    });
  }
  await requireLogin();

  const state = { skill: null, busy: false, ctl: null, history: [] };
  try { const got = await chrome.storage.local.get(HDA.CHAT_KEY); const c = got[HDA.CHAT_KEY] || {}; state.history = c.history || []; state.skill = c.skill || null; } catch (e) {}
  const saveChat = () => chrome.storage.local.set({ [HDA.CHAT_KEY]: { history: state.history.slice(-60), skill: state.skill } }).catch(() => {});

  const CHIPS = {
    bh: ['Doanh thu kỳ này so kỳ trước theo từng NV', 'KH … kỳ trước lấy SP gì, sản lượng bao nhiêu mà kỳ này chưa lấy?', 'NV nào phụ trách khách hàng …?', 'Khách hàng nào chưa đặt hàng trong kỳ?', 'KH giảm doanh thu mạnh nhất kỳ này', 'Liệt kê KH của NV … và xuất Excel'],
    kpi: ['Tổng hợp lịch hẹn KH trong kỳ của NV …', 'Tóm tắt báo cáo kế hoạch cuối tuần của từng NV, góp ý & đề xuất', 'Bấm phân tích kế hoạch tuần Ban Giám đốc và lưu', 'Kiểm tra kế hoạch và KPI của NV …', 'Hôm nay ai đã khai báo giao dịch khách hàng?'],
    auto: ['Hôm nay ai đã khai báo giao dịch khách hàng?', 'Khách hàng nào chưa đặt hàng trong kỳ?', 'NV nào phụ trách khách hàng …?']
  };

  /* ---------------- markdown gọn ---------------- */
  function md(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    let html = '', list = null, table = null;
    const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/(^|[\s(])[_*]([^*_\n]+?)[_*](?=[\s).,:;!?]|$)/g, '$1<i>$2</i>');
    const closeList = () => { if (list) { html += '</' + list + '>'; list = null; } };
    const closeTable = () => { if (table) { html += '<table>' + table.map((r, i) => '<tr>' + r.map(c => (i ? '<td>' : '<th>') + inline(c) + (i ? '</td>' : '</th>')).join('') + '</tr>').join('') + '</table>'; table = null; } };
    lines.forEach(raw => {
      const l = raw.trimEnd();
      if (/^\s*\|.*\|\s*$/.test(l)) {
        closeList();
        if (/^\s*\|[\s:|-]+\|\s*$/.test(l)) return;
        (table = table || []).push(l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
        return;
      }
      closeTable();
      let m;
      if ((m = /^\s*[-*•]\s+(.*)$/.exec(l))) { if (list !== 'ul') { closeList(); html += '<ul>'; list = 'ul'; } html += '<li>' + inline(m[1]) + '</li>'; return; }
      if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(l))) { if (list !== 'ol') { closeList(); html += '<ol>'; list = 'ol'; } html += '<li>' + inline(m[1]) + '</li>'; return; }
      closeList();
      if ((m = /^#{1,4}\s+(.*)$/.exec(l))) { html += '<p><b>' + inline(m[1]) + '</b></p>'; return; }
      if (!l.trim()) return;
      html += '<p>' + inline(l) + '</p>';
    });
    closeList(); closeTable();
    return html;
  }

  /* ---------------- tab ---------------- */
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchView(t.dataset.view)));
  function switchView(v) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === v));
    document.querySelectorAll('.view').forEach(x => x.classList.toggle('active', x.id === 'view-' + v));
    document.body.classList.toggle('show-screen', v === 'screen');
    if (v === 'screen') renderScreens();
    if (v === 'settings') openSettings();
  }
  /* ---------------- MÀN HÌNH WEBSITE ---------------- */
  function placeScreens() {
    const bar = document.getElementById('view-screen');
    const top = document.querySelector('.top').getBoundingClientRect().bottom + (document.body.classList.contains('show-screen') ? bar.getBoundingClientRect().height : 0);
    document.documentElement.style.setProperty('--screen-top', Math.round(top) + 'px');
  }
  function renderScreens() {
    const bar = $('#screenBar'); const ids = Object.keys(HDA.frames || {});
    if (!ids.length) { bar.innerHTML = '<span class="muted">Chưa mở website nào — bấm một skill ở tab Chat hoặc hỏi Huyền.</span>'; }
    else {
      bar.innerHTML = '';
      const cur = HDA.currentScreen && HDA.frames[HDA.currentScreen] ? HDA.currentScreen : ids[0];
      ids.forEach(id => {
        const b = document.createElement('button'); b.className = 'ghost' + (id === cur ? ' on' : '');
        b.textContent = (id === 'kpi' ? '🎯 ' : '🛒 ') + ((HDA.skill(id) || {}).name || id);
        b.addEventListener('click', () => { HDA.currentScreen = id; renderScreens(); });
        bar.appendChild(b);
      });
      const r = document.createElement('button'); r.className = 'ghost'; r.textContent = '⟳'; r.title = 'Tải lại trang';
      r.addEventListener('click', () => { const f = HDA.frames[cur]; if (f) f.src = f.src; });
      bar.appendChild(r);
      Object.entries(HDA.frames).forEach(([id, f]) => f.classList.toggle('on', id === cur));
    }
    requestAnimationFrame(placeScreens);
  }
  HDA.onScreensChanged = () => { if (document.body.classList.contains('show-screen')) renderScreens(); else Object.entries(HDA.frames).forEach(([id, f]) => f.classList.toggle('on', id === HDA.currentScreen)); };
  window.addEventListener('resize', () => requestAnimationFrame(placeScreens));

  /* ---------------- skill bar ---------------- */
  function renderSkills() {
    const bar = $('#skillBar'); bar.innerHTML = '';
    HDA.settings.skills.filter(s => s.enabled !== false).forEach(s => {
      const b = document.createElement('button');
      b.className = 'skill-btn' + (state.skill === s.id ? ' active' : '');
      b.dataset.id = s.id;
      b.innerHTML = '<span class="ic">' + (s.id === 'kpi' ? '🎯' : '🛒') + '</span><span><b>' + esc(s.name) + '</b><small>' + (state.skill === s.id ? 'Đang dùng · bấm lại để bỏ chọn' : 'Bấm để Huyền truy cập') + '</small></span><span class="dot"></span>';
      b.addEventListener('click', () => pickSkill(s.id));
      bar.appendChild(b);
    });
    renderChips();
    refreshDots();
  }
  async function refreshDots() {
    for (const s of HDA.settings.skills) {
      const el = document.querySelector('.skill-btn[data-id="' + s.id + '"]'); if (!el) continue;
      const t = await HDA.findTab(s).catch(() => null);
      el.classList.toggle('on', !!t);
    }
  }
  function renderChips() {
    const c = $('#chips'); c.innerHTML = '';
    (CHIPS[state.skill] || CHIPS.auto).forEach(t => {
      const b = document.createElement('button'); b.className = 'chip'; b.textContent = t;
      b.addEventListener('click', () => { $('#q').value = t; if (!t.includes('…')) send(); else { $('#q').focus(); const i = t.indexOf('…'); $('#q').setSelectionRange(i, i + 1); } });
      c.appendChild(b);
    });
  }
  async function pickSkill(id) {
    if (state.busy) return;
    if (state.skill === id) { state.skill = null; saveChat(); renderSkills(); return; }
    state.skill = id; saveChat(); renderSkills();
    const sk = HDA.skill(id);
    const box = stepsBox(); addStep(box, '🧭 Mở ' + sk.name + ' & đăng nhập…', true);
    try {
      await HDA.ensureSkillTab(id);
      addStep(box, '✅ Đã vào ' + sk.name + '. Anh/chị hỏi Huyền bất cứ nội dung nào nhé!');
    } catch (e) { addStep(box, '⚠️ ' + e.message); }
    refreshDots();
  }

  /* ---------------- tin nhắn ---------------- */
  const msgs = $('#msgs');
  function scroll() { msgs.scrollTop = msgs.scrollHeight; }
  function addMsg(role, text, meta, isErr) {
    const d = document.createElement('div');
    d.className = 'msg ' + (role === 'user' ? 'user' : 'bot') + (isErr ? ' err-msg' : '');
    if (role === 'user') d.textContent = text; else d.innerHTML = md(text) + (meta ? '<div class="meta">' + esc(meta) + '</div>' : '');
    msgs.appendChild(d); scroll(); return d;
  }
  function stepsBox() { const d = document.createElement('div'); d.className = 'steps'; msgs.appendChild(d); scroll(); return d; }
  function addStep(box, text, now) {
    if (!box) return;
    box.querySelectorAll('.now').forEach(x => x.classList.remove('now'));
    const d = document.createElement('div'); d.textContent = text; if (now) d.className = 'now';
    box.appendChild(d); scroll();
  }
  function welcome() {
    msgs.innerHTML = '<div class="welcome">Chào anh/chị, Huyền đây 👋<br><b>Chọn một skill</b> phía trên (hoặc hỏi luôn, Huyền tự chọn).<br>Huyền tự mở website, đăng nhập, lọc dữ liệu, điều khiển từng tab và xuất Excel theo yêu cầu.</div>';
  }
  function renderHistory() {
    if (!state.history.length) { welcome(); return; }
    msgs.innerHTML = '';
    state.history.forEach(m => { if (m.ask) addAsk({ ask: m.text, options: m.options || [] }, m.q || ''); else addMsg(m.role, m.role === 'user' ? m.text : HDA.sanitize(m.text), m.meta ? HDA.sanitize(m.meta) : m.meta, m.err); });
  }
  HDA.onFile = f => {
    const d = document.createElement('div'); d.className = 'file';
    d.textContent = '📗 Đã tải về: ' + f.filename + ' · ' + f.rows + ' dòng';
    const lf = window.HDA_LAST_FILE;
    if (lf && lf.filename === f.filename) {
      // điện thoại: bấm để mở / chia sẻ (Zalo, Lưu vào Tệp…)
      const b = document.createElement('button'); b.className = 'ghost file-share'; b.textContent = '📤 Mở / Chia sẻ';
      b.addEventListener('click', async () => {
        const file = new File([lf.blob], lf.filename, { type: lf.blob.type });
        try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: lf.filename }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
        const u = URL.createObjectURL(lf.blob); const a = document.createElement('a'); a.href = u; a.download = lf.filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000);
      });
      d.appendChild(b);
    }
    msgs.appendChild(d); scroll();
  };

  /* ---------------- NÓI THAY GÕ ---------------- */
  (function () {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const btn = $('#micBtn'); btn.hidden = false;
    let rec = null;
    btn.addEventListener('click', () => {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = 'vi-VN'; rec.interimResults = true; rec.continuous = false;
      const base = $('#q').value ? $('#q').value.trim() + ' ' : '';
      rec.onresult = ev => { let t = ''; for (const r of ev.results) t += r[0].transcript; $('#q').value = base + t; };
      rec.onend = () => { rec = null; btn.classList.remove('on'); btn.textContent = '🎤'; };
      rec.onerror = () => { rec = null; btn.classList.remove('on'); btn.textContent = '🎤'; };
      btn.classList.add('on'); btn.textContent = '⏺'; rec.start();
    });
  })();
  /* ---------------- CÀI ỨNG DỤNG (có logo) ---------------- */
  (function () {
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (standalone) return;
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    const inApp = /Zalo|FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|; wv\)/i.test(ua);
    const iosNotSafari = ios && /CriOS|FxiOS|EdgiOS|Zalo|FBAN|FBAV/i.test(ua);
    const tip = document.createElement('div'); tip.className = 'install-tip';
    const box = () => { if (!tip.isConnected) document.getElementById('view-chat').insertBefore(tip, document.getElementById('msgs')); };
    if (inApp || iosNotSafari) {
      tip.innerHTML = '⚠️ Đang mở trong trình duyệt của ' + (/Zalo/i.test(ua) ? 'Zalo' : 'ứng dụng khác') + ' nên khi cài sẽ <b>không có logo</b>. Bấm <b>⋯ / ⋮</b> → <b>Mở bằng ' + (ios ? 'Safari' : 'Chrome') + '</b>, rồi cài lại.';
      box(); return;
    }
    let deferred = null;
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault(); deferred = e;
      tip.innerHTML = '📲 Cài <b>Huyền AI-KPI-QLKH</b> như ứng dụng (có logo IDECO trên màn hình chính). <button class="primary" id="installBtn">Cài đặt</button>';
      box();
      tip.querySelector('#installBtn').addEventListener('click', async () => { deferred.prompt(); const r = await deferred.userChoice.catch(() => ({})); if (r && r.outcome === 'accepted') tip.remove(); deferred = null; });
    });
    window.addEventListener('appinstalled', () => tip.remove());
    try { if (localStorage.getItem('hdam:tipHidden')) return; } catch (e) {}
    setTimeout(() => {
      if (deferred || tip.isConnected) return;
      tip.innerHTML = ios ? '📲 Cài Huyền lên màn hình chính: bấm nút <b>Chia sẻ</b> ⬆️ của Safari → <b>Thêm vào MH chính</b>. <a href="#" class="tipX">Ẩn</a>'
        : '📲 Cài Huyền: bấm <b>⋮</b> của Chrome → <b>Cài đặt ứng dụng</b> (nếu chỉ thấy "Thêm vào MH chính" thì chờ vài giây, tải lại trang rồi thử lại). <a href="#" class="tipX">Ẩn</a>';
      box();
      const x = tip.querySelector('.tipX'); if (x) x.addEventListener('click', e => { e.preventDefault(); tip.remove(); try { localStorage.setItem('hdam:tipHidden', '1'); } catch (y) {} });
    }, 2500);
  })();

  /** Chạy 1 câu hỏi qua Huyền. opts: {display, fresh (không kèm lịch sử), label} → trả kết quả hoặc null */
  async function runQuestion(q, opts) {
    opts = opts || {};
    addMsg('user', opts.display || q);
    const prior = opts.fresh ? [] : state.history.filter(m => !m.err && !m.ask);
    state.history.push({ role: 'user', text: opts.display || q }); saveChat();
    const show = HDA.settings.ai.showSteps !== false;
    const box = stepsBox();
    if (opts.label) addStep(box, opts.label);
    const ui = {
      progress: t => addStep(box, HDA.sanitize(t), true),
      step: t => { if (show) addStep(box, HDA.sanitize(t)); }
    };
    const t0 = Date.now();
    try {
      const r = await HDA.runAgent(q, prior, state.skill, ui, state.ctl.signal);
      if (!show) box.remove(); else { box.querySelectorAll('div').forEach(x => { if (/suy nghĩ|kết nối lại|rút gọn|Đang chờ/.test(x.textContent)) x.remove(); }); box.querySelectorAll('.now').forEach(x => x.classList.remove('now')); if (!box.children.length) box.remove(); }
      const meta = 'Huyền 6.1 · ' + Math.round((Date.now() - t0) / 1000) + 's';
      if (r.ask) { addAsk(r, q); state.history.push({ role: 'assistant', text: r.ask, ask: true, options: r.options, q, meta }); return r; }
      const text = HDA.sanitize(r.text);
      addMsg('bot', text, meta);
      state.history.push({ role: 'assistant', text, meta });
      return r;
    } catch (e) {
      box.querySelectorAll('.now').forEach(x => x.classList.remove('now'));
      const t = '⚠️ ' + HDA.sanitize(e.message || e);
      addMsg('bot', t, '', true);
      state.history.push({ role: 'assistant', text: t, err: true });
      return null;
    } finally { saveChat(); }
  }
  async function withBusy(fn) {
    if (state.busy) return;
    state.busy = true; state.ctl = new AbortController();
    $('#sendBtn').disabled = true; $('#stopBtn').hidden = false;
    try { await fn(); }
    finally { state.busy = false; state.ctl = null; $('#sendBtn').disabled = false; $('#stopBtn').hidden = true; saveChat(); refreshDots(); }
  }
  async function send() {
    const q = $('#q').value.trim();
    if (!q || state.busy) return;
    if (!state.history.length) msgs.innerHTML = '';
    $('#q').value = '';
    await withBusy(() => runQuestion(q));
  }
  /** Huyền hỏi lại: hiện câu hỏi + nút chọn (nhân viên…). */
  function addAsk(r, origQ) {
    const d = addMsg('bot', HDA.sanitize(r.ask), 'Huyền 6.1 · chọn một mục bên dưới hoặc gõ trả lời');
    const wrap = document.createElement('div'); wrap.className = 'ask-opts';
    const opts = r.options && r.options.length ? r.options : [];
    const people = opts.filter(o => !/tat ca/.test(HDA.norm(o)));
    opts.forEach(o => {
      const b = document.createElement('button'); b.className = 'ask-opt' + (/tat ca/.test(HDA.norm(o)) ? ' all' : ''); b.textContent = o;
      b.addEventListener('click', () => {
        if (state.busy) return;
        wrap.querySelectorAll('button').forEach(x => { x.disabled = true; });
        b.classList.add('chosen');
        if (/tat ca/.test(HDA.norm(o)) && people.length) runEach(origQ, people);
        else withBusy(() => runQuestion(origQ + '\n→ Nhân viên / lựa chọn: ' + o + '. Chỉ xử lý đúng lựa chọn này.', { display: o }));
      });
      wrap.appendChild(b);
    });
    d.appendChild(wrap); scroll();
  }
  /** "Tất cả": hỏi lần lượt TỪNG nhân viên (mỗi lượt riêng → nhanh, không vượt độ dài). */
  function runEach(origQ, people) {
    withBusy(async () => {
      for (let i = 0; i < people.length; i++) {
        if (!state.ctl || state.ctl.signal.aborted) break;
        await runQuestion(origQ + '\n→ CHỈ xử lý nhân viên: ' + people[i] + '. Trả lời gọn cho riêng nhân viên này (tối đa 12 dòng).', {
          display: '👤 ' + people[i] + ' (' + (i + 1) + '/' + people.length + ')', fresh: true, label: 'Huyền xem lần lượt từng nhân viên · ' + (i + 1) + '/' + people.length });
      }
    });
  }
  $('#sendBtn').addEventListener('click', send);
  $('#stopBtn').addEventListener('click', () => state.ctl && state.ctl.abort());
  $('#q').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
  $('#clearBtn').addEventListener('click', () => { if (state.busy) return; if (!confirm('Xóa toàn bộ cuộc trò chuyện?')) return; state.history = []; saveChat(); HDA.cache.clear(); welcome(); });

  /* ---------------- CÀI ĐẶT ---------------- */
  let unlocked = false;
  async function openSettings() {
    const need = !unlocked;
    $('#pinGate').hidden = !need; $('#settingsBody').hidden = need;
    if (need) { $('#pinInput').value = ''; $('#pinInput').focus(); return; }
    fillSettings();
  }
  $('#pinBtn').addEventListener('click', async () => {
    const v = $('#pinInput').value;
    const ok = HDA.settings.settingsPassHash ? (await HDA.sha(v)) === HDA.settings.settingsPassHash : HDA_SETTINGS_PASS_DEFAULT.includes(v);
    if (ok) { unlocked = true; $('#pinErr').textContent = ''; await HDA.loadSettings().catch(() => {}); openSettings(); }
    else $('#pinErr').textContent = 'Mật khẩu Cài đặt chưa đúng.';
  });
  $('#pinInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#pinBtn').click(); });

  let draft = null;
  function bindEyes(root) { root.querySelectorAll('.eye').forEach(b => b.addEventListener('click', () => { const i = b.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; })); }
  function fillSettings() {
    draft = HDA.clone(HDA.settings);
    const sf = $('#skillForms'); sf.innerHTML = '';
    draft.skills.forEach((s, i) => {
      const n = $('#skillTpl').content.firstElementChild.cloneNode(true);
      n.querySelector('legend').textContent = 'Skill ' + (i + 1) + ' · ' + (s.id === 'bh' ? 'Hoạt động bán hàng' : s.id === 'kpi' ? 'Mục tiêu – KPI – Kế hoạch' : s.id);
      n.querySelectorAll('[data-f]').forEach(inp => { const f = inp.dataset.f; if (inp.type === 'checkbox') inp.checked = s[f] !== false; else inp.value = s[f] || ''; });
      n.dataset.idx = i; bindEyes(n);
      if (s.id !== 'bh') n.querySelectorAll('.only-bh').forEach(x => x.remove());
      if (s.id !== 'kpi') n.querySelectorAll('.only-kpi').forEach(x => x.remove());
      n.querySelector('.test-login').addEventListener('click', async ev => {
        collect(); const btn = ev.currentTarget; const old = HDA.settings; HDA.settings = draft;
        btn.textContent = '⏳ Đang thử…';
        try { const r = await HDA.ensureSkillTab(s.id); btn.textContent = r.info && r.info.locked ? '⚠️ Vẫn khóa' : '✅ Đăng nhập được'; }
        catch (e) { btn.textContent = '⚠️ ' + e.message.slice(0, 60); }
        finally { HDA.settings = old; setTimeout(() => { btn.textContent = '🔓 Thử mở & đăng nhập'; }, 5000); }
      });
      sf.appendChild(n);
    });
    renderRoutes();
    $('#maxSteps').value = draft.ai.maxSteps || 10;
    $('#showSteps').checked = draft.ai.showSteps !== false;
    $('#extraGuide').value = draft.extraGuide || '';
    $('#newPin').value = '';
    $('#appPassword').value = draft.appPassword || '';
    $('#syncInfo').textContent = HDA.syncState === 'firebase' ? '☁️ Đang đồng bộ Firebase real time (' + HDA_SHARED.path + ') — lưu ở đây áp dụng cho mọi máy.' : '⚠️ Chưa kết nối Firebase (' + HDA.syncState + ') — đang dùng bản trên máy.';
    $('#saveMsg').textContent = '';
  }
  function renderRoutes() {
    const rf = $('#routeForms'); rf.innerHTML = '';
    draft.ai.routes.forEach((r, i) => {
      const n = $('#routeTpl').content.firstElementChild.cloneNode(true);
      n.querySelector('legend').textContent = 'Tuyến ' + (i + 1);
      n.querySelectorAll('[data-f]').forEach(inp => { inp.value = r[inp.dataset.f] || (inp.dataset.f === 'type' ? 'chat' : inp.dataset.f === 'effort' ? 'low' : ''); });
      n.dataset.idx = i; bindEyes(n);
      n.querySelector('.del').addEventListener('click', () => { collect(); draft.ai.routes.splice(i, 1); renderRoutes(); });
      n.querySelector('.up').addEventListener('click', () => { if (!i) return; collect(); const x = draft.ai.routes.splice(i, 1)[0]; draft.ai.routes.splice(i - 1, 0, x); renderRoutes(); });
      rf.appendChild(n);
    });
  }
  function collect() {
    document.querySelectorAll('#skillForms .skill-form').forEach(n => {
      const s = draft.skills[Number(n.dataset.idx)];
      n.querySelectorAll('[data-f]').forEach(inp => { s[inp.dataset.f] = inp.type === 'checkbox' ? inp.checked : inp.value.trim(); });
    });
    document.querySelectorAll('#routeForms .route-form').forEach(n => {
      const r = draft.ai.routes[Number(n.dataset.idx)];
      n.querySelectorAll('[data-f]').forEach(inp => { r[inp.dataset.f] = inp.value.trim(); });
    });
    draft.ai.maxSteps = Number($('#maxSteps').value) || 10;
    draft.ai.showSteps = $('#showSteps').checked;
    draft.extraGuide = $('#extraGuide').value.trim();
    draft.appPassword = $('#appPassword').value || draft.appPassword || HDA_DEFAULT_SETTINGS.appPassword;
  }
  $('#addRouteBtn').addEventListener('click', () => { collect(); draft.ai.routes.push({ name: 'Tuyến mới', type: 'chat', url: '', model: '', key: '' }); renderRoutes(); });
  $('#fetchKeyBtn').addEventListener('click', async ev => {
    const btn = ev.currentTarget; collect(); btn.textContent = '⏳ Đang lấy…';
    try {
      let key = null;
      for (const db of ['kehoach', 'chamsockh']) { try { key = await HDA.fbGet(db, 'settings/api/kieGemini38Key'); } catch (e) {} if (typeof key === 'string' && key.length > 10) break; }
      if (typeof key !== 'string' || key.length < 10) throw new Error('Hệ thống chưa lưu key Kie');
      draft.ai.routes.forEach(r => { if (/api\.kie\.ai/.test(r.url) && !r.key) r.key = key; });
      renderRoutes(); btn.textContent = '✅ Đã điền key Kie (nhớ bấm Lưu)';
    } catch (e) { btn.textContent = '⚠️ ' + e.message; }
    setTimeout(() => { btn.textContent = '🔑 Lấy key Kie từ hệ thống IDECO'; }, 5000);
  });
  $('#testAiBtn').addEventListener('click', async ev => {
    const btn = ev.currentTarget; collect(); btn.textContent = '⏳ Đang thử từng tuyến…';
    const res = [];
    for (const r of draft.ai.routes) {
      if (!r.key || !r.url) { res.push(r.name + ': thiếu key/endpoint'); continue; }
      const t0 = Date.now();
      try { const t = await HDA.callRoute(r, [{ role: 'user', content: 'Trả lời đúng một từ: OK' }]); res.push('✅ ' + r.name + ' (' + Math.round((Date.now() - t0) / 100) / 10 + 's): ' + t.trim().slice(0, 30)); }
      catch (e) { res.push('⚠️ ' + r.name + ': ' + e.message.slice(0, 120)); }
    }
    btn.textContent = '⚡ Kiểm tra AI';
    alert(res.join('\n'));
  });
  $('#logoutBtn').addEventListener('click', () => { try { localStorage.removeItem(LOGIN_KEY); sessionStorage.removeItem(LOGIN_KEY); } catch (e) {} location.reload(); });
  $('#saveBtn').addEventListener('click', async () => {
    collect();
    const p = $('#newPin').value; if (p) draft.settingsPassHash = await HDA.sha(p);
    const passChanged = draft.appPassword !== HDA.settings.appPassword;
    const r = await HDA.saveSettings(draft);
    HDA.cache.clear();
    if (passChanged) { try { localStorage.setItem(LOGIN_KEY, await HDA.sha('login:' + draft.appPassword)); } catch (e) {} }
    $('#saveMsg').textContent = r.ok ? '✅ Đã lưu lên Firebase ' + new Date().toLocaleTimeString('vi-VN') : '⚠️ Đã lưu trên máy, chưa lên được Firebase: ' + r.error;
    renderSkills();
  });

  /* ---------------- MẪU LỆNH ---------------- */
  let tplCur = null;
  const pad2 = n => String(n).padStart(2, '0');
  const vn = d => pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear();
  const monday = d => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  function kyText() {
    const v = $('#tplKY').value, now = new Date();
    if (v === 'thismonth') return 'trong kỳ tháng ' + (now.getMonth() + 1) + '/' + now.getFullYear() + ' (từ 01/' + pad2(now.getMonth() + 1) + '/' + now.getFullYear() + ' đến ' + vn(now) + ')';
    if (v === 'lastmonth') { const a = new Date(now.getFullYear(), now.getMonth() - 1, 1), b = new Date(now.getFullYear(), now.getMonth(), 0); return 'trong kỳ tháng ' + (a.getMonth() + 1) + '/' + a.getFullYear() + ' (từ ' + vn(a) + ' đến ' + vn(b) + ')'; }
    if (v === 'thisweek') return 'trong tuần này (từ ' + vn(monday(now)) + ' đến ' + vn(now) + ')';
    if (v === 'lastweek') { const m = monday(now); m.setDate(m.getDate() - 7); const e = new Date(m); e.setDate(e.getDate() + 6); return 'trong tuần trước (từ ' + vn(m) + ' đến ' + vn(e) + ')'; }
    if (v === 'today') return 'hôm nay (' + vn(now) + ')';
    const f = $('#tplFrom').value, t = $('#tplTo').value;
    const fd = s2 => s2 ? s2.split('-').reverse().join('/') : '…';
    return 'từ ' + fd(f) + ' đến ' + fd(t);
  }
  function tuanText() {
    const v = $('#tplTUAN').value, now = new Date();
    let m = monday(now);
    if (v === 'lastweek') m.setDate(m.getDate() - 7);
    if (v === 'pick' && $('#tplWeekDate').value) m = monday(new Date($('#tplWeekDate').value + 'T00:00:00'));
    const e = new Date(m); e.setDate(e.getDate() + 6);
    return (v === 'thisweek' ? 'tuần này' : v === 'lastweek' ? 'tuần trước' : 'tuần') + ' (từ ' + vn(m) + ' đến ' + vn(e) + ')';
  }
  function allTemplates() {
    const mine = (HDA.settings.customTemplates || []).map(t => Object.assign({ group: '⭐ Mẫu của tôi', need: [], mine: true }, t));
    return mine.concat(HDA_TEMPLATES);
  }
  function renderTplList() {
    const q = HDA.norm($('#tplSearch').value);
    const box = $('#tplList'); box.innerHTML = '';
    let lastG = '';
    allTemplates().filter(t => !q || HDA.norm(t.title + ' ' + t.text + ' ' + t.group).includes(q)).forEach(t => {
      if (t.group !== lastG) { const g = document.createElement('div'); g.className = 'tpl-group'; g.textContent = t.group; box.appendChild(g); lastG = t.group; }
      const b = document.createElement('div'); b.className = 'tpl-item'; b.tabIndex = 0;
      b.innerHTML = '<span class="tag ' + (t.skill || '') + '">' + (t.skill === 'bh' ? 'BH' : t.skill === 'kpi' ? 'KPI' : 'Tự chọn') + '</span><span><span class="t"></span><span class="d"></span></span>';
      b.querySelector('.t').textContent = t.title;
      b.querySelector('.d').textContent = hdaFillTemplate(t, {}).slice(0, 140) + '…';
      if (t.mine) {
        const del = document.createElement('button'); del.className = 'del'; del.textContent = '✕'; del.title = 'Xóa mẫu này';
        del.addEventListener('click', async ev => {
          ev.stopPropagation(); if (!confirm('Xóa mẫu "' + t.title + '"?')) return;
          const st = HDA.clone(HDA.settings); st.customTemplates = (st.customTemplates || []).filter(x => x.id !== t.id);
          await HDA.saveSettings(st); renderTplList();
        });
        b.appendChild(del);
      }
      const pick = () => openTpl(t);
      b.addEventListener('click', pick); b.addEventListener('keydown', ev => { if (ev.key === 'Enter') pick(); });
      box.appendChild(b);
    });
    if (!box.children.length) box.innerHTML = '<p class="muted">Không có mẫu phù hợp.</p>';
  }
  function tplValues() {
    return { NV: $('#tplNV').value.trim(), KH: $('#tplKH').value.trim(), KY: kyText(), TUAN: tuanText(), EXCEL: $('#tplExcel').checked };
  }
  function updatePreview() {
    if (!tplCur) return;
    $('#tplRange').hidden = $('#tplKY').value !== 'custom' || !(tplCur.need || []).includes('KY');
    $('#tplWeekPick').hidden = $('#tplTUAN').value !== 'pick' || !(tplCur.need || []).includes('TUAN');
    $('#tplPreview').textContent = hdaFillTemplate(tplCur, tplValues());
  }
  function openTpl(t) {
    tplCur = t;
    $('#tplList').hidden = true; $('#tplForm').hidden = false; $('#tplSearch').hidden = true;
    $('#tplTitle').textContent = t.title;
    $('#tplExcel').checked = false; $('#tplKH').placeholder = 'Tên khách hàng';
    document.querySelectorAll('#tplForm [data-need]').forEach(el => { el.hidden = !(t.need || []).includes(el.dataset.need); });
    $('#tplExcelRow').hidden = !/\{EXCEL\}/.test(t.text);
    updatePreview();
    const first = document.querySelector('#tplForm [data-need]:not([hidden]) input');
    if (first) first.focus();
  }
  function closeTplForm() { tplCur = null; $('#tplForm').hidden = true; $('#tplList').hidden = false; $('#tplSearch').hidden = false; }
  async function fillNameLists() {
    // gợi ý tên NV / KH từ dữ liệu (chạy nền, lỗi thì bỏ qua)
    const nv = new Set(), kh = new Set();
    const add = (set, v) => { v = String(v || '').trim(); if (v && set.size < 600) set.add(v.split(' - ')[0]); };
    for (const name of ['gdkh_customers', 'orders_customers']) {
      try {
        const e = HDA.cache.get(name) || (HDA.skill(HDA_DATASETS[name].skill) ? await HDA.loadDataset(name, {}, { liveOrders: HDA.liveOrders }) : null);
        (e && e.rows || []).forEach(r => { add(nv, r.salesRep || r.staff); add(kh, r.name); });
      } catch (e) {}
    }
    $('#tplNVList').innerHTML = [...nv].sort((a, b) => a.localeCompare(b, 'vi')).map(n => '<option value="' + esc(n) + '">').join('');
    $('#tplKHList').innerHTML = [...kh].sort((a, b) => a.localeCompare(b, 'vi')).map(n => '<option value="' + esc(n) + '">').join('');
  }
  let namesLoaded = false;
  $('#tplBtn').addEventListener('click', () => {
    $('#tplPanel').hidden = false; closeTplForm(); $('#tplSearch').value = ''; renderTplList(); $('#tplSearch').focus();
    if (!namesLoaded) { namesLoaded = true; fillNameLists(); }
  });
  $('#tplClose').addEventListener('click', () => { $('#tplPanel').hidden = true; });
  $('#tplSearch').addEventListener('input', renderTplList);
  $('#tplBack').addEventListener('click', closeTplForm);
  ['#tplNV', '#tplKH', '#tplKY', '#tplFrom', '#tplTo', '#tplTUAN', '#tplWeekDate', '#tplExcel'].forEach(sel => {
    $(sel).addEventListener('input', updatePreview); $(sel).addEventListener('change', updatePreview);
  });
  function applyTpl(send) {
    if (!tplCur) return;
    if ((tplCur.need || []).includes('KH') && !$('#tplKH').value.trim()) { $('#tplKH').focus(); $('#tplKH').placeholder = '⚠ Nhập tên khách hàng'; return; }
    const text = hdaFillTemplate(tplCur, tplValues());
    if (tplCur.skill && tplCur.skill !== state.skill && HDA.skill(tplCur.skill)) { state.skill = tplCur.skill; saveChat(); renderSkills(); }
    $('#tplPanel').hidden = true;
    $('#q').value = text;
    if (send) send_(); else { $('#q').focus(); $('#q').setSelectionRange(text.length, text.length); }
  }
  const send_ = () => send();
  $('#tplInsert').addEventListener('click', () => applyTpl(false));
  $('#tplSend').addEventListener('click', () => applyTpl(true));
  $('#tplSaveMine').addEventListener('click', async () => {
    const text = $('#q').value.trim();
    if (!text) { alert('Hãy gõ câu lệnh vào ô chat trước, rồi bấm lưu thành mẫu.'); return; }
    const title = prompt('Tên mẫu (ngắn gọn):', text.slice(0, 50));
    if (!title) return;
    const st = HDA.clone(HDA.settings);
    st.customTemplates = (st.customTemplates || []).concat([{ id: 'my' + Date.now(), title: title.trim(), text, skill: state.skill || '' }]);
    const r = await HDA.saveSettings(st);
    renderTplList();
    if (!r.ok) alert('Đã lưu trên máy, chưa lên được Firebase: ' + r.error);
  });

  chrome.tabs.onUpdated.addListener((id, info) => { if (info.status === 'complete') refreshDots(); });
  chrome.tabs.onRemoved.addListener(() => refreshDots());

  // Cài đặt dùng chung đổi trên máy khác → cập nhật ngay
  remoteReady.then(() => renderSkills());
  let watchT = null;
  HDA.fbWatch(HDA_SHARED.db, HDA_SHARED.path, () => {
    clearTimeout(watchT);
    watchT = setTimeout(async () => {
      if ($('#view-settings').classList.contains('active')) return; // đang sửa thì không đè
      await HDA.loadSettings().catch(() => {});
      renderSkills();
      if (!(await loggedIn())) location.reload();   // mật khẩu ứng dụng vừa đổi
    }, 800);
  });

  renderSkills();
  renderHistory();
  const needSetup = !HDA.settings.ai.routes.some(r => r.key);
  if (needSetup) {
    const d = addMsg('bot', '👋 Chưa có API key AI: vào **Cài đặt** nhập key rồi bấm **Lưu cài đặt**.');
    d.style.cursor = 'pointer'; d.addEventListener('click', () => switchView('settings'));
  }
  $('#q').focus();
})();
