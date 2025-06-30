const loadingOverlay = document.getElementById("loading");

function showLoading() {
  loadingOverlay.classList.remove("hidden");
}

function hideLoading() {
  loadingOverlay.classList.add("hidden");
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 初期化時ローディング表示
showLoading();

sleep(1000); 

// Firebase初期化
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
let filteredCompanies = [];
let statusMaster = [];

let currentEditingCompanyId = null;
let currentDetailCompany = null;

// DOM Elements
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");
const userNameSpan = document.getElementById("user-name");

const openRegisterBtn = document.getElementById("open-register-btn");
const registerModal = document.getElementById("register-modal");
const registerForm = document.getElementById("register-form");
const registerCancelBtn = document.getElementById("register-cancel-btn");

const detailModal = document.getElementById("detail-modal");
const detailContent = document.getElementById("detail-content");
const detailCloseBtn = document.getElementById("detail-close-btn");
const detailEditBtn = document.getElementById("detail-edit-btn");

const statusMasterModal = document.getElementById("status-master-modal");
const statusMasterList = document.getElementById("status-master-list");
const statusMasterNameInput = document.getElementById("status-master-name");
const statusMasterColorInput = document.getElementById("status-master-color");
const statusMasterAddBtn = document.getElementById("status-master-add-btn");
const statusMasterCloseBtn = document.getElementById("status-master-cancel-btn");
// const openStatusMasterBtn = document.getElementById("open-status-master-btn");

const filterStatusSelect = document.getElementById("filter-status-select");
const companyList = document.getElementById("company-list");
const overlay = document.getElementById("overlay");
const overlayLoginBtn = document.getElementById("overlay-login-btn");

// --- Authentication ---

async function signInWithGoogle() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
    hideLoading();
  } catch (e) {
    alert("ログイン失敗: " + e.message);
  }
}

function signOut() {
  auth.signOut();
}

// --- UI Update ---

function setUIForUser(user) {
  if (user) {
    currentUser = user;
    userNameSpan.textContent = user.displayName || user.email;
    userInfo.classList.remove("hidden");
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    overlay.classList.add("hidden");
    loadStatusMaster();
    loadCompanies();
  } else {
    currentUser = null;
    userInfo.classList.add("hidden");
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    overlay.classList.remove("hidden");
    companies = [];
    filteredCompanies = [];
    statusMaster = [];
    renderCompanyList();
    clearStatusMasterSelect();
    renderStatusMasterList();
  }
}

// --- 選考状況マスタ操作 ---

async function loadStatusMaster() {
  if (!currentUser) return;
  const colRef = db.collection("users").doc(currentUser.uid).collection("statusMaster");
  try {
    const snapshot = await colRef.get();
    statusMaster = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (statusMaster.length === 0) {
      // 初期マスタ
      statusMaster = [
        { id: "default-1", name: "未選考", color: "#9e9e9e" },
        { id: "default-2", name: "書類選考中", color: "#42a5f5" },
        { id: "default-3", name: "面接中", color: "#ffa726" },
        { id: "default-4", name: "内定", color: "#66bb6a" },
        { id: "default-5", name: "辞退", color: "#ef5350" }
      ];
      // 既定のマスタをDBに登録しない仕様にしています。
    }
    renderStatusMasterSelect();
    renderStatusMasterList();
    updateRegisterStatusOptions();
  } catch (e) {
    console.error("選考状況マスタ取得失敗:", e);
  }
}

async function addStatusMaster(name, color) {
  if (!currentUser) return;
  try {
    const colRef = db.collection("users").doc(currentUser.uid).collection("statusMaster");
    await colRef.add({ name, color });
    await loadStatusMaster();
  } catch (e) {
    alert("選考状況追加失敗: " + e.message);
  }
}

async function deleteStatusMaster(id) {
  if (!currentUser) return;
  try {
    const docRef = db.collection("users").doc(currentUser.uid).collection("statusMaster").doc(id);
    await docRef.delete();
    await loadStatusMaster();
  } catch (e) {
    alert("選考状況削除失敗: " + e.message);
  }
}

function renderStatusMasterSelect() {
  filterStatusSelect.innerHTML = `<option value="">すべての選考状況</option>`;
  statusMaster.forEach(s => {
    filterStatusSelect.innerHTML += `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`;
  });
}

function clearStatusMasterSelect() {
  filterStatusSelect.innerHTML = `<option value="">すべての選考状況</option>`;
}

