
const $=(s,d=document)=>d.querySelector(s), $$=(s,d=document)=>Array.from(d.querySelectorAll(s));
function getProducts(){return JSON.parse(localStorage.getItem('jelisia_products')||'[]');}
function saveProducts(a){localStorage.setItem('jelisia_products', JSON.stringify(a)); window.dispatchEvent(new CustomEvent('jelisia:products-updated'));}

function card(p){
  const img=(p.images&&p.images[0])?`<img src="${p.images[0]}" alt="${p.title}" style="width:100%;height:160px;object-fit:cover;border-radius:12px;border:1px solid var(--border)">`:`<div class="ph-img"></div>`;
  return `<article class="card">
    <a class="title" href="product.html?id=${encodeURIComponent(p.id)}">${p.title}</a>
    <div class="media">${img}</div>
    <div class="price">€${Number(p.price||0).toFixed(2)}</div>
    <button class="btn add-to-cart pill" data-id="${p.id}">Aggiungi al carrello</button>
  </article>`;
}

function renderFeatured(){
  const root=$('#featuredGrid'); if(!root) return;
  const ids=JSON.parse(localStorage.getItem('jelisia_featured')||'[]');
  const prods=getProducts().filter(p=>ids.includes(p.id));
  root.innerHTML = prods.length ? prods.map(card).join('') : '<p class="note">Nessun prodotto in evidenza.</p>';
  bindCardButtons(root);
}

function renderProducts(){
  const grid=$('#productsGrid'); if(!grid) return;
  const q=($('#searchInput')?.value||'').toLowerCase();
  const cat=$('#categorySelect')?.value||'';
  let list=getProducts();
  if(q) list=list.filter(p=> (p.title||'').toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q));
  if(cat) list=list.filter(p=>p.category===cat);
  grid.innerHTML = list.length ? list.map(card).join('') : '<p class="note">Nessun prodotto disponibile.</p>';
  bindCardButtons(grid);
}

function bindCardButtons(scope=document){
  $$('.add-to-cart',scope).forEach(btn=>{
    btn.onclick=()=>{ addToCart(btn.dataset.id); window.UI?.toast('Aggiunto al carrello'); };
  });
}

function addToCart(id){
  const s = JSON.parse(localStorage.getItem('jelisia_session')||'null');
  const key = s && s.username ? 'jelisia_cart_'+s.username : 'jelisia_cart_guest';
  const cart=JSON.parse(localStorage.getItem(key)||'[]');
  const found=cart.find(i=>i.id===id);
  if(found) found.qty+=1; else cart.push({id, qty:1});
  localStorage.setItem(key, JSON.stringify(cart));
}

function renderProductDetail(){
  const root=$('#productDetail'); if(!root) return;
  const url=new URL(location.href);
  const id=url.searchParams.get('id');
  const p=getProducts().find(x=>x.id===id);
  if(!p){ root.innerHTML='<p>Prodotto non trovato.</p>'; return; }
  const imgs=(p.images&&p.images.length)?p.images:[];
  const slider = imgs.length ? `
    <div class="product-view">
      <div class="product-slider" tabindex="0">
        <span class="arrow left" aria-label="Precedente" role="button">◀</span>
        ${imgs.map((src,i)=>`<img src="${src}" alt="${p.title} foto ${i+1}" class="${i===0?'active':''}">`).join('')}
        <span class="arrow right" aria-label="Successiva" role="button">▶</span>
      </div>
    </div>` : '<div class="ph-img" style="width:100%;height:300px;"></div>';

  root.innerHTML=`
    ${slider}
    <section class="info">
      <h1>${p.title}</h1>
      <div class="price">€${Number(p.price||0).toFixed(2)}</div>
      <p>${p.description||''}</p>
      <p class="note">Categoria: ${p.category||'-'}</p>
      <button class="btn pill" id="addOne">Aggiungi al carrello</button>
    </section>`;

  $('#addOne').onclick=()=>{ addToCart(p.id); window.UI?.toast('Aggiunto al carrello'); };

  // Slider logic
  if(imgs.length){
    let current=0;
    const pics = $$('.product-slider img');
    const left = $('.product-slider .arrow.left');
    const right = $('.product-slider .arrow.right');
    function show(idx){
      current = (idx + pics.length) % pics.length;
      pics.forEach((im,i)=> im.classList.toggle('active', i===current));
    }
    left.onclick = ()=> show(current-1);
    right.onclick = ()=> show(current+1);
    const wrap = $('.product-slider');
    wrap.addEventListener('keydown', (e)=>{
      if(e.key==='ArrowLeft') show(current-1);
      else if(e.key==='ArrowRight') show(current+1);
    });
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  renderFeatured(); renderProducts(); renderProductDetail();
  const si=$('#searchInput'), cs=$('#categorySelect'), cf=$('#clearFilters');
  if(si) si.oninput=renderProducts;
  if(cs) cs.onchange=renderProducts;
  if(cf) cf.onclick=()=>{ si.value=''; cs.value=''; renderProducts(); };
  window.addEventListener('jelisia:products-updated', ()=>{ renderProducts(); renderFeatured(); renderProductDetail(); });
});
