
const $=(s,d=document)=>d.querySelector(s), $$=(s,d=document)=>Array.from(d.querySelectorAll(s));
function getSession(){return JSON.parse(localStorage.getItem('jelisia_session')||'null');}
function getPublic(){return JSON.parse(localStorage.getItem('jelisia_social_public')||'[]');}
function setPublic(v){localStorage.setItem('jelisia_social_public', JSON.stringify(v));}
function getPending(){return JSON.parse(localStorage.getItem('jelisia_social_pending')||'[]');}
function setPending(v){localStorage.setItem('jelisia_social_pending', JSON.stringify(v));}

function fileListToBase64(files){
  const tasks = Array.from(files||[]).map(f => new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(f);
  }));
  return Promise.all(tasks);
}

function renderFeed(){
  const root = $('#socialFeed'); if(!root) return;
  const list = getPublic().slice().reverse();
  root.innerHTML = list.map(p => `
    <article class="card">
      <div class="title">@${p.user}</div>
      <p>${(p.text||'').replace(/</g,'&lt;')}</p>
      <div class="media" style="display:flex;gap:8px;flex-wrap:wrap">
        ${(p.images||[]).map(src=>`<img src="${src}" style="width:140px;height:140px;object-fit:cover;border-radius:12px;box-shadow:var(--shadow);border:1px solid var(--border)">
        `).join('')}
      </div>
      <div class="note">${new Date(p.when).toLocaleString()}</div>
    </article>
  `).join('') || '<p>Nessun post ancora.</p>';
}

function renderPendingPosts(){
  const root = $('#pendingPosts'); if(!root) return;
  const list = getPending();
  root.innerHTML = list.length ? list.map((p,idx)=>`
    <article class="card">
      <div class="title">In attesa — @${p.user}</div>
      <p>${(p.text||'').replace(/</g,'&lt;')}</p>
      <div class="media" style="display:flex;gap:8px;flex-wrap:wrap">
        ${(p.images||[]).map(src=>`<img src="${src}" style="width:120px;height:120px;object-fit:cover;border-radius:12px;box-shadow:var(--shadow);border:1px solid var(--border)">`).join('')}
      </div>
      <div class="actions" style="display:flex;gap:8px;margin-top:8px">
        <button class="btn pill" data-approve="${idx}">Approva</button>
        <button class="btn-outline pill" data-reject="${idx}">Rifiuta</button>
      </div>
    </article>
  `).join('') : '<p class="note">Nessun post in attesa.</p>';

  $$('[data-approve]').forEach(btn => btn.onclick = ()=>{
    const idx = parseInt(btn.getAttribute('data-approve'),10);
    const pend = getPending(); const p = pend.splice(idx,1)[0]; setPending(pend);
    const pub = getPublic(); pub.push(p); setPublic(pub); renderPendingPosts();
  });
  $$('[data-reject]').forEach(btn => btn.onclick = ()=>{
    const idx = parseInt(btn.getAttribute('data-reject'),10);
    const pend = getPending(); pend.splice(idx,1); setPending(pend); renderPendingPosts();
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  const form = $('#socialForm');
  if(form){
    form.onsubmit = async (e)=>{
      e.preventDefault();
      const sess = getSession();
      const user = sess?.username || 'guest';
      const data = Object.fromEntries(new FormData(form).entries());
      const imgs = await (async()=>{
        const f = form.images; if(!f || !f.files || !f.files.length) return [];
        return await fileListToBase64(f.files);
      })();
      const pend = getPending(); 
      pend.push({user, text:data.text||'', images:imgs, when: new Date().toISOString()});
      setPending(pend);
      window.UI?.toast('Inviato. In attesa di approvazione.');
      form.reset();
    };
  }
  renderFeed();
});
