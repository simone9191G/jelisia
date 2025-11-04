
(function(){
  const $=(s,d=document)=>d.querySelector(s), $$=(s,d=document)=>Array.from(d.querySelectorAll(s));
  function session(){ return JSON.parse(localStorage.getItem('jelisia_session')||'null'); }
  function users(){ return JSON.parse(localStorage.getItem('jelisia_users')||'[]'); }

  function toast(msg){
    const t=document.createElement('div'); t.className='toast'; t.textContent=msg;
    document.body.appendChild(t); setTimeout(()=>t.remove(), 3000);
  }

  function updateAuthUI(){
    const s=session();
    $$('[data-auth]').forEach(el=> el.style.display=s?'':'none');
    $$('[data-auth-hide="true"]').forEach(el=> el.style.display=s?'none':'');
    $$('[data-admin="true"]').forEach(el=> el.style.display=(s&&s.role==='admin')?'':'none');
    const brand=$('#brandUserName');
    const u=users().find(u=>u.username===s?.username);
    if(brand){
      if(s && u){ brand.textContent = (u.name? (u.name+' '+(u.surname||'')) : s.username); }
      else { brand.textContent='Jelisia'; }
    }
    const avatar=$('#menuAvatar'); if(avatar&&u&&u.avatar) avatar.src=u.avatar;
    const un=$('#menuUsername'); if(un&&s) un.textContent = u?.name? (u.name+' '+(u.surname||'')) : s.username;
    const mail=document.querySelector('.menu-email'); if(mail&&u?.email) mail.textContent=u.email;
  }

  function bindDropdown(){
    const btn=$('#logoMenuBtn'), menu=$('#userMenu');
    if(!btn||!menu) return;
    function place(){
      const r=btn.getBoundingClientRect();
      menu.style.left = (r.left + window.scrollX) + 'px';
      menu.style.top = (r.bottom + window.scrollY + 8) + 'px';
    }
    place(); window.addEventListener('resize', place); window.addEventListener('scroll', place, {passive:true});
    btn.addEventListener('click',(e)=>{ e.stopPropagation(); place(); menu.classList.toggle('show'); });
    document.addEventListener('click',()=> menu.classList.remove('show'));
    $('#openLoginLink')?.addEventListener('click',(e)=>{ e.preventDefault(); window.Auth?.openModal('login'); });
    $('#openRegisterLink')?.addEventListener('click',(e)=>{ e.preventDefault(); window.Auth?.openModal('register'); });
    $('#logoutLink')?.addEventListener('click',(e)=>{ e.preventDefault(); 
      // Do NOT delete user cart on logout (persist between sessions)
      localStorage.removeItem('jelisia_session'); 
      localStorage.removeItem('jelisia_remember'); 
      location.href='home.html'; 
    });
  }

  window.addEventListener('storage', (ev)=>{
    if(ev.key==='jelisia_users' || ev.key==='jelisia_session'){ updateAuthUI(); }
  });

  function checkShowLogin(){
    const url=new URL(location.href);
    if(url.searchParams.get('showLogin')==='1' && !session()){
      window.Auth?.openModal('login');
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    updateAuthUI(); bindDropdown(); checkShowLogin();
  });

  window.UI = { toast };
  window.$J = { session };
})();
