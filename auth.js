
(function(){
  const $=(s,d=document)=>d.querySelector(s), $$=(s,d=document)=>Array.from(d.querySelectorAll(s));
  function getUsers(){ return JSON.parse(localStorage.getItem('jelisia_users')||'[]'); }
  function saveUsers(u){ localStorage.setItem('jelisia_users', JSON.stringify(u)); window.dispatchEvent(new CustomEvent('jelisia:users-updated')); }
  function getSession(){ return JSON.parse(localStorage.getItem('jelisia_session')||'null'); }
  function setSession(s){ localStorage.setItem('jelisia_session', JSON.stringify(s)); }

  // EmailJS (registrazione)
  const EMAILJS_SERVICE_ID='service_jelisia';
  const EMAILJS_TEMPLATE_WELCOME='template_welcome';
  const EMAILJS_PUBLIC_KEY='YOUR_PUBLIC_KEY';
  function sendWelcomeEmail(data){
    try{ if(!window.emailjs) return;
      const payload={ customer_name:data.name||data.username, customer_email:data.email };
      window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_WELCOME, payload, EMAILJS_PUBLIC_KEY);
    }catch(e){ console.warn('EmailJS welcome failed', e); }
  }

  // Seed admin only
  (function(){
    const users=getUsers();
    if(!users.find(u=>u.username==='admin')){
      users.push({name:'Admin',surname:'',age:0,username:'admin',password:'admin123',email:'',address:'',nationality:'',phone:'',cell:'',role:'admin',avatar:''});
      saveUsers(users);
    }
  })();

  function mergeGuestCartTo(username){
    const guest = JSON.parse(localStorage.getItem('jelisia_cart_guest')||'[]');
    const key = 'jelisia_cart_'+username;
    const mine = JSON.parse(localStorage.getItem(key)||'[]');
    const merged = [...mine];
    guest.forEach(g=>{
      const f = merged.find(x=>x.id===g.id);
      if(f) f.qty += g.qty;
      else merged.push(g);
    });
    localStorage.setItem(key, JSON.stringify(merged));
    localStorage.removeItem('jelisia_cart_guest');
  }

  function buildModal(mode){
    const backdrop=document.createElement('div'); backdrop.className='backdrop show';
    const modal=document.createElement('div'); modal.className='modal show';
    modal.innerHTML=`
      <div class="modal-card">
        <div class="modal-header-logo"><img src="logo.png" alt="Jelisia"></div>
        <h2>${mode==='register'?'Crea il tuo account':'Accedi a Jelisia'}</h2>
        <div class="modal-switch">
          <button class="pill" id="switchLogin">Login</button>
          <button class="pill" id="switchRegister">Registrati</button>
        </div>
        <form id="loginForm" class="form" style="${mode==='login'?'':'display:none'}">
          <input name="username" placeholder="Username" required />
          <input name="password" type="password" placeholder="Password" required />
          <label class="remember" style="display:flex;gap:8px;align-items:center">
            <input type="checkbox" name="remember" /> Ricordami
          </label>
          <div class="modal-actions">
            <button class="btn pill" type="submit">Entra</button>
          </div>
        </form>
        <form id="registerForm" class="form grid-2" style="${mode==='register'?'':'display:none'}">
          <input name="name" placeholder="Nome" required />
          <input name="surname" placeholder="Cognome" required />
          <input name="age" type="number" min="0" placeholder="Età" required />
          <input name="username" placeholder="Username" required />
          <input name="password" type="password" placeholder="Password" required />
          <input name="email" type="email" placeholder="Email" required />
          <input name="address" placeholder="Indirizzo" required />
          <input name="nationality" placeholder="Nazionalità" required />
          <input name="phone" placeholder="Telefono" required />
          <input name="cell" placeholder="Cellulare" required />
          <div class="modal-actions" style="grid-column:1/-1">
            <button class="btn pill" type="submit">Crea account</button>
          </div>
        </form>
      </div>`;
    function close(){ backdrop.remove(); modal.remove(); }
    backdrop.addEventListener('click', close);
    document.body.appendChild(backdrop); document.body.appendChild(modal);

    modal.querySelector('#switchLogin').onclick=()=>{ modal.querySelector('#loginForm').style.display='grid'; modal.querySelector('#registerForm').style.display='none'; };
    modal.querySelector('#switchRegister').onclick=()=>{ modal.querySelector('#loginForm').style.display='none'; modal.querySelector('#registerForm').style.display='grid'; };

    modal.querySelector('#registerForm').onsubmit=(e)=>{
      e.preventDefault();
      const data=Object.fromEntries(new FormData(e.target).entries());
      const users=getUsers();
      if(users.find(u=>u.username===data.username)){ window.UI?.toast('Username già in uso'); return; }
      users.push({...data, role:'user', avatar:''});
      saveUsers(users);
      sendWelcomeEmail(data);
      window.UI?.toast('Registrazione completata! Buono 10% inviato via email.');
      setSession({username:data.username, role:'user'});
      localStorage.setItem('jelisia_remember','true');
      // Merge guest cart into user cart (persist cart)
      mergeGuestCartTo(data.username);
      close(); location.href='home.html';
    };

    modal.querySelector('#loginForm').onsubmit=(e)=>{
      e.preventDefault();
      const data=Object.fromEntries(new FormData(e.target).entries());
      const user=getUsers().find(u=>u.username===data.username && u.password===data.password);
      if(!user){ window.UI?.toast('Credenziali non valide'); return; }
      setSession({username:user.username, role:user.role});
      if(data.remember) localStorage.setItem('jelisia_remember','true'); else localStorage.removeItem('jelisia_remember');
      // Merge guest cart into user cart (persist cart)
      mergeGuestCartTo(user.username);
      window.UI?.toast('Benvenuta/o!');
      close(); location.href='home.html';
    };

    return { close };
  }

  function openModal(mode='login'){ buildModal(mode); }

  // Profile page
  document.addEventListener('DOMContentLoaded', ()=>{
    const pf=$('#profileForm'); if(!pf) return;
    const s=getSession(); if(!s){ window.UI?.toast('Devi essere loggata/o'); location.href='home.html?showLogin=1'; return; }
    const users=getUsers(); const u=users.find(x=>x.username===s.username);
    if(u){
      pf.name.value=u.name||''; pf.surname.value=u.surname||''; pf.age.value=u.age||'';
      pf.email.value=u.email||''; pf.address.value=u.address||''; pf.nationality.value=u.nationality||'';
      pf.phone.value=u.phone||''; pf.cell.value=u.cell||'';
      if(u.avatar) document.getElementById('profileAvatarPreview').src=u.avatar;
    }
    const file=$('#profileAvatar');
    function fileToBase64(f){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f); }); }
    file?.addEventListener('change', async ()=>{ const f=file.files?.[0]; if(!f) return; const b64=await fileToBase64(f); $('#profileAvatarPreview').src=b64; pf.dataset.newAvatar=b64; });
    pf.onsubmit=(e)=>{
      e.preventDefault();
      const data=Object.fromEntries(new FormData(pf).entries());
      const users=getUsers(); const idx=users.findIndex(x=>x.username===s.username);
      if(idx>=0){ users[idx]={...users[idx], ...data}; if(pf.dataset.newAvatar) users[idx].avatar=pf.dataset.newAvatar; if(!data.password) users[idx].password=users[idx].password; }
      saveUsers(users); window.UI?.toast('Profilo aggiornato'); location.href='home.html';
    };
  });

  window.Auth={ openModal };
})();
