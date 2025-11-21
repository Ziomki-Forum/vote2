// app.js
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

let voterId = localStorage.getItem("voter-id");
if (!voterId) {
  voterId = "voter-" + Math.random().toString(36).substring(2, 12);
  localStorage.setItem("voter-id", voterId);
}

// active voting state
let activeVotingId = null;
let activeVotingData = null;

statusEl.textContent = 'Łączenie z bazą…';
loadActiveVoting();

async function loadActiveVoting(){
  // Prefer 'voting' status. If none, show most recent 'closed'. If none, show 'draft' or none.
  let snap = await db.collection('votings').where('status','==','voting').orderBy('created','desc').limit(1).get();
  if(!snap.empty){
    const doc = snap.docs[0];
    setupActiveVoting(doc);
    return;
  }

  snap = await db.collection('votings').where('status','==','closed').orderBy('created','desc').limit(1).get();
  if(!snap.empty){
    const doc = snap.docs[0];
    setupActiveVoting(doc);
    return;
  }

  snap = await db.collection('votings').where('status','==','draft').orderBy('created','desc').limit(1).get();
  if(!snap.empty){
    const doc = snap.docs[0];
    setupActiveVoting(doc);
    return;
  }

  statusEl.textContent = 'Brak aktywnego głosowania.';
  votingBox.style.display = 'none';
  closedBox.style.display = 'none';
  activeVotingId = null;
  activeVotingData = null;
}

function setupActiveVoting(doc){
  activeVotingId = doc.id;
  activeVotingData = doc.data();

  votingTitle.textContent = activeVotingData.title;
  votingDesc.textContent = activeVotingData.description || '';

  if(activeVotingData.status === 'draft'){
    statusEl.textContent = "Głosowanie jeszcze się nie rozpoczęło.";
    votingBox.style.display = 'none';
    closedBox.style.display = 'none';
    return;
  }

  if(activeVotingData.status === 'voting'){
    statusEl.textContent = "Głosowanie trwa.";
    votingBox.style.display = 'block';
    closedBox.style.display = 'none';
    attachVoteButtons();
    checkIfAlreadyVoted();
    return;
  }

  if(activeVotingData.status === 'closed'){
    statusEl.textContent = "Głosowanie zakończone — wyniki:";
    votingBox.style.display = 'none';
    closedBox.style.display = 'block';
    showResults();
    return;
  }
}

function attachVoteButtons(){
  btnFor.disabled = false;
  btnAgainst.disabled = false;
  btnAbstain.disabled = false;
  voteResult.textContent = '';
  btnFor.onclick = ()=>submitVote('ZA');
  btnAgainst.onclick = ()=>submitVote('PRZECIW');
  btnAbstain.onclick = ()=>submitVote('WSTRZYMANIE');
}

async function submitVote(choice){
  if(!activeVotingData || activeVotingData.status !== 'voting'){
    voteResult.textContent = 'Głosowanie niedostępne.';
    return;
  }

  const name = (displayNameInput.value || '').trim();
  if(!name){
    voteResult.textContent = 'Podaj imię.';
    return;
  }

  const ref = db.collection('votings').doc(activeVotingId).collection('votes').doc(voterId);

  try{
    // Attempt to create document with id == voterId. If already exists, Firestore will overwrite unless we use create() vs set().
    // To be safe with rules, use set() — the rules check that request.resource.id == voterId and existence.
    await ref.set({
      voterId,
      choice,
      displayName: name,
      ts: new Date().toISOString()
    });

    voteResult.textContent = 'Głos oddany.';
    btnFor.disabled = true;
    btnAgainst.disabled = true;
    btnAbstain.disabled = true;
  }catch(e){
    voteResult.textContent = 'Nie można oddać głosu: ' + e.message;
  }
}

async function checkIfAlreadyVoted(){
  if(!activeVotingId) return;
  const ref = db.collection('votings').doc(activeVotingId).collection('votes').doc(voterId);
  const doc = await ref.get();
  if(doc.exists){
    const v = doc.data();
    voteResult.innerHTML = 'Głos oddany: <b>' + escapeHtml(v.choice) + '</b>';
    btnFor.disabled = true;
    btnAgainst.disabled = true;
    btnAbstain.disabled = true;
  } else {
    voteResult.textContent = '';
  }
}

async function showResults(){
  if(!activeVotingId) return;
  const snap = await db.collection('votings').doc(activeVotingId).collection('votes').get();

  let counts = { ZA:0, PRZECIW:0, WSTRZYMANIE:0 };
  let list = [];

  snap.forEach(doc=>{
    const v = doc.data();
    if (v.choice && counts.hasOwnProperty(v.choice)) counts[v.choice]++;
    list.push(v);
  });

  const total = counts.ZA + counts.PRZECIW + counts.WSTRZYMANIE;

  countsDiv.innerHTML = `
    ZA: ${counts.ZA}<br>
    PRZECIW: ${counts.PRZECIW}<br>
    WSTRZYMANIE: ${counts.WSTRZYMANIE}<br>
    Łącznie: ${total}
  `;

  percentagesDiv.textContent = total ? 
    `ZA: ${Math.round(counts.ZA/total*100)}% — PRZECIW: ${Math.round(counts.PRZECIW/total*100)}% — WSTRZYMANIE: ${Math.round(counts.WSTRZYMANIE/total*100)}%`
    : '';

  // sort by ts desc
  list.sort((a,b)=> (b.ts||'').localeCompare(a.ts||''));
  recentDiv.innerHTML = list.map(v=>escapeHtml((v.displayName||'—') + ' — ' + v.choice)).join('<br>');
}

// helper
function escapeHtml(str){
  return (str+'').replace(/[&<>'"]/g, function(tag) {
    const charsToReplace = {'&':'&amp;','<':'&lt;','>':'&gt;',"'" :'&#39;','"':'&quot;'};
    return charsToReplace[tag] || tag;
  });
}