function renderStatusMasterList() {
  statusMasterList.innerHTML = "";
  statusMaster.forEach(s => {
    if (s.id.startsWith("default-")) return; // デフォルトは削除不可
    const li = document.createElement("li");
    li.style.backgroundColor = s.color;
    li.textContent = s.name;
    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.onclick = () => {
      if (confirm(`「${s.name}」を削除しますか？\n※この選考状況が登録された企業には影響しません。`)) {
        deleteStatusMaster(s.id);
      }
    };
    li.appendChild(delBtn);
    statusMasterList.appendChild(li);
  });
}

function updateRegisterStatusOptions() {
  const select = registerForm.selectionStatus;
  select.innerHTML = "";
  statusMaster.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.name;
    opt.textContent = s.name;
    select.appendChild(opt);
  });
}

// --- 企業データ操作 ---

async function loadCompanies() {
  if (!currentUser) return;
  const colRef = db.collection("users").doc(currentUser.uid).collection("companies").orderBy("nextSelectionDate");
  try {
    const snapshot = await colRef.get();
    companies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    applyFilterAndRender();
  } catch (e) {
    console.error("企業データ取得失敗:", e);
    alert("企業データ取得に失敗しました。");
  }
}

function applyFilterAndRender() {
  const filterVal = filterStatusSelect.value;
  if (filterVal) {
    filteredCompanies = companies.filter(c => c.selectionStatus === filterVal);
  } else {
    filteredCompanies = companies.slice();
  }
  renderCompanyList();
}

function renderCompanyList() {
  companyList.innerHTML = "";
  if (filteredCompanies.length === 0) {
    companyList.innerHTML = `<p>登録された企業がありません。</p>`;
    return;
  }
  filteredCompanies.forEach((c, i) => {
    const color = getStatusColor(c.selectionStatus) || "#888";
    const card = document.createElement("div");
    card.className = "company-card";
    card.style.borderLeft = `6px solid ${color}`;
    card.innerHTML = `
      <div class="no">No: ${i + 1}</div>
      <div class="company-name">${escapeHtml(c.name)}</div>
      <div>提示年収: ${escapeHtml(c.salary)}</div>
      <div>選考状況: ${escapeHtml(c.selectionStatus)}</div>
      <div>次回選考日: ${escapeHtml(c.nextSelectionDate)}</div>
      <button class="copy-btn">コピー</button>
      <button class="delete-btn" id="${c.id}">削除</button>
    `;
    companyList.appendChild(card);

    card.onclick = (e) => {
      if (e.target.classList.contains("copy-btn")) {
        e.stopPropagation();
        openCopyModal(c);
      } else if (e.target.classList.contains("delete-btn")) {
        e.stopPropagation();
        deleteCompany(e.target.id);
      } else {
        openDetailModal(c);
      }
    };
  });
}

function getStatusColor(statusName) {
  const s = statusMaster.find(st => st.name === statusName);
  return s ? s.color : null;
}

// --- モーダル制御 ---

function openModal(modal) {
  modal.classList.remove("hidden");
}

function closeModal(modal) {
  modal.classList.add("hidden");
}

function resetRegisterForm() {
  registerForm.reset();
  currentEditingCompanyId = null;
}

function openRegisterModal(company) {
  resetRegisterForm();
  currentEditingCompanyId = null;

  if (company) {
    // 編集またはコピー
    registerForm.name.value = company.name || "";
    registerForm.location.value = company.location || "";
    registerForm.salary.value = company.salary || "";
    registerForm.range_min.value = company.range_min || "";
    registerForm.range_max.value = company.range_max || "";
    registerForm.position.value = company.position || "";
    registerForm.languages.value = (company.languages || []).join(", ");
    registerForm.jobDescription.value = company.jobDescription || "";
    registerForm.remotePolicy.value = company.remotePolicy || "";
    registerForm.flexPolicy.value = company.flexPolicy || "";
    registerForm.selectionStatus.value = company.selectionStatus || (statusMaster[0]?.name || "");
    registerForm.nextSelectionDate.value = company.nextSelectionDate || "";
    currentEditingCompanyId = company.id || null;
  } else {
    registerForm.selectionStatus.value = statusMaster[0]?.name || "";
  }
  openModal(registerModal);
}

function closeRegisterModal() {
  closeModal(registerModal);
}

function openDetailModal(company) {
  currentDetailCompany = company;
  detailContent.innerHTML = `
    <p><strong>企業名:</strong> ${escapeHtml(company.name)}</p>
    <p><strong>勤務地:</strong> ${escapeHtml(company.location)}</p>
    <p><strong>提示年収:</strong> ${escapeHtml(company.salary)}</p>
    <p><strong>給与range_min:</strong> ${escapeHtml(company.range_min)}</p>
    <p><strong>給与range_max:</strong> ${escapeHtml(company.range_max)}</p>
    <p><strong>ポジション:</strong> ${escapeHtml(company.position)}</p>
    <p><strong>言語:</strong> ${escapeHtml((company.languages || []).join(", "))}</p>
    <p><strong>業務内容:</strong> <br/>${escapeHtml(company.jobDescription).replace(/\n/g, "<br>")}</p>
    <p><strong>リモート制度:</strong> ${escapeHtml(company.remotePolicy)}</p>
    <p><strong>フレックス制度:</strong> ${escapeHtml(company.flexPolicy)}</p>
    <p><strong>選考状況:</strong> ${escapeHtml(company.selectionStatus)}</p>
    <p><strong>次回選考日:</strong> ${escapeHtml(company.nextSelectionDate)}</p>
  `;
  openModal(detailModal);
}

