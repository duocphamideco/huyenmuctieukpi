/* Adapter for the original IDECO bangbaogia UI. Does not modify website code or Firebase. */
(function(){
'use strict';
const ADAPTER_VER='2.14.2';
// Bản cũ còn kẹt trong trang (chưa F5 sau khi cập nhật extension) sẽ được thay bằng bản này.
if(window.__IDECO_QUOTE2&&window.__IDECO_QUOTE2.version===ADAPTER_VER)return;
const MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const wait=async(fn,label,timeout=30000)=>{const end=Date.now()+timeout;while(Date.now()<end){const value=fn();if(value)return value;await new Promise(r=>setTimeout(r,150));}throw Error('Quá thời gian chờ '+label);};
const el=id=>document.getElementById(id);
function snapshot(){if(typeof products==='undefined'||typeof cartRows!=='function')throw Error('Trang báo giá chưa sẵn sàng hoặc đã đổi cấu trúc.');return {products:products.map(p=>({code:String(p.code),name:p.name,category:p.category,price:p.price,price6:p.price6,price12:p.price12,discount6:p.discount6,discount12:p.discount12})),selected:cartRows().map(x=>String(x.p.code)),tier:readQuoteExportMode()};}
async function setTier(tier,password){
 const requested=Number(tier);
 if(![0,6,12].includes(requested))throw Error('Chỉ hỗ trợ mẫu đầy đủ, 6 hộp và từ 12 hộp trở lên.');
 if(!password||typeof password!=='string')throw Error('Chưa cấu hình mật khẩu Cài đặt 2 trong HUYỀN.');
 const button=el('quoteSettingsBtn'),field=el('quoteSettingsPassword'),form=el('quoteSettingsLogin');
 const panel=el('quoteSettingsPanel'),select=el('quoteExportMode'),save=el('saveQuoteExportModeBtn');
 if(!button||!field||!form||!panel||!select||!save)throw Error('Cấu trúc Cài đặt 2 trên website đã thay đổi. Huyền dừng để tránh xuất nhầm giá.');
 try{
   // Luôn yêu cầu đăng nhập chính thức qua form của website; không đụng vào cài đặt 1.
   button.click();
   await wait(()=>!form.classList.contains('hidden'),'form đăng nhập Cài đặt 2',3000);
   field.value=password;
   field.dispatchEvent(new Event('input',{bubbles:true}));
   form.requestSubmit();
   await wait(()=>{
     const message=el('quoteSettingsLoginMessage');
     if(message&&!message.classList.contains('hidden'))throw Error('Website từ chối mật khẩu Cài đặt 2. Cần đồng bộ mật khẩu trên website báo giá với mật khẩu đã cấu hình trong HUYỀN; không xuất Excel để tránh sai mức giá.');
     return typeof quoteSettingsUnlocked!=='undefined'&&quoteSettingsUnlocked&&!panel.classList.contains('hidden');
   },'xác thực Cài đặt 2',12000);
   select.value=requested?String(requested):'standard';
   select.dispatchEvent(new Event('change',{bubbles:true}));
   if(select.value!==(requested?String(requested):'standard'))throw Error('Website không có mẫu Excel đã chọn.');
   save.click();
   // Website phải đọc lại đúng mode đã lưu mới được xuất.
   if(readQuoteExportMode()!==requested)throw Error('Không lưu được mức giá '+requested+' hộp trong Cài đặt 2. Đã dừng xuất Excel.');
 }finally{field.value='';}
}

function selectCodes(codes){const s=snapshot();if(!Array.isArray(codes)||!codes.length)throw Error('Chưa chọn sản phẩm.');if(new Set(codes).size!==codes.length)throw Error('Mã sản phẩm trùng.');const unknown=codes.filter(c=>!s.products.some(p=>p.code===c));if(unknown.length)throw Error('Mã không còn trong bảng giá: '+unknown.join(', '));clearSelection();codes.forEach(c=>setCartQty(c,1));const selected=snapshot().selected;if(selected.length!==codes.length||codes.some(c=>!selected.includes(c)))throw Error('Chưa chọn đủ sản phẩm trên giao diện.');}

// Website tạo MỖI khách đang tích trong danh sách khách của nó thành một sheet "KH n" và chặn xuất khi danh sách chưa lưu Firebase.
// Huyền chỉ cần Excel báo giá chung (1 sheet) rồi tự gửi cho từng khách ở Zalo => tạm bỏ chọn khách trên website khi xuất, xong trả lại như cũ.
function isolateWebsiteCustomers(){
 try{
  if(typeof customerSelected==='undefined'||!customerSelected||typeof customerSelected.size!=='number'||!customerSelected.size)return ()=>{};
  const ref=customerSelected,saved=Array.from(ref);ref.clear();
  return ()=>{try{saved.forEach(x=>ref.add(x));}catch(_){}};
 }catch(_){return ()=>{};}
}
// exportQuoteExcel của website NUỐT lỗi (chỉ hiện toast + console.error, không ném lỗi) => bắt lại để báo đúng nguyên nhân.
function captureWebsiteErrors(){
 const msgs=[],oldErr=console.error,oldToast=typeof window.showToast==='function'?window.showToast:null;
 const text=a=>{try{return String(a&&a.message||a);}catch(_){return '';}};
 console.error=function(...a){try{a.forEach(x=>{const t=text(x);if(t)msgs.push(t);});}catch(_){}return oldErr.apply(this,a);};
 if(oldToast)window.showToast=function(m){try{const t=text(m);if(t)msgs.push(t);}catch(_){}return oldToast.apply(this,arguments);};
 return {msgs,restore(){console.error=oldErr;if(oldToast&&window.showToast!==oldToast)window.showToast=oldToast;},
  reason(){const u=[...new Set(msgs.map(x=>x.trim()).filter(Boolean))];return u.length?u.slice(-3).join(' | '):'';}};
}
let busy=false;
async function exportFile(options){
 if(busy)throw Error('Huyền đang xuất một báo giá khác.');busy=true;
 try{
  await wait(()=>{try{return snapshot().products.length;}catch{return false;}},'dữ liệu bảng giá',45000);
  const {codes,tier,password}=options;selectCodes(codes);
  await setTier(Number(tier),password);
  const s=snapshot(),rows=codes.map(c=>s.products.find(p=>p.code===c));
  if(tier){const bad=rows.filter(p=>!(Number.isFinite(p['price'+tier])&&(p['price'+tier]>0||(p['price'+tier]===0&&p['discount'+tier]===1&&p.price>0))));if(bad.length)throw Error('Thiếu giá mức '+tier+' hộp: '+bad.map(p=>p.name).join(', ')+'. Không xuất/gửi báo giá thiếu giá.');}
  if(!window.ExcelJS||typeof exportQuoteExcel!=='function')throw Error('Chưa tải được bộ xuất Excel của website.');
  if(exportingQuote)throw Error('Website đang xuất tệp khác.');
  const exportBtn=el('exportTopBtn');
  if(!exportBtn||exportBtn.disabled)throw Error('Nút Xuất báo giá Excel trên website đang bị khóa hoặc không còn. Tải lại (F5) trang báo giá rồi thử lại.');
  const oldCreate=URL.createObjectURL,oldClick=HTMLAnchorElement.prototype.click,blobs=new Map();let captured=null;
  const restoreCustomers=isolateWebsiteCustomers(),cap=captureWebsiteErrors();
  URL.createObjectURL=function(b){const u=oldCreate.call(URL,b);blobs.set(u,b);return u;};
  HTMLAnchorElement.prototype.click=function(){if(/\.xlsx$/i.test(this.download)&&blobs.has(this.href)){captured={blob:blobs.get(this.href),name:this.download};return;}return oldClick.call(this);};
  try{
   exportBtn.click();
   await wait(()=>{if(captured&&!exportingQuote)return true;if(!exportingQuote&&!captured){const why=cap.reason();throw Error(why?'Website không xuất được Excel: '+why:'Website không tạo được tệp Excel (không có thông báo lỗi). Tải lại (F5) trang báo giá rồi thử lại.');}return false;},'xuất Excel',90000);
  }finally{URL.createObjectURL=oldCreate;HTMLAnchorElement.prototype.click=oldClick;cap.restore();restoreCustomers();}
  if(!captured?.blob?.size||captured.blob.size>12*1024*1024)throw Error('File Excel rỗng hoặc lớn hơn 12 MB.');
  const dataUrl=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(captured.blob);});
  if(!dataUrl.split(',')[1].startsWith('UEs'))throw Error('Tệp xuất không phải workbook XLSX hợp lệ.');
  const name=captured.name.replace(/\.xlsx$/i,'_'+crypto.randomUUID().slice(0,8)+'.xlsx');
  return {name,dataUrl,mime:MIME,size:captured.blob.size,tier:Number(tier),codes:codes.slice(),createdAt:Date.now()};
 }finally{busy=false;}
}
window.__IDECO_QUOTE2={version:ADAPTER_VER,snapshot,select:selectCodes,setTier,exportFile};
})();
