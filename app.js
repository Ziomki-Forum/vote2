// app.js — nowa poprawiona wersja

const firebaseConfig = {
  apiKey: "AIzaSyDrH70P_t7GEpfaFPISF9PmZu4TwhtmOTI",
  authDomain: "vote2-6e553.firebaseapp.com",
  projectId: "vote2-6e553"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();


// ELEMENTY UI
const identBox = document.getElementById("ident-box");
const voteBox = document.getElementById("vote-box");
const resultsBox = document.getElementById("results-box");

const voterNameInput = document.getElementById("voter-name");
const btnIdent = document.getElementById("btn-ident");

const voteTitle = document.getElementById("vote-title");
const voteDesc = document.getElementById("vote-desc");

const statusMsg = document.getElementById("status-msg");

const resultsContent = document.getElementById("results-content");

let browserUID = null;
let activeVotingId = null;


// ------------------------------------------------------
// 1) GENEROWANIE / ODCZYT IDENTYFIKATORA PRZEGLĄDARKI
// ------------------------------------------------------
function getOrCreateBrowserUID() {
  let uid = localStorage.getItem("browserUID");
  if (!uid) {
    uid = "browser_" + Math.random().toString(36).substring(2, 12);
    localStorage.setItem("browserUID", uid);
  }
  return uid;
}

browserUID = getOrCreateBrowserUID();


// ------------------------------------------------------
// 2) START — jeśli zapisane imię → omijamy ekran
// ------------------------------------------------------
window.onload = () => {
  const savedName = localStorage.getItem("voterName");
  if (savedName && savedName.trim() !== "") {
    identBox.style.display = "none";
    loadVotingScreen();
  }
};


// ------------------------------------------------------
// 3) Użytkownik podaje imię → zapisujemy
// ------------------------------------------------------
btnIdent.onclick = () => {
  const name = voterNameInput.value.trim();
  if (!name) {
    alert("Podaj identyfikator / imię.");
    return;
  }

  localStorage.setItem("voterName", name);
  identBox.style.display = "none";

  loadVotingScreen();
};


// ------------------------------------------------------
// 4) Ładowanie aktywnego głosowania
// ------------------------------------------------------
async function loadVotingScreen() {
  const snap = await db.collection("votings").get();

  if (snap.empty) {
    voteBox.innerHTML = "<h3>Brak aktywnego głosowania.</h3>";
    voteBox.style.display = "block";
    return;
  }

  const v = snap.docs[0];
  activeVotingId = v.id;
  const data = v.data();

  // Wyświetlamy tytuł i opis
  voteTitle.textContent = data.title;
  voteDesc.textContent = data.description;

  if (data.status === "closed") {
    voteBox.style.display = "none";
    showResults(activeVotingId);
    return;
  }

  voteBox.style.display = "block";

  // Podpinamy przyciski głosowania
  document.getElementById("btn-for").onclick = () => sendVote("ZA");
  document.getElementById("btn-against").onclick = () => sendVote("PRZECIW");
  document.getElementById("btn-abstain").onclick = () => sendVote("WSTRZYMANIE");
}


// ------------------------------------------------------
// 5) Oddanie głosu (UID = identyfikator przeglądarki)
// ------------------------------------------------------
async function sendVote(choice) {
  const voterName = localStorage.getItem("voterName");

  const voteRef = db
    .collection("votings")
    .doc(activeVotingId)
    .collection("votes")
    .doc(browserUID);

  const existing = await voteRef.get();
  if (existing.exists) {
    statusMsg.textContent = "Głos już oddany.";
    return;
  }

  await voteRef.set({
    name: voterName,
    choice: choice,
    ts: Date.now()
  });

  statusMsg.textContent = "Głos zapisany. Dziękujemy!";
}


// ------------------------------------------------------
// 6) Wyniki końcowe (po zamknięciu)
// ------------------------------------------------------
async function showResults(id) {
  resultsBox.style.display = "block";

  const snap = await db.collection("votings").doc(id).collection("votes").get();

  let counts = { ZA: 0, PRZECIW: 0, WSTRZYMANIE: 0 };

  snap.forEach(doc => {
    const d = doc.data();
    counts[d.choice]++;
  });

  resultsContent.innerHTML = `
    <p>ZA: <b>${counts.ZA}</b></p>
    <p>PRZECIW: <b>${counts.PRZECIW}</b></p>
    <p>WSTRZYMANIE SIĘ: <b>${counts.WSTRZYMANIE}</b></p>
  `;
}
