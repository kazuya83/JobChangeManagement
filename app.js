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

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userNameSpan = document.getElementById("user-name");
const openRegisterModalBtn = document.getElementById("open-register-modal-btn");
const openStatusMasterModalBtn = document.getElementById("open-status-master-modal-btn");

const registerModal = document.getElementById("register-modal");
const registerModalClose = document.getElementById("register-modal-close");
const registerForm = document.getElementById("register-form");

const statusMasterModal = document.getElementById("status-master-modal");
const statusMasterModalClose = document.getElementById("status-master-modal-close");
const statusListUl = document.getElementById("status-list");
const addStatusForm = document.getElementById("add-status-form");
const newStatusInput = document.getElementById("new-status");

const detailModal = document.getElementById("detail-modal");
const detailModalClose = document.getElementById("detail-modal-close");
const detailContentDiv = document.getElementById("detail-content");

const statusSelect = document.getElementById("status-select");
const cardsContainer = document.getElementById("cards-container");

let currentUser = null;
let statusMaster = [];
let companies = [];

// --- 認証処理 ---
loginBtn.addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(console.error);
});

logoutBtn.addEventListener("click", () => {
  auth.signOut().catch(console.error);
});

auth.onAuthStateChanged(user => {
  currentUser = user;
  if(user){
    userNameSpan.textContent = user.displayName;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    openRegisterModalBtn.disabled = false;
    openStatusMasterModalBtn.disabled = false;
    loadStatusMaster();
    loadCompanies();
  } else {
    userNameSpan.textContent = "";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    openRegisterModalBtn.disabled = true;
    openStatusMasterModalBtn.disabled = true;
    companies = [];
    statusMaster = [];
    renderCards();
    clearStatusSelect();
  }
});

// --- モーダル開閉 ---
function openModal(modal){
  modal.style.display = "block";
}
function closeModal(modal){
  modal.style.display = "none";
}

// 登録モーダル
openRegisterModalBtn.addEventListener("click", () => {
  registerForm.reset();
  fillStatusSelect();
  openModal(registerModal);
});
registerModalClose.addEventListener("click", () => closeModal(registerModal));

// 選考状況マスタモーダル
openStatusMasterModalBtn.addEventListener("click", () => {
  openModal(statusMasterModal);
  renderStatusList();
});
statusMasterModalClose.addEventListener("click", () => closeModal(statusMasterModal));

// 詳細モーダル
detailModalClose.addEventListener("click", () => closeModal(detailModal));

// --- 選考状況マスタ操作 ---
function loadStatusMaster(){
  if(!currentUser) return;
  db.collection("statusMaster").orderBy("createdAt")
    .onSnapshot(snapshot => {
      statusMaster = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
      fillStatusSelect();
      renderStatusList();
    });
}

function fillStatusSelect(){
  statusSelect.innerHTML = "";
  statusMaster.forEach(st => {
    const opt = document.createElement("option");
    opt.value = st.name;
    opt.textContent = st.name;
    statusSelect.appendChild(opt);
  });
}

function clearStatusSelect(){
  statusSelect.innerHTML = "";
}

// マスタ一覧描画
function renderStatusList(){
  statusListUl.innerHTML = "";
  statusMaster.forEach(st => {
    const li = document.createElement("li");
    li.textContent = st.name;
    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.onclick = async () => {
      if(confirm(`"${st.name}" を削除しますか？`)){
        try {
          await db.collection("statusMaster").doc(st.id).delete();
          // 削除されたら自動更新される
        } catch(e) {
          alert("削除失敗");
        }
      }
    };
    li.appendChild(delBtn);
    statusListUl.appendChild(li);
  });
}

// 追加フォーム
addStatusForm.addEventListener("submit", async e => {
  e.preventDefault();
  const val = newStatusInput.value.trim();
  if(!val) return;
  // 重複チェック
  if(statusMaster.some(s => s.name === val)){
    alert("同じ名前の選考状況が既にあります");
    return;
  }
  try {
    await db.collection("statusMaster").add({
      name: val,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    newStatusInput.value = "";
  } catch(e) {
    alert("追加に失敗しました");
  }
});

// --- 企業情報操作 ---
registerForm.addEventListener("submit", async e => {
  e.preventDefault();
  if(!currentUser) return alert("ログインしてください");

  const formData = new FormData(registerForm);
  const data = {
    company: formData.get("company"),
    location: formData.get("location"),
    annualSalary: formData.get("annualSalary"),
    salaryMin: formData.get("salaryMin"),
    salaryMax: formData.get("salaryMax"),
    position: formData.get("position"),
    languages: formData.get("languages").split(",").map(s => s.trim()).filter(s => s),
    jobDescription: formData.get("jobDescription"),
    remote: formData.get("remote"),
    flex: formData.get("flex"),
    status: formData.get("status"),
    nextSelectionDate: formData.get("nextSelectionDate") || null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    userId: currentUser.uid
  };

  try {
    await db.collection("companies").add(data);
    alert("登録しました");
    closeModal(registerModal);
  } catch(e) {
    alert("登録に失敗しました");
    console.error(e);
  }
});

// Firestore から企業情報を取得してカード描画
function loadCompanies(){
  if(!currentUser) return;
  db.collection("companies")
    .where("userId", "==", currentUser.uid)
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot => {
      companies = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
      renderCards();
    });
}

// カード描画
function renderCards(){
  cardsContainer.innerHTML = "";
  if(companies.length === 0){
    cardsContainer.textContent = "登録された企業はありません";
    return;
  }
  companies.forEach((comp, idx) => {
    const card = document.createElement("div");
    card.classList.add("card");
    card.tabIndex = 0;
    card.innerHTML = `
      <p><strong>No:</strong> ${idx + 1}</p>
      <p><strong>企業名:</strong> ${comp.company}</p>
      <p><strong>提示年収:</strong> ${comp.annualSalary || "-"}</p>
      <p><strong>選考状況:</strong> ${comp.status || "-"}</p>
      <p><strong>次回選考日:</strong> ${comp.nextSelectionDate || "-"}</p>
    `;
    card.addEventListener("click", () => openDetailModal(comp));
    cardsContainer.appendChild(card);
  });
}

// 詳細モーダル表示
function openDetailModal(company){
  detailContentDiv.innerHTML = `
    <p><strong>企業名:</strong> ${company.company}</p>
    <p><strong>勤務地:</strong> ${company.location || "-"}</p>
    <p><strong>提示年収:</strong> ${company.annualSalary || "-"}</p>
    <p><strong>給与range_min:</strong> ${company.salaryMin || "-"}</p>
    <p><strong>給与range_max:</strong> ${company.salaryMax || "-"}</p>
    <p><strong>ポジション:</strong> ${company.position || "-"}</p>
    <p><strong>言語:</strong> ${(company.languages || []).join(", ") || "-"}</p>
    <p><strong>業務内容:</strong> ${company.jobDescription || "-"}</p>
    <p><strong>リモート制度:</strong> ${company.remote || "-"}</p>
    <p><strong>フレックス制度:</strong> ${company.flex || "-"}</p>
    <p><strong>選考状況:</strong> ${company.status || "-"}</p>
    <p><strong>次回選考日:</strong> ${company.nextSelectionDate || "-"}</p>
  `;
  openModal(detailModal);
}

// --- 画面クリックでモーダル閉じる ---
window.onclick = function(event) {
  [registerModal, statusMasterModal, detailModal].forEach(modal => {
    if(event.target === modal){
      closeModal(modal);
    }
  });
};
