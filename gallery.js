
const $=(s,d=document)=>d.querySelector(s), $$=(s,d=document)=>Array.from(d.querySelectorAll(s));
function getProducts(){return JSON.parse(localStorage.getItem('jelisia_products')||'[]');}
function getGallery(){return JSON.parse(localStorage.getItem('jelisia_gallery')||'[]');}
function saveGallery(v){localStorage.setItem('jelisia_gallery', JSON.stringify(v));}

function renderGallery(){
  const grid=document.querySelector('#galleryGrid'); if(!grid) return;
  // Build items from product images + admin gallery
  const prodItems = getProducts().flatMap(p => (p.images||[]).map((src,i)=>({id:(p.id||'p')+'_'+i, title:p.title||'', category:p.category||'', src})));
  const adminItems = getGallery().flatMap(g => (g.images||[]).map((src,i)=>({id:(g.id||'g')+'_'+i, title:g.title||'', category:'', src})));
  const list = [...adminItems, ...prodItems];
  grid.innerHTML = list.length ? list.map(item=>`
    <a class="card" href="${item.src}" target="_blank" rel="noopener">
      <img src="${item.src}" alt="${(item.title||'Immagine')}" style="width:100%;height:180px;object-fit:cover;border-radius:12px;border:1px solid var(--border)">
      <div class="title" style="margin-top:8px">${item.title||'Immagine'}</div>
      <div class="note">${item.category||''}</div>
    </a>
  `).join('') : '<p class="note">Nessuna immagine in gallery. Aggiungine dall’area Admin.</p>';
}

function fileListToBase64(files){
  const tasks = Array.from(files||[]).map(f => new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(f);
  }));
  return Promise.all(tasks);
}

// Admin page helpers
function renderAdminGallery(){
  const wrap = $('#adminGallery'); if(!wrap) return;
  const gal = getGallery();
  wrap.innerHTML = gal.length ? gal.map((g,idx)=>`
    <article class="card">
      <div class="title">${g.title||'Immagini senza titolo'}</div>
      <div class="note">${g.description||''}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
        ${(g.images||[]).map(src=>`<img src="${src}" style="width:120px;height:120px;object-fit:cover;border-radius:12px;border:1px solid var(--border)"/>`).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn-outline pill" data-del="${idx}">Elimina</button>
      </div>
    </article>
  `).join('') : '<p class="note">Nessuna immagine caricata.</p>';
  $$('[data-del]').forEach(btn=> btn.onclick=()=>{
    const idx = parseInt(btn.getAttribute('data-del'),10);
    const gal = getGallery(); gal.splice(idx,1); saveGallery(gal); renderAdminGallery(); renderGallery();
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  renderGallery();
  renderAdminGallery();
  const form = document.querySelector('#galleryForm');
  if(form){
    form.onsubmit = async (e)=>{
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const imgs = await fileListToBase64(form.images.files);
      const gal = getGallery();
      gal.push({ id: Math.random().toString(36).slice(2,10), title: data.title||'', description: data.description||'', images: imgs });
      saveGallery(gal);
      form.reset();
      window.UI?.toast('Immagini aggiunte alla gallery');
      renderAdminGallery(); renderGallery();
    };
  }
  window.addEventListener('jelisia:products-updated', renderGallery);
});
