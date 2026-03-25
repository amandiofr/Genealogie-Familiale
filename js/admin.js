// ══════════════════════════════════════════════════════════════
//  ADMIN — USERS
// ══════════════════════════════════════════════════════════════
async function loadUsers(){
  const users=await api('GET','api/utilisateurs.php');
  document.getElementById('users-list').innerHTML=users.map(u=>`
    <div class="user-row">
      <div style="flex:1;"><div style="font-size:.88rem;font-weight:500;">${u.nom}</div><div style="font-size:.72rem;color:var(--ink3);">${u.email}</div></div>
      <span class="role-badge ${u.role}">${u.role}</span>
      <button class="btn-sm" onclick="deleteUser(${u.id},'${u.role}')">🗑</button>
    </div>`).join('');
}

function showAddUser(){
  document.getElementById('modal-user').innerHTML=`
    <div class="modal-hd" style="padding:1.2rem 1.4rem .8rem;">
      <div style="flex:1;font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:500;">Nouveau compte</div>
      <button class="modal-close" onclick="closeOverlay('modal-user-overlay')">✕</button>
    </div>
    <div class="modal-bd">
      <div class="fg"><label>Nom</label><input id="nu-nom" placeholder="Prénom Nom"></div>
      <div class="fg"><label>Email</label><input type="email" id="nu-email" placeholder="email@exemple.fr"></div>
      <div class="fg"><label>Mot de passe</label><input type="password" id="nu-pass" placeholder="Min. 8 caractères"></div>
      <div class="fg"><label>Rôle</label><select id="nu-role"><option value="lecteur">Lecteur — consultation uniquement</option><option value="editeur">Éditeur — peut ajouter/modifier</option><option value="admin">Administrateur — accès total</option></select></div>
      <div class="form-actions">
        <button class="btn-primary" onclick="createUser()">Créer le compte</button>
        <button class="btn-secondary" onclick="closeOverlay('modal-user-overlay')">Annuler</button>
      </div>
    </div>`;
  document.getElementById('modal-user-overlay').classList.add('open');
}

async function createUser(){
  const body={nom:document.getElementById('nu-nom').value.trim(),email:document.getElementById('nu-email').value.trim(),password:document.getElementById('nu-pass').value,role:document.getElementById('nu-role').value};
  try{await api('POST','api/utilisateurs.php',body);closeOverlay('modal-user-overlay');loadUsers();toast(T('toast_user_created'));}
  catch(e){toast(e.message,'error');}
}

async function deleteUser(id,role){
  if(!confirm(T('confirm_delete_user'))) return;
  try{await api('DELETE',`api/utilisateurs.php?id=${id}`);loadUsers();toast(T('toast_user_deleted'));}
  catch(e){toast(e.message,'error');}
}

async function changePassword(){
  const body={ancien:document.getElementById('pwd-old').value,nouveau:document.getElementById('pwd-new').value};
  try{await api('PUT','api/auth.php?action=password',body);toast(T('toast_pwd'));document.getElementById('pwd-old').value='';document.getElementById('pwd-new').value='';}
  catch(e){toast(e.message,'error');}
}

// ══════════════════════════════════════════════════════════════
//  IMPORT
// ══════════════════════════════════════════════════════════════
async function importFile(type){
  const input=document.getElementById(`import-${type}-file`);
  if(!input?.files?.length){toast('Sélectionnez un fichier','error');return;}
  const fd=new FormData(); fd.append('file',input.files[0]);
  try{
    const r=await fetch(`api/export.php?action=import-${type}`,{method:'POST',body:fd});
    const d=await r.json();
    if(!r.ok) throw new Error(d.error);
    await loadPeople(); renderTree();
    toast(d.message);
  }catch(e){toast(e.message,'error');}
}

// ══════════════════════════════════════════════════════════════
//  MISC
// ══════════════════════════════════════════════════════════════
function closeOverlay(id){ document.getElementById(id).classList.remove('open'); }
function openLightbox(src){ document.getElementById('lightbox-img').src=src; document.getElementById('lightbox').classList.add('open'); }
function closeLightbox(){ document.getElementById('lightbox').classList.remove('open'); }

function toast(msg,type='ok'){
  const el=document.getElementById('toast');
  el.textContent=msg;
  el.style.background=type==='error'?'#c44':'var(--ink)';
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2800);
}

async function logout(){
  await fetch('api/auth.php?action=logout',{method:'POST'});
  window.location.href='login.html';
}

// ══════════════════════════════════════════════════════════════
//  BOOTSTRAP
// ══════════════════════════════════════════════════════════════
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.overlay.open,.lightbox.open').forEach(el => el.classList.remove('open'));
  }
});

init().catch(err => {
  document.body.innerHTML = '<div style="padding:2rem;font-family:monospace;color:red;background:#fff;position:fixed;inset:0;overflow:auto;z-index:9999;">'
    + '<h2>Erreur au démarrage</h2><pre>' + err.stack + '</pre></div>';
  console.error('init() failed:', err);
});
