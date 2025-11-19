if (typeof firebase === 'undefined') {
  document.getElementById('status').textContent = 'Błąd ładowania Firebase SDK.';
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

const statusEl = document.getElementById('status');
const votingBox = document.getElementById('voting-box');
const closedBox = document.getElementById('closed-box');

const votingTitle = document.getElementById('voting-title');
const votingDesc = document.getElementById('voting-desc');

const displayNameInput = document.getElementById('display-name');
const btnFor = document.getElementById('btn-for');
const btnAgainst = document.getElementById('btn-against');
const btnAbstain = document.getElementById('btn-abstain');
const voteResult = document.getElementById('vote-result');

const countsDiv = document.getElementById('counts');
const percentagesDiv = document.getElementById('percentages');
const recentDiv = document.getElementById('recent');

let uid = null;
let activeVotingId = null;
let activeVotingData = null;

auth.signInAnonymously().catch(err=>{
  statusEl.textContent = 'Błąd anon. logowania: ' + err.message;
});

auth.onAuthStateChanged(async user=>{
  if(!user) return;
  uid = user.uid;
  statusEl.textContent = 'Połączono (anon.)';
  await loadActiveVoting();
});

async function loadActiveVoting(){
  const snap = await db.collection('votings').where('status','==','voting').limit(1).get();
  if(snap.empty){
    statusEl.textContent = 'Brak aktywnego głosowania.';
    votingBox.style.display = 'none';
    closedBox.style.display = 'none';
    return;
  }
  const doc = snap.docs[0];
  activeVotingId = doc.id;
  activeVotingData = doc.data();

  votingTitle.textContent = activeVotingData.title || 'Bez tytułu';
  votingDesc.textContent = activeVotingData.description || '';

  votingBox.style.display = 'block';
  closedBox.style.display = 'none';
  attachVoteButtons();
  checkIfAlreadyVoted();
}

function attachVoteButtons(){
  btnFor.onclick = ()=>submitVote('ZA');
  btnAgainst.onclick = ()=>submitVote('PRZECIW');
  btnAbstain.onclick = ()=>submitVote('WSTRZYMANIE');
}

async function submitVote(choice){
  if(!uid || !activeVotingId) return;
  const name = (displayNameInput.value || '').trim();

  const ref = db.collection('votings').doc(activeVotingId).collection('votes').doc(uid);
  try{
    await ref.set({
      choice,
      displayName: name,
      ts: new Date().toISOString()
    });
    voteResult.textContent = 'Głos oddany. Dziękujemy.';
    btnFor.disabled = btnAgainst.disabled = btnAbstain.disabled = true;
  }catch(e){
    voteResult.textContent = 'Nie można oddać głosu: ' + (e.message || e);
  }
}

async function checkIfAlreadyVoted(){
  const ref = db.collection('votings').doc(activeVotingId).collection('votes').doc(uid);
  const doc = await ref.get();
  if(doc.exists){
    voteResult.textContent = 'Oddałeś już głos.';
    btnFor.disabled = btnAgainst.disabled = btnAbstain.disabled = true;
  }
}

async function showResults(){
  if(!activeVotingId) return;
  const snap = await db.collection('votings').doc(activeVotingId).collection('votes').get();

  let counts = { ZA:0, PRZECIW:0, WSTRZYMANIE:0 };
  snap.forEach(d=>{
    const v = d.data();
    if(v.choice === 'ZA') counts.ZA++;
    else if(v.choice === 'PRZECIW') counts.PRZECIW++;
    else if(v.choice === 'WSTRZYMANIE') counts.WSTRZYMANIE++;
  });

  const total = counts.ZA + counts.PRZECIW + counts.WSTRZYMANIE;
  countsDiv.innerHTML = `
    ZA: ${counts.ZA}<br>
    PRZECIW: ${counts.PRZECIW}<br>
    WSTRZYMAŁO SIĘ: ${counts.WSTRZYMANIE}<br>
    Łącznie: ${total}
  `;
  percentagesDiv.textContent = total ? 
    `ZA: ${Math.round(counts.ZA/total*100)}% — PRZECIW: ${Math.round(counts.PRZECIW/total*100)}% — WSTRZYMAŁO SIĘ: ${Math.round(counts.WSTRZYMANIE/total*100)}%` : '';

  // Usuń listę szczegółowych głosów
  recentDiv.innerHTML = '';
}
