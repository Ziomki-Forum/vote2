// app.js — kompatybilny (compat)
const firebaseConfig = {
  apiKey: "AIzaSyDrH70P_t7GEpfaFPISF9PmZu4TwhtmOTI",
  authDomain: "vote2-6e553.firebaseapp.com",
  projectId: "vote2-6e553"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const identBox = document.getElementById("ident-box");
const voteBox = document.getElementById("vote-box");
const resultsBox = document.getElementById("results-box");

const btnIdent = document.getElementById("btn-ident");
const voterNameInput = document.getElementById("voter-name");

const voteTitle = document.getElementById("vote-title");
const voteDesc = document.getElementById("vote-desc");
const statusMsg = document.getElementById("status-msg");

const resultsContent = document.getElementById("results-content");

// ----------------------------------------------------------
// KROK 1: IDENTYFIKATOR
// ----------------------------------------------------------
btnIdent.onclick = () => {
  const name = voterNameInput.value.trim();
  if (!name) {
    alert("Podaj identyfikator.");
    return;
  }

  localStorage.setItem("voterName", name);

  identBox.style.display = "none";
  loadVotingScreen();
};

// ----------------------------------------------------------
// KROK 2: Załaduj dane głosowania (po wpisaniu identyfikatora)
// ----------------------------------------------------------
async function loadVotingScreen() {
  const snap = await db.collection("votings").get();
  if (snap.empty) {
    voteBox.innerHTML = "<h3>Brak aktywnego głosowania.</h3>";
    voteBox.style.display = "block";
    return;
  }

  const v = snap.docs[0];
  const data = v.data();
  const votingId = v.id;

  voteTitle.textContent = data.title;
  voteDesc.textContent = data.desc;

  // jeśli zamknięte — pokaż wyniki
  if (data.status === "closed") {
    voteBox.style.display = "none";
    showResults(votingId);
    return;
  }

  voteBox.style.display = "block";

  document.getElementById("btn-for").onclick = () => sendVote(votingId, "for");
  document.getElementById("btn-against").onclick = () => sendVote(votingId, "against");
  document.getElementById("btn-abstain").onclick = () => sendVote(votingId, "abstain");
}

// ----------------------------------------------------------
// KROK 3: Wysyłanie głosu
// ----------------------------------------------------------
async function sendVote(votingId, choice) {
  const name = localStorage.getItem("voterName");
  if (!name) {
    alert("Brak identyfikatora!");
    return;
  }

  // nie używamy Firebase Auth — tworzymy UID z nazwy
  const uid = "user_" + name.replace(/[^a-zA-Z0-9]/g, "");

  await db
    .collection("votings")
    .doc(votingId)
    .collection("votes")
    .doc(uid)
    .set({
      choice: choice,
      ts: Date.now(),
      name: name   // widoczne tylko dla admina
    });

  statusMsg.textContent = "Głos zapisano. Dziękujemy!";
}

// ----------------------------------------------------------
// KROK 4: Wyświetlanie wyników (dla użytkowników tylko suma)
// ----------------------------------------------------------
async function showResults(votingId) {
  resultsBox.style.display = "block";

  const snap = await db
    .collection("votings")
    .doc(votingId)
    .collection("votes")
    .get();

  let forC = 0;
  let againstC = 0;
  let abstainC = 0;

  snap.forEach(doc => {
    const d = doc.data();
    if (d.choice === "for") forC++;
    if (d.choice === "against") againstC++;
    if (d.choice === "abstain") abstainC++;
  });

  resultsContent.innerHTML = `
    <p>ZA: <b>${forC}</b></p>
    <p>PRZECIW: <b>${againstC}</b></p>
    <p>WSTRZYMUJĘ SIĘ: <b>${abstainC}</b></p>
  `;
}
