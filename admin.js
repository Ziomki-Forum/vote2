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
  const desc = document.getElem
