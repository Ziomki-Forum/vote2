// app.js - poprawiona wersja
// Upewnij się, że firebaseConfig pasuje do Twojego projektu:
const firebaseConfig = {
  apiKey: "AIzaSyDrH70P_t7GEpfaFPISF9PmZu4TwhtmOTI",
  authDomain: "vote2-6e553.firebaseapp.com",
  projectId: "vote2-6e553"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ---------- DOM ----------
const identBox = document.getElementById("ident-box");
const voteBox = document.getElementById("vote-box");
const resultsBox = document.getElementById("results-box");

const voterNameInput = document.getElementById("voter-name");
const btnIdent = document.getElementById("btn-ident");

const voteTitle = document.getElementById("vote-title");
const voteDesc = document.getElementById("vote-desc");

const statusMsg = document.getElementById("status-msg");
const resultsContent = document.getElementById("results-content");

const btnFor = document.getElementById("btn-for");
const btnAgainst = document.getElementById("btn-against");
const btnAbstain = document.getElementById("btn-abstain");

// ---------- STAN ----------
let browserUID = null;
let voterName = null;
let activeVotingId = null;
let activeVotingData = null;

// ---------- Pomocnicze ----------
function getOrCreateBrowserUID() {
  let uid = localStorage.getItem("browserUID");
  if (!uid) {
    uid = "browser_" + Math.random().toString(36).slice(2, 12);
    localStorage.setItem("browserUID", uid);
  }
  return uid;
}
browserUID = getOrCreateBrowserUID();

// Zabezpieczone parsowanie / sprawdzanie
function savedVoterName() {
  const s = localStorage.getItem("voterName");
  return (s && s.trim()) ? s.trim() : null;
}

// ---------- Start: jeśli imię było zapisane -> omijamy ekran ident ----------
document.addEventListener("DOMContentLoaded", () => {
  const saved = savedVoterName();
  if (saved) {
    voterName = saved;
    voterNameInput.value = saved; // na wypadek, gdyby chciał edytować
    identBox.style.display = "none";
    loadVotingScreen();
  } else {
    identBox.style.display = "block";
    voteBox.style.display = "none";
    resultsBox.style.display = "none";
  }
});

// ---------- KLIK: zapisz identyfikator i ładuj ekran głosowania ----------
btnIdent.addEventListener("click", () => {
  const name = (voterNameInput.value || "").trim();
  if (!name) {
    alert("Podaj swój identyfikator / imię.");
    return;
  }
  voterName = name;
  localStorage.setItem("voterName", name);
  identBox.style.display = "none";
  loadVotingScreen();
});

// ---------- Pobierz aktywne głosowanie - najpierw status 'voting', potem 'closed' ----------
async function findVotingDoc() {
  // 1) najpierw aktywne głosowanie
  let snap = await db.collection("votings").where("status", "==", "voting").orderBy("created","desc").limit(1).get();
  if (!snap.empty) return snap.docs[0];
  // 2) jeśli brak aktywnego, pobierz ostatnie zamknięte (aby pokazać wyniki)
  snap = await db.collection("votings").where("status", "==", "closed").orderBy("created","desc").limit(1).get();
  if (!snap.empty) return snap.docs[0];
  // 3) brak niczego
  return null;
}

// ---------- Ładuj ekran głosowania / wyników ----------
async function loadVotingScreen() {
  try {
    const doc = await findVotingDoc();
    if (!doc) {
      voteBox.innerHTML = "<h3>Brak aktywnego głosowania.</h3>";
      voteBox.style.display = "block";
      resultsBox.style.display = "none";
      return;
    }

    activeVotingId = doc.id;
    activeVotingData = doc.data();

    // pokaż tytuł i opis (używamy pola 'title' i 'description' zgodnie z admin.js)
    voteTitle.textContent = activeVotingData.title || "Bez tytułu";
    voteDesc.textContent = activeVotingData.description || "";

    if (activeVotingData.status === "voting") {
      // pokazujemy UI głosowania
      voteBox.style.display = "block";
      resultsBox.style.display = "none";
      statusMsg.textContent = "";
      attachVotingButtons();
      await checkIfAlreadyVoted();
    } else {
      // zamknięte - pokaż wyniki
      voteBox.style.display = "none";
      resultsBox.style.display = "block";
      await showResults(activeVotingId);
    }
  } catch (err) {
    console.error("loadVotingScreen error:", err);
    voteBox.innerHTML = "<p>Błąd przy ładowaniu głosowania. Sprawdź konsolę.</p>";
    voteBox.style.display = "block";
  }
}

// ---------- Podłącz przyciski głosowania ----------
function attachVotingButtons() {
  btnFor.disabled = false;
  btnAgainst.disabled = false;
  btnAbstain.disabled = false;

  btnFor.onclick = () => sendVote("for");
  btnAgainst.onclick = () => sendVote("against");
  btnAbstain.onclick = () => sendVote("abstain");
}

// ---------- Sprawdź, czy ta przeglądarka już głosowała ----------
async function checkIfAlreadyVoted() {
  if (!activeVotingId) return;
  try {
    const ref = db.collection("votings").doc(activeVotingId).collection("votes").doc(browserUID);
    const doc = await ref.get();
    if (doc.exists) {
      const v = doc.data();
      statusMsg.textContent = "Oddałeś już głos: " + (v.choice || "");
      btnFor.disabled = btnAgainst.disabled = btnAbstain.disabled = true;
    }
  } catch (err) {
    console.error("checkIfAlreadyVoted error:", err);
  }
}

// ---------- Wysyłanie głosu (per przeglądarka) ----------
async function sendVote(choice) {
  if (!activeVotingId) {
    alert("Brak aktywnego głosowania.");
    return;
  }

  // blokada po stronie klienta: czy już głosowano
  const voteRef = db.collection("votings").doc(activeVotingId).collection("votes").doc(browserUID);
  try {
    const doc = await voteRef.get();
    if (doc.exists) {
      statusMsg.textContent = "Oddałeś już głos.";
      btnFor.disabled = btnAgainst.disabled = btnAbstain.disabled = true;
      return;
    }

    // Zapisujemy: przeglądarkaUID, displayName i choice
    await voteRef.set({
      browserUID: browserUID,
      displayName: voterName || "",
      choice: choice,
      ts: Date.now()
    });

    statusMsg.textContent = "Głos zapisany. Dziękujemy!";
    btnFor.disabled = btnAgainst.disabled = btnAbstain.disabled = true;
  } catch (err) {
    console.error("sendVote error:", err);
    statusMsg.textContent = "Błąd zapisu głosu: " + (err.message || err);
  }
}

// ---------- Wyświetlanie wyników (tylko sumy dla wszystkich) ----------
async function showResults(votingId) {
  try {
    const snap = await db.collection("votings").doc(votingId).collection("votes").get();
    let counts = { for: 0, against: 0, abstain: 0 };
    snap.forEach(d => {
      const v = d.data();
      if (v.choice === "for") counts.for++;
      else if (v.choice === "against") counts.against++;
      else if (v.choice === "abstain") counts.abstain++;
      else {
        // obsługa przypadków gdzie zapisano inne etykiety (backwards-compat)
        if (typeof v.choice === "string") {
          const c = v.choice.toLowerCase();
          if (c.includes("za") || c === "za" || c === "za") counts.for++;
          else if (c.includes("przeciw") || c === "przeciw") counts.against++;
          else counts.abstain++;
        }
      }
    });

    resultsContent.innerHTML = `
      <p>ZA: <b>${counts.for}</b></p>
      <p>PRZECIW: <b>${counts.against}</b></p>
      <p>WSTRZYMAŁO SIĘ: <b>${counts.abstain}</b></p>
    `;
  } catch (err) {
    console.error("showResults error:", err);
    resultsContent.innerHTML = "<p>Błąd ładowania wyników.</p>";
  }
}
