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

// --- DOM Elements ---
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");

const openRegisterBtn = document.getElementById("open-register-btn");
const registerModal = document.getElementById("register-modal");
const registerForm = document.getElementById("register-form");
const registerStatusSelect = registerForm.selectionStatus;

const cardsContainer = document.getElementById("cards-container");
const filterSelect = document.getElementById("filter-select");

const detailModal = document.getElementById("detail-modal");
const detailForm = document.getElementById("detail-form");
const detailTitle = document.getElementById("detail-title");
const detailStatusSelect = detailForm.selectionStatus;
const editBtn = document.getElementById("edit-btn");
const saveBtn = document.getElementById("save-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");

const openStatusMasterBtn = document.getElementById("open-status-master-btn");
const statusMasterModal = document.getElementById("status-master-modal");
const statusListUl = document.getElementById("status-list");
const addStatusForm = document.getElementById("add-status-form");
const newStatusInput = document.getElementById("new-status");
const newStatusColorInput = document.getElementById("new-status-color");

// --- State ---
let currentUser = null;
let companies = [];
let statusMaster = [];
let currentEditingCompanyId = null;

// --- Auth ---
loginBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(console.error);
};

logoutBtn.onclick = () => {
  auth.signOut().catch(console.error);
};

auth.onAuthStateChanged(user => {
  currentUser = user;
  if (user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    loadStatusMaster();
    loadCompanies();
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    companies = [];
    statusMaster = [];
    renderCards();
    renderFilterOptions();
    renderStatusList();
  }
});

// --- Firestore読み込み ---
function loadCompanies() {
  if (!currentUser) return;
  db.collection("companies")
    .where("uid", "==", currentUser.uid)
    .orderBy("nextSelectionDate", "asc")
    .onSnapshot(snapshot => {
      companies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderCards();
    }, err => {
      console.error("企業データ取得失敗:", err);
    });
}

function loadStatusMaster() {
  if (!currentUser) return;
  db.collection("statusMaster")
    .where("uid", "==", currentUser.uid)
    .onSnapshot(snapshot => {
      statusMaster = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderStatusList();
      renderFilterOptions();
      fillStatusSelects();
    }, err => {
      console.error("選考状況取得失敗:", err);
    });
}

// --- モーダル制御 ---
function openModal(modal) {
  modal.style.display = "flex";
}
function closeModal(modal) {
  modal.style.display = "none";
}

document.querySelectorAll(".modal .close-btn").forEach(btn => {
  btn.onclick = e => {
    closeModal(e.target.closest(".modal"));
    resetDetailForm();
    resetRegisterForm();
  };
});

// --- 企業登録 ---
openRegisterBtn.onclick = () => {
  if (statusMaster.length === 0) {
    alert("まず選考状況マスタを登録してください。");
    openModal(statusMasterModal);
    return;
  }
  fillStatusSelects();
  resetRegisterForm();
  openModal(registerModal);
};

registerForm.onsubmit = e => {
  e.preventDefault();
  if (!currentUser) return alert("ログインしてください");
  const data = new FormData(registerForm);
  const payload = {
    uid: currentUser.uid,
    companyName: data.get("companyName").trim(),
    location: data.get("location").trim(),
    offeredAnnualSalary: data.get("offeredAnnualSalary").trim(),
    salaryRangeMin: data.get("salaryRangeMin").trim(),
    salaryRangeMax: data.get("salaryRangeMax").trim(),
    position: data.get("position").trim(),
    languages: data.get("languages").split(",").map(s => s.trim()).filter(s => s),
    jobDescription: data.get("jobDescription").trim(),
    remotePolicy: data.get("remotePolicy").trim(),
    flexPolicy: data.get("flexPolicy").trim(),
    selectionStatus: data.get("selectionStatus"),
    nextSelectionDate: data.get("nextSelectionDate") ? firebase.firestore.Timestamp.fromDate(new Date(data.get("nextSelectionDate"))) : null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  db.collection("companies").add(payload)
    .then(() => {
      closeModal(registerModal);
      resetRegisterForm();
    })
    .catch(console.error);
};

// --- 企業カード表示 ---
function renderCards() {
  cardsContainer.innerHTML = "";
  let filtered = companies;
  if (filterSelect.value) {
    filtered = companies.filter(c => c.selectionStatus === filterSelect.value);
  }
  filtered.forEach((c, i) => {
    const card = document.createElement("div");
    card.className = "card";
    const statusObj = statusMaster.find(s => s.name === c.selectionStatus);
    if (statusObj?.color) card.style.backgroundColor = statusObj.color;

    card.innerHTML = `
      <h3>${i + 1}. ${c.companyName}</h3>
      <p><strong>提示年収:</strong> ${c.offeredAnnualSalary || "-"}</p>
      <p><strong>選考状況:</strong> ${c.selectionStatus || "-"}</p>
      <p><strong>次回選考日:</strong> ${c.nextSelectionDate ? c.nextSelectionDate.toDate().toLocaleDateString() : "-"}</p>
    `;
    card.onclick = () => openDetailModal(c);
    cardsContainer.appendChild(card);
  });
}

// --- 選考状況絞り込み ---
filterSelect.onchange = () => {
  renderCards();
};

function renderFilterOptions() {
  const selected = filterSelect.value || "";
  filterSelect.innerHTML = '<option value="">🏷️ 全て</option>';
  statusMaster.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.name;
    opt.textContent = s.name;
    if (s.name === selected) opt.selected = true;
    filterSelect.appendChild(opt);
  });
}

