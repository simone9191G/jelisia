
const $=(s,d=document)=>d.querySelector(s), $$=(s,d=document)=>Array.from(d.querySelectorAll(s));
function cartKey(){
  const s = JSON.parse(localStorage.getItem('jelisia_session') || 'null');
  return s && s.username ? `jelisia_cart_${s.username}` : 'jelisia_cart_guest';
}
function getProducts(){ return JSON.parse(localStorage.getItem('jelisia_products')||'[]'); }
function getCart(){ return JSON.parse(localStorage.getItem(cartKey())||'[]'); }
function saveCart(c){ localStorage.setItem(cartKey(), JSON.stringify(c)); }
function getSession(){ return JSON.parse(localStorage.getItem('jelisia_session')||'null'); }

const EMAILJS_SERVICE_ID = "service_jelisia";
const EMAILJS_TEMPLATE_ID_ADMIN = "template_ordini";
const EMAILJS_TEMPLATE_ID_CLIENT = "template_conferma_ordine";
const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY";
const ADMIN_EMAIL = "info@jelisia.example";

function sendOrderEmailAdmin(order){
  try{
    if(!window.emailjs) return;
    const itemsText = order.items.map(i => `- ${i.title} × ${i.qty} — €${(i.qty*i.price).toFixed(2)}`).join('\\n');
    const payload = {
      admin_email: ADMIN_EMAIL,
      order_id: order.id,
      customer_name: order.shipping.name + ' ' + order.shipping.surname,
      customer_email: order.shipping.email,
      shipping_address: `${order.shipping.address}, ${order.shipping.zip} ${order.shipping.city}, ${order.shipping.country}`,
      payment_method: order.pay,
      order_total: order.total.toFixed(2),
      order_items: itemsText
    };
    window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_ADMIN, payload, EMAILJS_PUBLIC_KEY);
  }catch(e){ console.warn('EmailJS admin failed', e); }
}

function sendOrderEmailClient(order){
  try{
    if(!window.emailjs) return;
    const itemsText = order.items.map(i => `- ${i.title} × ${i.qty} — €${(i.qty*i.price).toFixed(2)}`).join('\\n');
    const payload = {
      to_email: order.shipping.email,
      order_id: order.id,
      customer_name: order.shipping.name,
      order_total: order.total.toFixed(2),
      order_items: itemsText
    };
    window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_CLIENT, payload, EMAILJS_PUBLIC_KEY);
  }catch(e){ console.warn('EmailJS client failed', e); }
}

function renderCart(){
  const root = $('#cartList'); if(!root) return;
  const prods = getProducts();
  const cart = getCart();
  let total = 0;
  root.innerHTML = cart.map(item => {
    const p = prods.find(x=>x.id===item.id);
    if(!p) return '';
    const img = (p.images && p.images[0]) ? `<img src="${p.images[0]}"/>` : `<div style="width:64px;height:64px;border-radius:12px;background:#fff;border:1px dashed var(--border)"></div>`;
    const line = Number(p.price||0) * item.qty; total += line;
    return `<div class="cart-item">
      ${img}
      <div>
        <div><strong>${p.title||''}</strong></div>
        <div>€${Number(p.price||0).toFixed(2)} × 
          <input type="number" min="1" value="${item.qty}" data-id="${p.id}" class="qty" style="width:64px" />
        </div>
      </div>
      <button class="btn-outline pill remove" data-id="${p.id}">Rimuovi</button>
    </div>`;
  }).join('');
  const t = $('#cartTotal'); if(t) t.textContent = `€${total.toFixed(2)}`;

  $$('.qty').forEach(inp => inp.onchange = () => {
    const id = inp.dataset.id; const c = getCart();
    const it = c.find(i=>i.id===id); if(it){ it.qty = Math.max(1, parseInt(inp.value||'1',10)); saveCart(c); renderCart(); }
  });
  $$('.remove').forEach(btn => btn.onclick = () => {
    let c = getCart().filter(i=>i.id!==btn.dataset.id);
    saveCart(c); renderCart();
  });
}

function handleCheckout(){
  const form = $('#checkoutForm'); if(!form) return;

  form.querySelectorAll('.pay-option input[type="radio"]').forEach(r => {
    r.addEventListener('change', () => {
      form.querySelectorAll('.pay-option').forEach(l => l.classList.remove('active'));
      r.closest('.pay-option').classList.add('active');
    });
  });

  form.onsubmit = (e)=>{
    e.preventDefault();
    const user = getSession();
    const cart = getCart();
    if(!cart.length){ window.UI?.toast('Carrello vuoto'); return; }
    const data = Object.fromEntries(new FormData(form).entries());
    const prods = getProducts();
    const items = cart.map(ci => {
      const p = prods.find(x=>x.id===ci.id);
      return { id: ci.id, title: p?.title||'?', qty: ci.qty, price: Number(p?.price||0) };
    });
    const total = items.reduce((s,i)=> s + i.qty*i.price, 0);

    const order = {
      id: Math.random().toString(36).slice(2,10),
      user: user?.username || 'guest',
      when: new Date().toISOString(),
      shipping: data,
      items, total, pay: data.pay,
      status: 'Pagato'
    };
    const orders = JSON.parse(localStorage.getItem('jelisia_orders')||'[]');
    orders.push(order);
    localStorage.setItem('jelisia_orders', JSON.stringify(orders));
    saveCart([]);
    sendOrderEmailAdmin(order);
    sendOrderEmailClient(order);
    window.UI?.toast('Ordine confermato!');
    location.href = 'orders.html';
  };
}

function renderOrders(){
  const root = $('#ordersList'); if(!root) return;
  const session = getSession();
  if(!session){ root.innerHTML = '<p>Devi effettuare il login per vedere gli ordini.</p>'; return; }
  const orders = JSON.parse(localStorage.getItem('jelisia_orders')||'[]').filter(o=>o.user===session.username);
  root.innerHTML = orders.map(o => {
    const lines = o.items.map(i=>`<li>${i.title} × ${i.qty} — €${(i.qty*i.price).toFixed(2)}</li>`).join('');
    return `<article class="order">
      <h3>Ordine #${o.id} • ${new Date(o.when).toLocaleString()}</h3>
      <ul>${lines}</ul>
      <p><strong>Totale:</strong> €${o.total.toFixed(2)} — <em>Pagamento:</em> ${o.pay} — <em>Stato:</em> ${o.status||'Pagato'}</p>
    </article>`;
  }).join('') || '<p>Nessun ordine ancora.</p>';
}

document.addEventListener('DOMContentLoaded', ()=>{ renderCart(); handleCheckout(); renderOrders(); });
