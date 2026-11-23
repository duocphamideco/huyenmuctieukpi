(function(root){'use strict';
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/\s+/g,' ').trim();
const norm=s=>fold(s).replace(/[^a-z0-9]+/g,' ').trim();
// Mức 'từ 12 hộp trở lên' là mẫu Excel 12 hộp, không phải số lượng cần tính lại giá.
// Cả 'mua 24 hộp' cũng dùng biểu giá 12+; tuyệt đối không nội suy giá mới.
function tierOf(text,fallback=0){
 const t=fold(text),qty=[...t.matchAll(/\b(\d+)\s*hop\b/g)].map(x=>Number(x[1]));
 const tiers=qty.map(n=>n>=12?12:n===6?6:null);
 if(tiers.includes(null))throw Error('Website chỉ có mẫu giá đầy đủ, 6 hộp và từ 12 hộp trở lên; không có mẫu riêng cho số hộp yêu cầu.');
 if(new Set(tiers).size>1)throw Error('Lệnh đang yêu cầu đồng thời mức 6 và từ 12 hộp trở lên; hãy chọn một mức.');
 if(/day du|tat ca muc|ca hai muc/.test(t)){
   if(qty.length)throw Error('Lệnh vừa chọn giá đầy đủ vừa chỉ định mức hộp; hãy chọn một cách xuất.');
   return 0;
 }
 return tiers.length?tiers[0]:Number(fallback)||0;
}

const GENERIC_CUST=new Set(['nt','nha','thuoc','quay','cty','cong','ty','tnhh','mtv','tm','dv','dp','duoc','pham','chi','nhanh','cn','hkd','ho','kinh','doanh','phong','kham','pk','cp','co','phan','chuoi','sieu','thi']);
function coreTokens(s){return norm(s).split(' ').filter(w=>w&&!GENERIC_CUST.has(w));}
function resolve(terms,rows,nameKey,codeKey){const found=[];for(const term of terms){const q=norm(term);if(!q)continue;let matches=rows.filter(r=>norm(r[codeKey])===q||norm(r[nameKey])===q);if(!matches.length)matches=rows.filter(r=>(' '+norm(r[nameKey])+' ').includes(' '+q+' '));if(!matches.length&&nameKey==='ten'){const dg=String(term).replace(/\D/g,'');if(dg.length>=9)matches=rows.filter(r=>String(r.sdt||r.phone||'').replace(/\D/g,'').endsWith(dg.slice(-9)));if(!matches.length){const qt=coreTokens(term);if(qt.length)matches=rows.filter(r=>{const rt=coreTokens(r[nameKey]);return qt.every(t=>rt.includes(t));});}if(matches.length>1)throw Error('Có '+matches.length+' khách khớp "'+term+'": '+matches.slice(0,4).map(r=>r[nameKey]).join('; ')+'. Hãy ghi rõ hơn hoặc chọn ở 👥.');}if(matches.length!==1)throw Error((matches.length?'Có nhiều kết quả cho ':'Không tìm thấy ')+term+'. Hãy ghi mã hoặc tên đầy đủ.');if(!found.includes(matches[0]))found.push(matches[0]);}return found;}
function splitTerms(s){return s.split(/\s*[,;\n]\s*|\s+và\s+/iu).map(x=>x.trim()).filter(Boolean);}
function scheduleOf(text,now=Date.now()){
 let cleaned=text;const m=text.match(/(?:lúc|vào|hẹn(?:\s+gửi)?(?:\s+lúc)?)\s*(\d{1,2})(?::|h|\s+giờ\s*)(\d{1,2})?(?:\s*(?:ngày\s*)?(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?|\s*(hôm nay|ngày mai))?/iu);
 if(!m){if(/hẹn giờ|hẹn gửi|ngày mai|hôm nay|\blúc\b/iu.test(text))throw Error('Ghi lịch theo mẫu: lúc 14:30 ngày 09/11/2026; hoặc chọn ngày giờ trong bảng gửi.');return {at:null,text};}
 const h=+m[1],mi=+(m[2]||0);if(h>23||mi>59)throw Error('Giờ gửi không hợp lệ.');
 const today=new Date(now+7*3600000);let y=m[5]?+m[5]:today.getUTCFullYear(),month=m[4]?+m[4]:today.getUTCMonth()+1,day=m[3]?+m[3]:today.getUTCDate();if(m[6]&&fold(m[6])==='ngay mai'){const d=new Date(Date.UTC(y,month-1,day+1));y=d.getUTCFullYear();month=d.getUTCMonth()+1;day=d.getUTCDate();}
 const at=Date.UTC(y,month-1,day,h,mi)-7*3600000,d=new Date(at+7*3600000);if(d.getUTCFullYear()!==y||d.getUTCMonth()+1!==month||d.getUTCDate()!==day)throw Error('Ngày gửi không hợp lệ.');if(at<=now)throw Error('Thời gian gửi đã qua; hãy chọn thời gian tương lai.');cleaned=text.slice(0,m.index)+text.slice(m.index+m[0].length);return {at,text:cleaned};
}
function plan(text,snapshot,customers,refs=[],presetCodes=null,presetTargets=null,fallbackTier=0){
 text=String(text).replace(/gởi/giu,'gửi');
 const cap=text.match(/(?:tin nhắn|lời nhắn|nội dung|kèm lời)\s*[:：]\s*([\s\S]*)$/iu),message=cap?cap[1].trim():'';let raw=cap?text.slice(0,cap.index):text;const schedule=scheduleOf(raw);raw=schedule.text;const tier=tierOf(raw,fallbackTier);
 const cm=raw.match(/(?:cho|tới|đến|gửi)\s+(?:các\s+)?(?:khách hàng|khách|kh|nhà thuốc)\s*[:：]?\s*([\s\S]+)$/iu);
 let targets=presetTargets;if(!targets){if(cm){const names=cm[1].replace(/\s+(?:qua|bằng|trên)\s+zalo[\s\S]*$/iu,'').replace(/\s+(?:rồi|sau đó|và)\s+gửi[\s\S]*$/iu,'').replace(/[.!?]+$/,'');targets=resolve(splitTerms(names),customers,'ten','ma');}else targets=[];}
 let codes=presetCodes;
 if(!codes){let part=cm?raw.slice(0,cm.index):raw;part=part.replace(/^(?:huyền\s*(?:ơi)?\s*)?(?:bạn\s*)?(?:(?:giúp|hãy|làm|tạo|gửi|xuất|chọn)\s*)*(?:bảng\s*)?(?:báo giá|bảng giá)\s*/iu,'').replace(/(?:(?:mức(?:\s+giá)?|giá|mua|đơn(?:\s+hàng)?|đặt|số\s+lượng)\s+)*(?:(?:từ|trên|ít\s+nhất|tối\s+thiểu)\s*)?\d+\s*hộp(?:\s*(?:trở\s+lên|hoặc\s+hơn|và\s+trên|thôi))?/giu,' ').replace(/(?:với|có|kèm)?\s*chiết khấu/giu,' ').replace(/(?:rồi|sau đó)?\s*(?:tự động\s*)?(?:xuất\s*)?(?:file\s*)?excel/giu,' ').replace(/(?:rồi|sau đó)?\s*gửi\s*(?:qua\s*)?zalo(?:\s*(?:web|pc))?/giu,' ').replace(/\s+(?:(?:qua|bằng|trên)\s+)?zalo(?:\s*(?:web|pc|máy tính|điện thoại))?\s*$/iu,' ').replace(/(?:\s|^)(?:đính kèm|kèm theo)\s*(?:file\s*)?excel\s*$/iu,' ').replace(/\b(?:đầy đủ|tất cả mức)\b/giu,'').replace(/[.!?]+$/,'').replace(/(?:\s|^)(?:theo|ở|với|cho)\s*$/iu,'').trim();
 if(!part||/^(?:(?:các|những)\s+)?(?:(?:sản phẩm|thuốc|mặt hàng|danh mục)\s+)?(?:(?:tôi|anh|em)\s+)?(?:này|hiện tại|đang có|đã chọn|đang chọn|vừa chọn|đã tích|đã đánh dấu|trên giao diện|trên website|trong giỏ hàng|từ giỏ hàng)(?:\s+(?:trên giao diện|trên website))?$/iu.test(part))codes=snapshot.selected.slice();
 else if(/^(?:toàn bộ|tất cả)(?: sản phẩm| danh mục)?$/iu.test(part))codes=snapshot.products.map(p=>p.code);
 else if(/^(?:danh mục|nhóm)\s+/iu.test(part)){const q=norm(part.replace(/^(?:danh mục|nhóm)\s+/iu,''));const cats=[...new Set(snapshot.products.map(p=>p.category))].filter(c=>norm(c)===q);if(cats.length!==1)throw Error('Không tìm thấy danh mục duy nhất: '+q);codes=snapshot.products.filter(p=>p.category===cats[0]).map(p=>p.code);}
 else{const terms=splitTerms(part.replace(/^(?:các\s+)?(?:sản phẩm|thuốc)\s+/iu,''));codes=[];for(const term of terms){let hits;try{hits=resolve([term],snapshot.products,'name','code');}catch(e){const aliases=refs.filter(r=>norm(r.ma)===norm(term)||norm(r.ten)===norm(term));if(aliases.length!==1)throw e;hits=resolve([aliases[0].ma||aliases[0].ten],snapshot.products,'name','code');}codes.push(hits[0].code);}}
 }
 codes=[...new Set(codes||[])];if(!codes.length)throw Error('Chưa xác định được sản phẩm. Tích chọn trên website hoặc ghi rõ tên/mã.');if(codes.some(c=>!snapshot.products.some(p=>p.code===c)))throw Error('Một mã sản phẩm không còn trên bảng giá.');
 return {codes,tier,targets:targets||[],caption:message,sendAt:schedule.at,wantSend:/\bzalo\b/i.test(fold(text))};
}
const api={fold,norm,tierOf,resolve,splitTerms,scheduleOf,plan};root.HuyenQuoteCore=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