// --- ステータスマスタリスト表示 ---
function renderStatusList() {
  statusListUl.innerHTML = "";
  statusMaster.forEach(s => {
    const li = document.createElement("li");
    li.style.backgroundColor = s.color || "#eee";
    li.textContent = s.name;
    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.onclick = () => {
      if(confirm(`「${s.name}」を削除しますか？\n※ この選考状況を使用している企業の選考状況は空になります。`)) {
        db.collection("companies").where("uid", "==", currentUser.uid).where("selectionStatus", "==", s.name).get()
          .then(snapshot => {
            const batch = db.batch();
            snapshot.forEach(doc => {
              batch.update(doc.ref, { selectionStatus: "" });
            });
            batch.delete(db.collection("statusMaster").doc(s.id));
            return batch.commit();
          })
          .catch(console.error);
      }
    };
    li.appendChild(delBtn);
    statusListUl.appendChild(li);
  });
}

// --- ステータスマスタ追加 ---
addStatusForm.onsubmit = e => {
  e.preventDefault();
  const name = newStatusInput.value.trim();
  const color = newStatusColorInput.value;
  if (!name) return alert("選考状況名を入力してください");
  if (statusMaster.some(s => s.name === name)) {
    return alert("同じ名前の選考状況がすでに存在します");
  }
  db.collection("statusMaster").add({
    uid: currentUser.uid,
    name,
    color
  }).then(() => {
    newStatusInput.value = "";
    newStatusColorInput.value = "#eeeeee";
  }).catch(console.error);
};

// --- 詳細モーダル --- 
function openDetailModal(company) {
  currentEditingCompanyId = company.id;
  detailTitle.textContent = company.companyName;

  // 各フォームにセット
  detailForm.location.value = company.location || "";
  detailForm.offeredAnnualSalary.value = company.offeredAnnualSalary || "";
  detailForm.salaryRangeMin.value = company.salaryRangeMin || "";
  detailForm.salaryRangeMax.value = company.salaryRangeMax || "";
  detailForm.position.value = company.position || "";
  detailForm.languages.value = (company.languages || []).join(", ");
  detailForm.jobDescription.value = company.jobDescription || "";
  detailForm.remotePolicy.value = company.remotePolicy || "";
  detailForm.flexPolicy.value = company.flexPolicy || "";
  detailForm.selectionStatus.value = company.selectionStatus || "";
  detailForm.nextSelectionDate.value = company.nextSelectionDate ? company.nextSelectionDate.toDate().toISOString().substr(0, 10) : "";

  // 編集不可で表示
  Array.from(detailForm.elements).forEach(el => {
    if (el.tagName !== "BUTTON") el.disabled = true;
  });
  editBtn.style.display = "inline-block";
  saveBtn.style.display = "none";
  cancelEditBtn.style.display = "none";

  openModal(detailModal);
}

editBtn.onclick = () => {
  // 編集モード
  Array.from(detailForm.elements).forEach(el => {
    if (el.tagName !== "BUTTON") el.disabled = false;
  });
  editBtn.style.display = "none";
  saveBtn.style.display = "inline-block";
  cancelEditBtn.style.display = "inline-block";
};

cancelEditBtn.onclick = () => {
  // 編集キャンセル＝再表示
  if (!currentEditingCompanyId) return;
  const company = companies.find(c => c.id === currentEditingCompanyId);
  if (company) openDetailModal(company);
};

detailForm.onsubmit = e => {
  e.preventDefault();
  if (!currentEditingCompanyId) return;
  const data = new FormData(detailForm);
  const payload = {
    location: data.get("location").trim(),
    offeredAnnualSalary: data.get("offeredAnnualSalary").trim(),
    salaryRangeMin: data.get("salaryRangeMin").trim(),
    salaryRangeMax: data.get("salaryRangeMax").trim(),
    position: data.get("position").trim(),
    languages: data.get("languages").split(",").map(s => s.trim()).filter(s => s),
    jobDescription: data.get("jobDescription").trim(),
    remotePolicy: data.get("remotePolicy").trim(),
    flexPolicy: data.get("flexPolicy").trim(),
    selectionStatus: data.get("selectionStatus"),
    nextSelectionDate: data.get("nextSelectionDate") ? firebase.firestore.Timestamp.fromDate(new Date(data.get("nextSelectionDate"))) : null,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  db.collection("companies").doc(currentEditingCompanyId).update(payload)
    .then(() => {
      closeModal(detailModal);
      currentEditingCompanyId = null;
    })
    .catch(console.error);
};

// --- 選考状況選択肢を全フォームに反映 ---
function fillStatusSelects() {
  [registerStatusSelect, detailStatusSelect].forEach(sel => {
    const selectedVal = sel.value;
    sel.innerHTML = '<option value="">選択してください</option>';
    statusMaster.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.name;
      opt.textContent = s.name;
      if (s.name === selectedVal) opt.selected = true;
      sel.appendChild(opt);
    });
  });
}

// --- フォームリセット ---
function resetRegisterForm() {
  registerForm.reset();
}
function resetDetailForm() {
  detailForm.reset();
  currentEditingCompanyId = null;
}
