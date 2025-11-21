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
    statusEl.textContent = "Podaj swój identyfikator";
    return;
  }

  idScreen.style.display = "none";
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
  votingBox.style.display = "b
