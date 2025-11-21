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
  measurementId: "G-7N5F3QPNLG"
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

let liveListeners = {}; // store unsubscribe functions for vote listeners

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
    // remove any live listeners if admin logs out
    Object.values(liveListeners).forEach(unsub => {
      try { unsub(); } catch(e) {}
    });
    liveListeners = {};
  }
});

btnCreate.onclick = async () => {
  const title = document.getElementById('new-title').value.trim();
  const desc = document.getElementById('new-desc').value.trim();
  if(!title) return alert('Podaj tytuł');

  await db.collection('votings').add({
    title,
    description: desc,
    status: 'draft',
    created: new Date().toISOString()
  });

  document.getElementById('new-title').value = '';
  document.getElementById('new-desc').value = '';
  loadVotings();
};

async function loadVotings(){
  // Load all votings ordered by created desc
  const snap = await db.collection('votings').orderBy('created','desc').get();
  votingsList.innerHTML = '';

  snap.forEach(doc=>{
    const d = doc.data();
    const id = doc.id;
    const div = document.createElement('div');
    div.className = 'box';

    div.innerHTML = `
      <b>${escapeHtml(d.title)}</b><br>
      <small class="small">${escapeHtml(d.description || '')}</small><br>
      Status: <b>${escapeHtml(d.status)}</b><br>

      ${
        d.status === 'draft'
          ? `<button data-id="${id}" class="btn-start">Rozpocznij głosowanie</button>`
          : d.status === 'voting'
            ? `<button data-id="${id}" class="btn-stop">Zakończ głosowanie</button>`
            : ''
      }

      <button data-id="${id}" class="btn-delete">Usuń</button>
      <button data-id="${id}" class="btn-show">Podgląd głosów (LIVE)</button>

      <div id="votes-${id}" style="margin-top:8px;"></div>
    `;
    votingsList.appendChild(div);
  });

  // attach handlers
  document.querySelectorAll('.btn-start').forEach(b=>{
    b.onclick = async e=>{
      const id = e.currentTarget.dataset.id;
      await db.collection('votings').doc(id).update({ status: 'voting' });
      loadVotings();
    };
  });

  document.querySelectorAll('.btn-stop').forEach(b=>{
    b.onclick = async e=>{
      const id = e.currentTarget.dataset.id;
      await db.collection('votings').doc(id).update({ status: 'closed' });
      loadVotings();
    };
  });

  document.querySelectorAll('.btn-delete').forEach(b=>{
    b.onclick = async e=>{
      const id = e.currentTarget.dataset.id;
      if(!confirm('Usunąć sprawę?')) return;
      // Cleanup votes subcollection optionally (not required here)
      await db.collection('votings').doc(id).delete();
      loadVotings();
    };
  });

  document.querySelectorAll('.btn-show').forEach(b=>{
    b.onclick = e=>{
      const id = e.currentTarget.dataset.id;
      const box = document.getElementById('votes-'+id);

      // if already listening -> unsubscribe (toggle)
      if(liveListeners[id]){
        liveListeners[id](); // unsubscribe
        delete liveListeners[id];
        box.innerHTML = 'Podgląd zatrzymany.';
        return;
      }

      box.innerHTML = 'Ładowanie…';

      const unsub = db.collection('votings').doc(id).collection('votes')
        .orderBy('ts','desc')
        .onSnapshot(snap=>{
          if(snap.empty){
            box.innerHTML = 'Brak głosów';
            return;
          }
          let html = '<ul>';
          snap.forEach(d=>{
            const v = d.data();
            html += `<li><b>${escapeHtml(v.displayName||'—')}</b> — ${escapeHtml(v.choice)}</li>`;
          });
          html += '</ul>';
          box.innerHTML = html;
        }, err=>{
          box.innerHTML = 'Błąd: ' + err.message;
        });

      liveListeners[id] = unsub;
    };
  });
}

// simple sanitizer for innerHTML insertion
function escapeHtml(str){
  return (str+'').replace(/[&<>'"]/g, function(tag) {
    const charsToReplace = {'&':'&amp;','<':'&lt;','>':'&gt;',"'" :'&#39;','"':'&quot;'};
    return charsToReplace[tag] || tag;
  });
}
