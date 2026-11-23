/* HUYỀN KPI MOBILE — thay các API extension bằng API web (localStorage) để dùng chung mã với bản máy tính. */
'use strict';
(function () {
  const C = window.chrome = window.chrome || {};
  const ls = {
    get: async keys => { const o = {}; (Array.isArray(keys) ? keys : [keys]).forEach(k => { try { const v = localStorage.getItem('hdam:' + k); if (v != null) o[k] = JSON.parse(v); } catch (e) {} }); return o; },
    set: async obj => { Object.keys(obj || {}).forEach(k => { try { localStorage.setItem('hdam:' + k, JSON.stringify(obj[k])); } catch (e) { console.warn('localStorage đầy', e); } }); },
    remove: async k => { (Array.isArray(k) ? k : [k]).forEach(x => localStorage.removeItem('hdam:' + x)); }
  };
  C.storage = { local: ls };
  const noop = { addListener() {}, removeListener() {} };
  C.tabs = { onUpdated: noop, onRemoved: noop };
  window.HDA_MOBILE = true;
})();
