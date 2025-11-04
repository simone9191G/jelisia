
const $=(s,d=document)=>d.querySelector(s), $$=(s,d=document)=>Array.from(d.querySelectorAll(s));
function getSession(){ return JSON.parse(localStorage.getItem('jelisia_session')||'null'); }
function isAdmin(){ return getSession()?.role === 'admin'; }
function getProducts(){ return JSON.parse(localStorage.getItem('jelisia_products')||'[]'); }
function saveProducts(a){ localStorage.setItem('jelisia_products', JSON.stringify(a)); window.dispatchEvent(new CustomEvent('jelisia:products-updated')); }
function getOrders(){ return JSON.parse(localStorage.getItem('jelisia_orders')||'[]'); }
function saveOrders(a){ localStorage.setItem('jelisia_orders', JSON.stringify(a)); }
function getGallery(){ return JSON.parse(localStorage.getItem('jelisia_gallery')||'[]'); }
function saveGallery(v){ localStorage.setItem('jelisia_gallery', JSON.stringify(v)); }

// Admin Products
function renderAdminProducts(){
  const root = $('#adminProducts'); if(!root) return;
  const list = getProducts();
  root.innerHTML = list.length ? list.map(p=>`<article class="card">
    <div class="title">${p.title}</div>
    <div class="note">${p.category||'-'} • €${Number(p.price||0).toFixed(2)}</div>
    <div class="actions" style="display:flex;gap:8px;margin-top:8px">
      <button class="btn-outline pill" data-edit="${p.id}">Modifica</button>
      <button class="btn-outline pill" data-del="${p.id}">Elimina</button>
    </div>
  </article>`).join('') : '<p class="note">Nessun prodotto presente.</p>';
  $$('[data-del]').forEach(b=> b.onclick = ()=>{
    if(!isAdmin()) return window.UI?.toast('Solo admin');
    const id = b.getAttribute('data-del');
    const next = getProducts().filter(x=>x.id!==id);
    saveProducts(next); renderAdminProducts();
  });
  $$('[data-edit]').forEach(b=> b.onclick = ()=>{
    const id = b.getAttribute('data-edit');
    const p = getProducts().find(x=>x.id===id);
    const form = $('#addProductForm'); if(!p || !form) return;
    form.title.value = p.title||'';
    form.category.value = p.category||'';
    form.price.value = p.price||0;
    form.description.value = p.description||'';
    form.dataset.editing = p.id;
    form.scrollIntoView({behavior:'smooth'});
  });
}

// Admin Orders
function renderAdminOrders(){
  const root = $('#adminOrders'); if(!root) return;
  const list = getOrders().slice().reverse();
  root.innerHTML = list.length ? list.map(o=>{
    const lines = (o.items||[]).map(i=>`<li>${i.title} × ${i.qty} — €${(i.qty*i.price).toFixed(2)}`).join('</li><li>'));
    const s = o.shipping || {};
    return `<article class="order">
      <h3>Ordine #${o.id} • ${new Date(o.when).toLocaleString()} — <em>${o.status||'Pagato'}</em></h3>
      <p><strong>Cliente:</strong> ${s.name||''} ${s.surname||''} — <a href="mailto:${s.email||'#'}">${s.email||''}</a></p>
      <p><strong>Indirizzo:</strong> ${s.address||''}, ${s.zip||''} ${s.city||''}, ${s.country||''} — <strong>Telefono:</strong> ${s.phone||''}</p>
      <ul><li>${lines}</li></ul>
      <p><strong>Totale:</strong> €${Number(o.total||0).toFixed(2)} — <strong>Pagamento:</strong> ${o.pay||''}</p>
      <div class="actions" style="display:flex;gap:8px;margin-top:8px">
        <button class="btn pill" data-fulfill="${o.id}">Segna come evaso</button>
        <button class="btn-outline pill" data-delete="${o.id}">Elimina</button>
      </div>
    </article>`;
  }).join('') : '<p class="note">Nessun ordine ricevuto.</p>';

  $$('[data-fulfill]').forEach(btn => btn.onclick = ()=>{
    if(!isAdmin()) return window.UI?.toast('Solo admin');
    const id = btn.getAttribute('data-fulfill');
    const arr = getOrders().map(o => o.id===id ? {...o, status:'Evaso'} : o);
    saveOrders(arr); renderAdminOrders();
  });
  $$('[data-delete]').forEach(btn => btn.onclick = ()=>{
    if(!isAdmin()) return window.UI?.toast('Solo admin');
    const id = btn.getAttribute('data-delete');
    const arr = getOrders().filter(o => o.id!==id);
    saveOrders(arr); renderAdminOrders();
  });
}

// Admin Gallery
async function fileToBase64(f){
  return await new Promise((res,rej)=>{ const R=new FileReader(); R.onload=()=>res(R.result); R.onerror=rej; R.readAsDataURL(f); });
}
async function filesToBase64(list){
  const out=[]; for(const f of Array.from(list||[])){ out.push(await fileToBase64(f)); } return out;
}

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
    if(!isAdmin()) return window.UI?.toast('Solo admin');
    const idx = parseInt(btn.getAttribute('data-del'),10);
    const gal = getGallery(); gal.splice(idx,1); saveGallery(gal); renderAdminGallery();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Products form
  const form = $('#addProductForm');
  if(form){
    form.onsubmit = async (e)=>{
      e.preventDefault();
      if(!isAdmin()) return window.UI?.toast('Solo admin');
      const data = Object.fromEntries(new FormData(form).entries());
      data.price = parseFloat(data.price||'0');
      const files = form.images.files;
      const b64s = await filesToBase64(files);
      let list = getProducts();
      const editing = form.dataset.editing;
      if(editing){
        const idx = list.findIndex(x=>x.id===editing);
        if(idx>=0){ list[idx] = {...list[idx], ...data, images: (b64s.length? b64s : list[idx].images)}; }
        delete form.dataset.editing;
      }else{
        list.push({ id: Math.random().toString(36).slice(2,10), ...data, images: b64s });
      }
      saveProducts(list);
      window.UI?.toast('Prodotto salvato');
      form.reset();
      renderAdminProducts();
    };
  }

  // Gallery form
  const gform = $('#galleryForm');
  if(gform){
    gform.onsubmit = async (e)=>{
      e.preventDefault();
      if(!isAdmin()) return window.UI?.toast('Solo admin');
      const data = Object.fromEntries(new FormData(gform).entries());
      const imgs = await filesToBase64(gform.images.files);
      const gal = getGallery();
      gal.push({ id: Math.random().toString(36).slice(2,10), title: data.title||'', description: data.description||'', images: imgs });
      saveGallery(gal);
      window.UI?.toast('Immagini aggiunte alla gallery');
      gform.reset();
      renderAdminGallery();
      // Trigger gallery page refresh via storage event
      window.dispatchEvent(new Event('storage'));
    };
  }

  renderAdminProducts();
  renderAdminOrders();
  renderAdminGallery();
});
