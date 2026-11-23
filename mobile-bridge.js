/* HUYỀN KPI MOBILE — điều khiển 2 website Dashboard bên trong ứng dụng.
 * Ứng dụng nằm cùng tên miền duocphamideco.github.io với 2 website nên đọc/bấm trực tiếp được trong khung (iframe),
 * dùng đúng bộ điều khiển pagectl.js của bản máy tính. */
'use strict';
(function () {
  HDA.frames = {};
  HDA.SANDBOX_WORKER = 'worker.js';
  let PAGECTL = null;
  const pagectlSrc = async () => PAGECTL || (PAGECTL = await (await fetch('pagectl.js', { cache: 'no-cache' })).text());
  const clone = v => { try { return v === undefined ? null : JSON.parse(JSON.stringify(v)); } catch (e) { return v; } };
  const holder = () => document.getElementById('screens');

  HDA.findTab = async sk => (sk && HDA.frames[sk.id] ? { id: sk.id, status: 'complete', url: sk.url } : null);
  HDA.waitTab = async () => ({ status: 'complete' });
  HDA.browserWindow = async () => null;
  HDA.inPanelWindow = true;

  async function frameFor(skillId) {
    const sk = HDA.skill(skillId);
    if (!sk) throw new Error('Không có skill ' + skillId);
    let f = HDA.frames[skillId];
    if (f && f.isConnected) return f;
    f = document.createElement('iframe');
    f.className = 'dash-frame'; f.dataset.skill = skillId; f.title = sk.name;
    f.setAttribute('allow', 'clipboard-read; clipboard-write; microphone');
    HDA.frames[skillId] = f;
    const loaded = new Promise(r => { f.addEventListener('load', r, { once: true }); setTimeout(r, 45000); });
    f.src = sk.url;
    holder().appendChild(f);
    await loaded;
    await HDA.sleep(900);
    try { void f.contentWindow.document.body; } catch (e) { throw new Error('Không mở được ' + sk.name + ' trong ứng dụng (khác tên miền?). Ứng dụng phải đặt trên duocphamideco.github.io'); }
    HDA.onScreensChanged && HDA.onScreensChanged();
    return f;
  }
  HDA.frameFor = frameFor;

  HDA.page = async function (skillId, fn, args) {
    const f = await frameFor(skillId);
    const w = f.contentWindow;
    for (let attempt = 1; ; attempt++) {
      try {
        if (!w.__HDA__ || w.__HDA__.v !== 6) w.eval(await pagectlSrc());
        const r = await w.__HDA__[fn].apply(null, args || []);
        const h = holder(); if (h) { h.scrollTop = 0; h.scrollLeft = 0; }
        return clone(r);
      } catch (e) {
        if (attempt >= 3) return { ok: false, error: String(e && e.message || e) };
        await HDA.sleep(1000);
      }
    }
  };

  HDA.ensureSkillTab = async function (skillId, opts) {
    const sk = HDA.skill(skillId);
    if (!sk) throw new Error('Không có skill ' + skillId);
    await frameFor(skillId);
    HDA.currentScreen = skillId;
    let info = await HDA.page(skillId, 'probe');
    if (info && info.locked) {
      const pw = HDA.passwordsOf(sk);
      if (!pw.length) throw new Error('Dashboard "' + sk.name + '" đang khóa. Vào Cài đặt → nhập Mật khẩu đăng nhập cho skill này.');
      const u = await HDA.page(skillId, 'unlock', [pw]);
      if (!u || !u.ok) throw new Error((u && u.error) || 'Không đăng nhập được');
      info = await HDA.page(skillId, 'probe');
    } else if (info && info.kind === 'kpi' && info.goalGate) {
      await HDA.page(skillId, 'unlock', [[]]);
    }
    HDA.onScreensChanged && HDA.onScreensChanged();
    return { tab: { id: skillId }, info, sk };
  };

  HDA.liveOrders = async function () {
    if (!HDA.frames.bh) return null;
    return HDA.page('bh', 'ordersData');
  };

  /** Lưu file trên điện thoại: Android tải về; iPhone mở bảng chia sẻ (Zalo, Lưu vào Tệp…). */
  HDA.saveBlob = async function (blob, filename) {
    HDA._lastFile = window.HDA_LAST_FILE = { blob, filename };
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (e) {}
  };
  HDA.shareFile = async function (f) {
    f = f || HDA._lastFile; if (!f) return;
    const file = new File([f.blob], f.filename, { type: f.blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: f.filename }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(f.blob);
    const a = document.createElement('a'); a.href = url; a.download = f.filename; a.target = '_blank'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  };
})();
