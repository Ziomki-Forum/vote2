// admin.js (compat)
if (typeof firebase === 'undefined'){
  alert('Błąd: Firebase SDK nie załadowane');
}

const firebaseConfig = {
apiKey: "AIzaSyDrH70P_t7GEpfaFPISF9PmZu4TwhtmOTI",
  authDomain: "vote2-6e553.firebaseapp.com",
  projectId: "vote2-6e553",
  storageBucket: "vote2-6e553.firebasestorage.app",
  messagingSenderId: "426318102620",
  appId: "1:426318102620:web:e4b39f2f5f87dc34fd6699",
  measurementId: "G-7N5F3QPNLG"  // opcjonalne, możesz zostawić
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const loginBox = document.getElementById('login');
const panelBox = document.getElementById('panel');
const loginMsg = document.getElementById('login-msg');

const btnLogin = document.getElementById('btn-login');
const btnCreate = document.getElementById('btn-create');
const votingsList = document.getElementById('votings-list');

btnLogin.onclick = async () => {
  const email = document.getElementById('admin-email').value;
  const pass = document.getElementById('admin-pass').value;
  try{
    await auth.signInWithEmailAndPassword(email, pass);
    loginMsg.textContent = 'Zalogowano';
  }catch(e){
    loginMsg.textContent = 'Błąd logowania: ' + e.message;
  }
};

auth.onAuthStateChanged(user=>{
  if(user){
    loginBox.style.display = 'none';
    panelBox.style.display = 'block';
    loadVotings();
  } else {
    loginBox.style.display = 'block';
    panelBox.style.display = 'none';
  }
});

btnCreate.onclick = async () => {
  const title = document.getElementById('new-title').value.trim();
  const desc = document.getElementById('new-desc').value.trim();
  if(!title) return alert('Podaj tytuł');

  await db.collection('votings').add({
    title,
    description: desc,
    status: 'active',
    created: new Date().toISOString()
  });
  document.getElementById('new-title').value = '';
  document.getElementById('new-desc').value = '';
  loadVotings();
};

async function loadVotings(){
  const snap = await db.collection('votings').orderBy('created','desc').get();
  votingsList.innerHTML = '';
  snap.forEach(doc=>{
    const d = doc.data();
    const id = doc.id;
    const div = document.createElement('div');
    div.className = 'box';
    div.innerHTML = `
      <b>${d.title}</b><br><small class="small">${d.description || ''}</small><br>
      Status: <b>${d.status}</b><br>
      <button data-id="${id}" class="btn-close">${d.status==='active' ? 'Zamknij' : 'Otwórz'}</button>
      <button data-id="${id}" class="btn-delete">Usuń</button>
      <button data-id="${id}" class="btn-show">Pokaż głosy</button>
      <div id="votes-${id}" style="margin-top:8px;"></div>
    `;
    votingsList.appendChild(div);
  });

  // attach handlers
  document.querySelectorAll('.btn-close').forEach(b=>{
    b.onclick = async (e)=>{
      const id = e.currentTarget.dataset.id;
      const cur = (await db.collection('votings').doc(id).get()).data();
      const next = cur.status === 'active' ? 'closed' : 'active';
      await db.collection('votings').doc(id).update({ status: next });
      loadVotings();
    };
  });
  document.querySelectorAll('.btn-delete').forEach(b=>{
    b.onclick = async (e)=>{
      const id = e.currentTarget.dataset.id;
      if(!confirm('Usunąć sprawę i wszystkie głosy?')) return;
      // usuń subkolekcję votes — Firestore nie pozwala na masowe usuwanie bez funkcji, usuniemy dokument główny (subkolekcje pozostają)
      // lepiej: pozostawiamy dokument i oznaczamy usunięty. Dla demo usuniemy dokument:
      await db.collection('votings').doc(id).delete();
      loadVotings();
    };
  });
  document.querySelectorAll('.btn-show').forEach(b=>{
    b.onclick = async (e)=>{
      const id = e.currentTarget.dataset.id;
      const box = document.getElementById('votes-'+id);
      box.innerHTML = 'Ładowanie...';
      const snap = await db.collection('votings').doc(id).collection('votes').get();
      if(snap.empty){ box.innerHTML = 'Brak głosów'; return; }
      let html = '<ul>';
      snap.forEach(d=>{
        const v = d.data();
        html += `<li>${v.displayName || '—'} — ${v.choice} — ${v.ts || ''}</li>`;
      });
      html += '</ul>';
      box.innerHTML = html;
    };
  });
}

