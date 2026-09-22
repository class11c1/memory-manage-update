const SUPABASE_URL="https://vzfhuvoiryupmauumlsp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_M6aKA96AdJIFeLcG7U9lig_BeOM97Pp";
const {createClient}=supabase,db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const fmt=v=>v?new Date(v+"T00:00:00").toLocaleDateString("vi-VN"):"Chưa có ngày";
let rows=[];

$("#image").onchange=()=>{
 const f=$("#image").files[0],p=$("#preview"); if(!f){p.textContent="Chưa chọn ảnh";return}
 const u=URL.createObjectURL(f);p.innerHTML=`<img src="${u}">`;
};

async function upload(file){
 if(!file)return null;
 const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"");
 const path=`${Date.now()}-${crypto.randomUUID()}.${ext}`;
 const {error}=await db.storage.from("memories").upload(path,file,{contentType:file.type||"image/jpeg",upsert:false});
 if(error)throw error;
 return path;
}

$("#form").onsubmit=async e=>{
 e.preventDefault();
 const btn=$("#submit"),msg=$("#msg");btn.disabled=true;btn.textContent="Đang đăng...";msg.textContent="";
 try{
   const file=$("#image").files[0];
   const path=await upload(file);
   const {error}=await db.from("memories").insert({
     title:$("#title").value.trim(),
     category:$("#category").value.trim()||"Khác",
     description:$("#description").value.trim(),
     event_date:$("#event_date").value||null,
     author:$("#author").value.trim()||null,
     image_url:path,
     visible:$("#visible").checked
   });
   if(error)throw error;
   msg.textContent="✓ Đã thêm kỉ niệm!";
   $("#form").reset();$("#preview").textContent="Chưa chọn ảnh";$("#visible").checked=true;
   await load();
 }catch(err){console.error(err);msg.textContent="Lỗi: "+(err.message||err)}
 finally{btn.disabled=false;btn.textContent="Đăng kỉ niệm"}
};

async function load(){
 const {data,error}=await db.from("memories").select("*").order("created_at",{ascending:false});
 if(error){$("#list").innerHTML=`<div class="loading">Không tải được: ${esc(error.message)}</div>`;return}
 rows=data||[];$("#count").textContent=rows.length+" bài";
 $("#list").innerHTML=rows.length?rows.map(m=>{
   const u=m.image_url?( /^https?:/i.test(m.image_url)?m.image_url:db.storage.from("memories").getPublicUrl(m.image_url).data.publicUrl):"";
   return `<div class="item ${m.visible?"":"hiddenrow"}"><div class="thumb">${u?`<img src="${esc(u)}">`:"📷"}</div><div class="info"><b>${esc(m.title)}</b><small>Chủ đề: ${esc(m.category||"Khác")} · ${fmt(m.event_date)} · ${m.visible?"Đang hiện":"Đang ẩn"}</small></div><div class="actions"><button data-toggle="${m.id}">${m.visible?"Ẩn":"Hiện"}</button><button class="danger" data-delete="${m.id}">Xóa</button></div></div>`
 }).join(""):`<div class="loading">Chưa có kỉ niệm.</div>`;
 document.querySelectorAll("[data-toggle]").forEach(b=>b.onclick=()=>toggle(b.dataset.toggle));
 document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>remove(b.dataset.delete));
}
async function toggle(id){
 const m=rows.find(x=>String(x.id)===String(id));if(!m)return;
 const {error}=await db.from("memories").update({visible:!m.visible}).eq("id",id);
 if(error)alert(error.message);else load();
}
async function remove(id){
 const m=rows.find(x=>String(x.id)===String(id));if(!m)return;
 if(!confirm("Xóa kỉ niệm này?"))return;
 const {error}=await db.from("memories").delete().eq("id",id);
 if(error){alert(error.message);return}
 if(m.image_url&&!/^https?:/i.test(m.image_url))await db.storage.from("memories").remove([m.image_url]);
 load();
}
$("#refresh").onclick=load;load();