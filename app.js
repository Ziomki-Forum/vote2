// app.js - klient głosujący (compat SDK)
if (typeof firebase === 'undefined') {
  document.getElementById('status').textContent = 'Błąd ładowania Firebase SDK.';
}

// <-- WSTAW_FIREBASE_CONFIG_TUTAJ -->
// Przykład:
const firebaseConfig = {
  apiKey: "AIzaSyDrH70P_t7GEpfaFPISF9PmZu4TwhtmOTI",
  authDomain: "vote2-6e553.firebaseapp.com",
  projectId: "vote2-6e553",
  storageBucket: "vote2-6e553.firebasestorage.app",
  messagingSenderId: "426318102620",
  appId: "1:426318102620:web:e4b39f2f5f87dc34fd6699"
},

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

// 1) Zaloguj anonimowo
auth.signInAnonymously().catch(err=>{
  statusEl.textContent = 'Błąd anon. logowania: ' + err.message;
});

auth.onAuthStateChanged(async user=>{
  if(!user) return;
  uid = user.uid;
  statusEl.textContent = 'Połączono (anon.)';
  await loadActiveVoting();
});

// 2) Załaduj aktywne głosowanie (tylko 1)
async function loadActiveVoting(){
  const snap = await db.collection('votings').where('status','==','active').limit(1).get();
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

  // Jeśli status jest 'active' pokaż możliwość głosowania
  if(activeVotingData.status === 'active'){
    votingBox.style.display = 'block';
    closedBox.style.display = 'none';
    attachVoteButtons();
    checkIfAlreadyVoted();
  } else {
    // status closed -> pokaż wyniki
    votingBox.style.display = 'none';
    closedBox.style.display = 'block';
    showResults();
  }
}

// 3) Przyciski głosowania
function attachVoteButtons(){
  btnFor.onclick = ()=>submitVote('for');
  btnAgainst.onclick = ()=>submitVote('against');
  btnAbstain.onclick = ()=>submitVote('abstain');
}

// 4) Submit vote — zapis dokumentu o id = uid w subkolekcji votings/{votingId}/votes/{uid}
async function submitVote(choice){
  if(!uid || !activeVotingId) return;
  const name = (displayNameInput.value || '').trim();

  const ref = db.collection('votings').doc(activeVotingId).collection('votes').doc(uid);
  try{
    // używamy create-like behavior: set, ale Firestore rules zabronią update jeśli już istnieje
    await ref.set({
      choice,
      displayName: name,
      ts: new Date().toISOString()
    });
    voteResult.textContent = 'Głos oddany. Dziękujemy.';
    // zablokuj przyciski lokalnie
    btnFor.disabled = btnAgainst.disabled = btnAbstain.disabled = true;
  }catch(e){
    voteResult.textContent = 'Nie można oddać głosu: ' + (e.message || e);
  }
}

// 5) Sprawdź czy już głosował (client-side) i zablokuj UI
async function checkIfAlreadyVoted(){
  const ref = db.collection('votings').doc(activeVotingId).collection('votes').doc(uid);
  const doc = await ref.get();
  if(doc.exists){
    voteResult.textContent = 'Oddałeś już głos.';
    btnFor.disabled = btnAgainst.disabled = btnAbstain.disabled = true;
    // opcjonalnie pokaż co oddano
  }
}

// 6) Wyświetl wyniki po zamknięciu
async function showResults(){
  if(!activeVotingId) return;
  const snap = await db.collection('votings').doc(activeVotingId).collection('votes').get();

  let counts = { for:0, against:0, abstain:0 };
  const recent = [];
  snap.forEach(d=>{
    const v = d.data();
    if(v.choice === 'for') counts.for++;
    else if(v.choice === 'against') counts.against++;
    else if(v.choice === 'abstain') counts.abstain++;
    recent.push(v);
  });

  const total = counts.for + counts.against + counts.abstain;
  countsDiv.innerHTML = `
    ZA: ${counts.for}<br>
    PRZECIW: ${counts.against}<br>
    WSTRZYMAŁO SIĘ: ${counts.abstain}<br>
    Łącznie: ${total}
  `;
  percentagesDiv.textContent = total ? `ZA: ${Math.round(counts.for/total*100)}% — PRZECIW: ${Math.round(counts.against/total*100)}% — WSTRZYMAŁO SIĘ: ${Math.round(counts.abstain/total*100)}%` : '';

  recent.sort((a,b)=> (b.ts||'').localeCompare(a.ts||''));
  recentDiv.innerHTML = recent.slice(0,20).map(v => `${v.displayName||'—'} — ${v.choice} — ${v.ts ? new Date(v.ts).toLocaleString() : ''}`).join('<br>');
}

