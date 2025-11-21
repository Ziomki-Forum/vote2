// 🔥 KONFIG FIREBASE – WLEJ TU SWÓJ firebaseConfig!!!
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

let adminUID = "2eTMMGiJA0VqCrGCHSMRQhnHvIq2"; // Twój admin

// --- LOGIN ---
function loginAdmin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider);
}

firebase.auth().onAuthStateChanged(user => {
    if (!user) return;

    document.getElementById("adminStatus").innerText =
        "Zalogowano jako: " + user.email;

    if (user.uid !== adminUID) {
        alert("Nie jesteś administratorem!");
        return;
    }

    loadVotings();
});

// --- TWORZENIE GŁOSOWANIA ---
document.getElementById("newVotingForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;

    await db.collection("votings").add({
        title,
        description,
        status: "draft",
        created: Date.now()
    });

    alert("Sprawa utworzona");
    loadVotings();
});

// --- LISTA ---
async function loadVotings() {
    const snap = await db.collection("votings").orderBy("created", "desc").get();
    const list = document.getElementById("votingsList");
    list.innerHTML = "";

    snap.forEach(doc => {
        const d = doc.data();

        let li = document.createElement("li");
        li.innerHTML = `
            <b>${d.title}</b> — ${d.status}<br>
            <button onclick="startVoting('${doc.id}')">▶ Start</button>
            <button onclick="closeVoting('${doc.id}')">⛔ Stop</button>
            <button onclick="preview('${doc.id}')">👁 Podgląd</button>
        `;

        list.appendChild(li);
    });
}

// --- START ---
async function startVoting(id) {
    await db.collection("votings").doc(id).update({
        status: "voting"
    });
    alert("Głosowanie rozpoczęte");
}

// --- STOP ---
async function closeVoting(id) {
    await db.collection("votings").doc(id).update({
        status: "closed"
    });
    alert("Zamknięto");
}

// --- PODGLĄD LIVE ---
let unsub = null;

async function preview(id) {
    if (unsub) unsub();

    let box = document.getElementById("livePreview");
    box.innerHTML = "Ładowanie...";

    unsub = db.collection("votings").doc(id).collection("votes")
        .onSnapshot(snap => {
            let yes = 0, no = 0;

            snap.forEach(d => {
                if (d.data().vote === "yes") yes++;
                else no++;
            });

            box.innerHTML = `TAK: ${yes} — NIE: ${no}`;
        });
}
