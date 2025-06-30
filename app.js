const firebaseConfig = {
  apiKey: "AIzaSyCTngInADgWVe4gu5y-CndjmlWQDJ2Ax1M",
  authDomain: "jobchangemanagement.firebaseapp.com",
  projectId: "jobchangemanagement",
  storageBucket: "jobchangemanagement.firebasestorage.app",
  messagingSenderId: "849575949330",
  appId: "1:849575949330:web:76e2619bb205da04bc94cb",
  measurementId: "G-T89C8PTBTS"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let companies = [];
let statusMaster = [];

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const openRegisterBtn = document.getElementById("open-register-btn");
const openStatusMasterBtn = document.getElementById("open-status-master-btn");
const cardsContainer = document.getElementById("cards-container");
const registerModal = document.getElementById("register-modal");
const registerForm = document.getElementById("register-form");
const detailModal = document.getElementById("detail-modal");
const statusMasterModal = document.getElementById("status-master-modal");
const statusListUl = document.getElementById("status-list");
const addStatusForm = document.getElementById("add-status-form");
const newStatusInput = document.getElementById("new-status");
const filterSelect = document.getElementById("filter-status");

auth.onAuthStateChanged(user => {
  currentUser = user;
  if (user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    openRegisterBtn.style.display = "inline-block";
    openStatusMasterBtn.style.display = "inline-block";
    loadStatusMaster();
    loadCompanies();
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    openRegisterBtn.style.display = "none";
    openStatusMasterBtn.style.display = "none";
    cardsContainer.innerHTML = "";
  }
});

loginBtn.onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
logoutBtn.onclick = () => auth.signOut();
openRegisterBtn.onclick = () => { registerForm.reset(); registerModal.style.display = "flex"; };
registerModal.querySelector(".close-btn").onclick = () => registerModal.style.display = "none";
detailModal.querySelector(".close-btn").onclick = () => detailModal.style.display = "none";
statusMasterModal.querySelector(".close-btn").onclick = () => statusMasterModal.style.display = "none";

window.onclick = e => {
  if (e.target === registerModal) registerModal.style.display = "none";
  if (e.target === detailModal) detailModal.style.display = "none";
  if (e.target === statusMasterModal) statusMasterModal.style.display = "none";
};

openStatusMasterBtn.onclick = () => {
  statusMasterModal.style.display = "flex";
  renderStatusList();
};

addStatusForm.onsubmit = e => {
  e.preventDefault();
  const name = newStatusInput.value.trim();
  if (name && !statusMaster.find(s => s.name === name)) {
    db.collection("statusMaster").add({ name });
    newStatusInput.value = "";
  }
};

function loadStatusMaster() {
  db.collection("statusMaster").onSnapshot(snapshot => {
    statusMaster = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    updateStatusDropdowns();
  });
}

function updateStatusDropdowns() {
  const sel = registerForm.selectionStatus;
  sel.innerHTML = '<option value="">選択してください</option>';
  filterSelect.innerHTML = '<option value="">🏷️ 全て</option>';
  statusMaster.forEach(s => {
    sel.innerHTML += `<option value="${s.name}">${s.name}</option>`;
    filterSelect.innerHTML += `<option value="${s.name}">${s.name}</option>`;
  });
}

function renderStatusList() {
  statusListUl.innerHTML = "";
  statusMaster.forEach(s => {
    const li = document.createElement("li");
    li.textContent = s.name;
    const btn = document.createElement("button");
    btn.textContent = "削除";
    btn.onclick = () => db.collection("statusMaster").doc(s.id).delete();
    li.appendChild(btn);
    statusListUl.appendChild(li);
  });
}

registerForm.onsubmit = e => {
  e.preventDefault();
  const data = new FormData(registerForm);
  const payload = {
    companyName: data.get("companyName"),
    location: data.get("location"),
    offeredAnnualSalary: data.get("offeredAnnualSalary"),
    salaryRangeMin: data.get("salaryRangeMin"),
    salaryRangeMax: data.get("salaryRangeMax"),
    position: data.get("position"),
    languages: data.get("languages").split(",").map(l => l.trim()),
    jobDescription: data.get("jobDescription"),
    remotePolicy: data.get("remotePolicy"),
    flexPolicy: data.get("flexPolicy"),
    selectionStatus: data.get("selectionStatus"),
    nextSelectionDate: data.get("nextSelectionDate") ? firebase.firestore.Timestamp.fromDate(new Date(data.get("nextSelectionDate"))) : null,
    userId: currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  db.collection("companies").add(payload).then(() => {
    registerModal.style.display = "none";
  });
};

function loadCompanies() {
  db.collection("companies")
    .where("userId", "==", currentUser.uid)
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot => {
      companies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderCards();
    });
}

filterSelect.onchange = renderCards;

function renderCards() {
  cardsContainer.innerHTML = "";
  const filtered = filterSelect.value ? companies.filter(c => c.selectionStatus === filterSelect.value) : companies;
  filtered.forEach((c, i) => {
    const card = document.createElement("div");
    const statusClass = c.selectionStatus ? `status-${c.selectionStatus}` : "";
    card.className = `card ${statusClass}`;
    const date = c.nextSelectionDate?.toDate().toLocaleDateString() || "-";
    card.innerHTML = `
      <h3>${i + 1}. ${c.companyName}</h3>
      <p><strong>年収:</strong> ${c.offeredAnnualSalary || "-"}</p>
      <p><strong>選考:</strong> ${c.selectionStatus || "-"}</p>
      <p><strong>次回:</strong> ${date}</p>`;
    card.onclick = () => showDetails(c);
    cardsContainer.appendChild(card);
  });
}

function showDetails(c) {
  const modal = detailModal.querySelector(".detail-content");
  const date = c.nextSelectionDate?.toDate().toLocaleDateString() || "-";
  modal.innerHTML = `
    <h3>${c.companyName}</h3>
    <p><strong>勤務地:</strong> ${c.location || "-"}</p>
    <p><strong>提示年収:</strong> ${c.offeredAnnualSalary || "-"}</p>
    <p><strong>給与範囲:</strong> ${c.salaryRangeMin || "-"} ~ ${c.salaryRangeMax || "-"}</p>
    <p><strong>ポジション:</strong> ${c.position || "-"}</p>
    <p><strong>言語:</strong> ${(c.languages || []).join(", ")}</p>
    <p><strong>業務内容:</strong> ${c.jobDescription || "-"}</p>
    <p><strong>リモート制度:</strong> ${c.remotePolicy || "-"}</p>
    <p><strong>フレックス制度:</strong> ${c.flexPolicy || "-"}</p>
    <p><strong>選考状況:</strong> ${c.selectionStatus || "-"}</p>
    <p><strong>次回選考日:</strong> ${date}</p>`;
  detailModal.style.display = "flex";
}
