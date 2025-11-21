// admin.js
const firebaseConfig = {
  apiKey: "AIzaSyDrH70P_t7GEpfaFPISF9PmZu4TwhtmOTI",
  authDomain: "vote2-6e553.firebaseapp.com",
  projectId: "vote2-6e553",
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
  try {
    await auth.signInWithEmailAndPassword(email, pass);
    loginMsg.textContent = 'Zalogowano';
  } catch (e) {
    loginMsg.textContent = 'Błąd logowania: ' + e.message;
  }
};

auth.onAuthStateChanged(user => {
  if (user) {
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
  if (!title) return alert('Podaj tytuł');

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

async function loadVotings() {
  const snap = await db.collection('votings').orderBy('created', 'desc').get();
  votingsList.innerHTML = '';

  snap.forEach(doc => {
    const d = doc.data();
    const id = doc.id;
    const div = document.createElement('div');
    div.className = 'box';

    div.innerHTML = `
      <b>${d.title}</b><br>
      <small class="small">${d.description || ''}</small><br>
      Status: <b>${d.status}</b><br>

      ${d.status === 'draft'
          ? `<button data-id="${id}" class="btn-start">Rozpocznij głosowanie</button>`
          : d.status === 'voting'
            ? `<button data-id="${id}" class="btn-stop">Zakończ głosowanie</button>`
            : ''}

      <button data-id="${id}" class="btn-delete">Usuń</button>
    `;

    votingsList.appendChild(div);
  });

  document.querySelectorAll('.btn-start').forEach(b => {
    b.onclick = async e => {
      const id = e.currentTarget.dataset.id;
      await db.collection('votings').doc(id).update({ status: 'voting' });
      loadVotings();
    };
  });

  document.querySelectorAll('.btn-stop').forEach(b => {
    b.onclick = async e => {
      const id = e.currentTarget.dataset.id;
      await db.collection('votings').doc(id).update({ status: 'closed' });
      loadVotings();
    };
  });

  document.querySelectorAll('.btn-delete').forEach(b => {
    b.onclick = async e => {
      const id = e.currentTarget.dataset.id;
      if (!confirm('Usunąć sprawę?')) return;
      await db.collection('votings').doc(id).delete();
      loadVotings();
    };
  });
}
