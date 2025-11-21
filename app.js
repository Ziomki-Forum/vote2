// app.js

const firebaseConfig = {
  apiKey: "AIzaSyDrH70P_t7GEpfaFPISF9PmZu4TwhtmOTI",
  authDomain: "vote2-6e553.firebaseapp.com",
  projectId: "vote2-6e553",
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

const statusEl = document.getElementById('status');
const idScreen = document.getElementById("id-screen");
const idInput = document.getElementById("id-input");
const idBtn = document.getElementById("id-btn");
const votingsListDiv = document.getElementById("votings-list");

const votingBox = document.getElementById('voting-box');
const closedBox = document.getElementById('closed-box');
const votingTitle = document.getElementById('voting-title');
const votingDesc = document.getElementById('voting-desc');
const btnFor = document.getElementById('btn-for');
const btnAgainst = document.getElementById('btn-against');
const btnAbstain = document.getElementById('btn-abstain');
const voteResult = document.getElementById('vote-result');
const countsDiv = document.getElementById('counts');
const percentagesDiv = document.getElementById('percentages');
const recentDiv = document.getElementById('recent');

let uid = null;
let displayName = null;
let activeVotingId = null;
let activeVotingData = null;

// logowanie anonimowe
auth.signInAnonymously().catch(err => {
  statusEl.textContent = "Błąd logowania: " + err.message;
});

auth.onAuthStateChanged(async user => {
  if (!user) return;
  uid = user.uid;

  displayName = localStorage.getItem("displayName");

  if (!displayName) {
    idScreen.style.display = "block";
    votingsListDiv.style.display = "none";
    votingBox.style.display = "none";
    closedBox.style.display = "none";
    return;
  }

  loadVotingsList();
});

// kliknięcie "Dalej" na ekranie identyfikatora
idBtn.onclick = () => {
  const name = idInput.value.trim();
  if (!name) return alert("Podaj identyfikator.");

  displayName = name;
  localStorage.setItem("displayName", name);

  idScreen.style.display = "none";
  loadVotingsList();
};

// ładowanie listy głosowań
async function loadVotingsList() {
  statusEl.textContent = "Ładowanie listy spraw…";
  try {
    const snap = await db.collection("votings").orderBy("created", "desc").get();
    votingsListDiv.innerHTML = '';
    votingsListDiv.style.display = "block";

    snap.forEach(doc => {
      const d = doc.data();
      const id = doc.id;
      const div = document.createElement("div");
      div.className = "box";
      div.innerHTML = `
        <b>${d.title}</b><br>
        <small>${d.description || ''}</small><br>
        Status: <b>${d.status}</b><br>
        <button data-id="${id}" class="btn-enter">Wejdź</button>
      `;
      votingsListDiv.appendChild(div);
    });

    document.querySelectorAll(".btn-enter").forEach(b => {
      b.onclick = e => {
        const id = e.currentTarget.dataset.id;
        selectVoting(id);
      };
    });

    statusEl.textContent = "Wybierz głosowanie";
  } catch (e) {
    console.error(e);
    statusEl.textContent = "Błąd ładowania listy głosowań.";
  }
}

// wybranie głosowania
async function selectVoting(id) {
  votingsListDiv.style.display = "none";
  votingBox.style.display = "block";
  closedBox.style.display = "none";
  statusEl.textContent = "Ładowanie głosowania…";

  try {
    const doc = await db.collection("votings").doc(id).get();
    if (!doc.exists) {
      statusEl.textContent = "Nie znaleziono głosowania.";
      return;
    }
    activeVotingId = doc.id;
    activeVotingData = doc.data();

    votingTitle.textContent = activeVotingData.title;
    votingDesc.textContent = activeVotingData.description;

    if (activeVotingData.status === "voting") {
      attachVoteButtons();
      checkIfAlreadyVoted();
      statusEl.textContent = "Oddaj swój głos.";
    } else if (activeVotingData.status === "closed") {
      votingBox.style.display = "none";
      closedBox.style.display = "block";
      showResults();
      statusEl.textContent = "Głosowanie zakończone.";
    } else {
      statusEl.textContent = "Głosowanie jeszcze się nie rozpoczęło.";
      votingBox.style.display = "none";
    }

  } catch (e) {
    console.error(e);
    statusEl.textContent = "Błąd przy ładowaniu głosowania.";
  }
}

// przyciski głosowania
function attachVoteButtons() {
  btnFor.onclick = () => submitVote("ZA");
  btnAgainst.onclick = () => submitVote("PRZECIW");
  btnAbstain.onclick = () => submitVote("WSTRZYMANIE");
}

async function submitVote(choice) {
  if (activeVotingData.status !== "voting") {
    voteResult.textContent = "Głosowanie zakończone.";
    return;
  }

  const ref = db.collection("votings").doc(activeVotingId).collection("votes").doc(uid);

  try {
    await ref.set({
      choice,
      displayName,
      ts: new Date().toISOString()
    });
    voteResult.textContent = "Głos oddany.";
    disableButtons();
  } catch (e) {
    voteResult.textContent = "Błąd: " + e.message;
  }
}

function disableButtons() {
  btnFor.disabled = true;
  btnAgainst.disabled = true;
  btnAbstain.disabled = true;
}

async function checkIfAlreadyVoted() {
  const ref = db.collection("votings").doc(activeVotingId).collection("votes").doc(uid);
  const doc = await ref.get();
  if (doc.exists) {
    voteResult.textContent = "Głos oddany: " + doc.data().choice;
    disableButtons();
  }
}

async function showResults() {
  const snap = await db.collection("votings").doc(activeVotingId).collection("votes").get();
  let counts = { ZA: 0, PRZECIW: 0, WSTRZYMANIE: 0 };
  let list = [];
  snap.forEach(doc => {
    const v = doc.data();
    counts[v.choice]++;
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
    `ZA: ${Math.round(counts.ZA / total * 100)}% — PRZECIW: ${Math.round(counts.PRZECIW / total * 100)}% — WSTRZYMANIE: ${Math.round(counts.WSTRZYMANIE / total * 100)}%`
    : "";

  list.sort((a, b) => (b.ts || "").localeCompare(a.ts || ""));
  recentDiv.innerHTML = list.map(v => `${v.displayName} — <b>${v.choice}</b>`).join("<br>");
}
