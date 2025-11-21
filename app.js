// 🔥 WLEJ TU TEN SAM firebaseConfig CO W admin.js !!!
const firebaseConfig = {
    apiKey: "TUTAJ",
    authDomain: "TUTAJ",
    projectId: "TUTAJ",
    storageBucket: "TUTAJ",
    messagingSenderId: "TUTAJ",
    appId: "TUTAJ"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- GENERATOR UNIKALNEGO ID (bez logowania)
function getVoterId() {
    let id = localStorage.getItem("voterId");
    if (!id) {
        id = "voter-" + Math.random().toString(36).substr(2, 9);
        localStorage.setItem("voterId", id);
    }
    return id;
}

let voterId = getVoterId();

// --- ŁADOWANIE GŁOSOWANIA ---
async function loadVoting() {
    const snap = await db.collection("votings")
        .where("status", "in", ["voting", "draft", "closed"])
        .orderBy("created", "desc")
        .limit(1)
        .get();

    if (snap.empty) {
        document.getElementById("votingTitle").innerText = "Brak aktywnego głosowania";
        return;
    }

    const doc = snap.docs[0];
    const d = doc.data();

    document.getElementById("votingTitle").innerText = d.title;
    document.getElementById("votingDesc").innerText = d.description;

    if (d.status !== "voting") {
        document.getElementById("info").innerText = "Głosowanie nieaktywne.";
        return;
    }

    document.getElementById("voteForm").style.display = "block";
}

loadVoting();

// --- WYSYŁANIE GŁOSU ---
async function submitVote(choice) {
    let nick = document.getElementById("nickname").value.trim();
    if (!nick) return alert("Podaj nick");

    await db.collection("votings")
        .where("status", "==", "voting")
        .limit(1)
        .get()
        .then(async snap => {
            if (snap.empty) return alert("Brak aktywnego głosowania");

            let votingId = snap.docs[0].id;

            await db.collection("votings").doc(votingId)
                .collection("votes").doc(voterId).set({
                    nickname: nick,
                    vote: choice,
                    voterId: voterId
                });

            alert("Głos zapisany!");
            document.getElementById("voteForm").style.display = "none";
        });
}