function closeDetailModal() {
  closeModal(detailModal);
}

function openCopyModal(company) {
  openRegisterModal(company);
  currentEditingCompanyId = null; // コピーは新規登録扱い
}

function openStatusMasterModal() {
  openModal(statusMasterModal);
}

function closeStatusMasterModal() {
  closeModal(statusMasterModal);
}

// --- イベントリスナー ---

loginBtn.onclick = () => signInWithGoogle();
overlayLoginBtn.onclick = () => signInWithGoogle();
logoutBtn.onclick = () => signOut();

filterStatusSelect.onchange = () => applyFilterAndRender();

openRegisterBtn.onclick = () => {
  if (!currentUser) {
    alert("ログインしてください。");
    return;
  }
  openRegisterModal();
};

// openStatusMasterBtn.onclick = () => {
//   if (!currentUser) {
//     alert("ログインしてください。");
//     return;
//   }
//   openStatusMasterModal();
// };

registerCancelBtn.onclick = () => closeRegisterModal();

detailCloseBtn.onclick = () => closeDetailModal();

detailEditBtn.onclick = () => {
  if (currentDetailCompany) {
    openRegisterModal(currentDetailCompany);
    closeDetailModal();
  }
};

statusMasterCloseBtn.onclick = () => closeStatusMasterModal();

statusMasterAddBtn.onclick = () => {
  const name = statusMasterNameInput.value.trim();
  const color = statusMasterColorInput.value;
  if (!name) {
    alert("選考状況名を入力してください。");
    return;
  }
  addStatusMaster(name, color);
  statusMasterNameInput.value = "";
};

// 企業登録フォーム送信
registerForm.onsubmit = async (e) => {
  e.preventDefault();
  if (!currentUser) {
    alert("ログインしてください。");
    return;
  }
  const data = {
    name: registerForm.name.value.trim(),
    location: registerForm.location.value.trim(),
    salary: registerForm.salary.value.trim(),
    range_min: registerForm.range_min.value.trim(),
    range_max: registerForm.range_max.value.trim(),
    position: registerForm.position.value.trim(),
    languages: registerForm.languages.value.trim().split(",").map(s => s.trim()).filter(Boolean),
    jobDescription: registerForm.jobDescription.value.trim(),
    remotePolicy: registerForm.remotePolicy.value.trim(),
    flexPolicy: registerForm.flexPolicy.value.trim(),
    selectionStatus: registerForm.selectionStatus.value,
    nextSelectionDate: registerForm.nextSelectionDate.value,
  };
  try {
    const colRef = db.collection("users").doc(currentUser.uid).collection("companies");
    if (currentEditingCompanyId) {
      await colRef.doc(currentEditingCompanyId).update(data);
    } else {
      await colRef.add(data);
    }
    await loadCompanies();
    closeRegisterModal();
  } catch (e) {
    alert("登録に失敗しました: " + e.message);
  }
};

// ユーティリティ関数
function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[m]);
}

// --- 初期化 ---

auth.onAuthStateChanged(user => {
  hideLoading();
  setUIForUser(user);
});

async function deleteCompany(companyId) {
  if (!currentUser || !companyId) return;
  const confirmed = confirm("この企業データを削除しますか？");
  if (!confirmed) return;

  try {
    await db.collection("users")
            .doc(currentUser.uid)
            .collection("companies")
            .doc(companyId)
            .delete();
    await loadCompanies();  // 一覧再読み込み
    closeDetailModal();     // モーダルを閉じる
  } catch (e) {
    alert("削除に失敗しました: " + e.message);
  }
}

async function deleteCompany(companyId) {
  if (!currentUser || !companyId) return;
  const confirmed = confirm("この企業データを削除しますか？");
  if (!confirmed) return;

  try {
    await db.collection("users")
            .doc(currentUser.uid)
            .collection("companies")
            .doc(companyId)
            .delete();
    await loadCompanies();  // 一覧再読み込み
    closeDetailModal();     // モーダルを閉じる
  } catch (e) {
    alert("削除に失敗しました: " + e.message);
  }
}