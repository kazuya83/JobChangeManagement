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

// UI要素
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const openRegisterBtn = document.getElementById("open-register-btn");
const registerModal = document.getElementById("register-modal");
const detailModal = document.getElementById("detail-modal");
const cardsContainer = document.getElementById("cards-container");
const registerForm = document.getElementById("register-form");

// ログイン状態変更検知
auth.onAuthStateChanged(user => {
  currentUser = user;
  if(user){
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    openRegisterBtn.style.display = "inline-block";
    loadCompaniesRealtime();
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    openRegisterBtn.style.display = "none";
    companies = [];
    renderCards();
  }
});

// ログイン・ログアウト処理
loginBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
};
logoutBtn.onclick = () => auth.signOut();

// 登録モーダル開閉
openRegisterBtn.onclick = () => {
  registerForm.reset();
  registerModal.style.display = "block";
};
registerModal.querySelector(".close-btn").onclick = () => {
  registerModal.style.display = "none";
};
detailModal.querySelector(".close-btn").onclick = () => {
  detailModal.style.display = "none";
};

// モーダル外クリックで閉じる
window.onclick = (event) => {
  if(event.target === registerModal) registerModal.style.display = "none";
  if(event.target === detailModal) detailModal.style.display = "none";
};

// Firestoreから企業一覧をリアルタイム取得
function loadCompaniesRealtime(){
  if(!currentUser) return;
  db.collection("companies")
    .where("userId", "==", currentUser.uid)
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot => {
      companies = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
      renderCards();
    }, error => {
      console.error("企業データ取得失敗:", error);
    });
}

// 企業カード描画
function renderCards(){
  cardsContainer.innerHTML = "";
  if(companies.length === 0){
    cardsContainer.innerHTML = "<p>登録された企業情報がありません。</p>";
    return;
  }
  companies.forEach((c, idx) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div><strong>No:</strong> ${idx + 1}</div>
      <div><strong>企業名:</strong> ${c.companyName || "-"}</div>
      <div><strong>提示年収:</strong> ${c.offeredAnnualSalary || "-"}</div>
      <div><strong>選考状況:</strong> ${c.selectionStatus || "-"}</div>
      <div><strong>次回選考日:</strong> ${c.nextSelectionDate ? new Date(c.nextSelectionDate.seconds * 1000).toLocaleDateString() : "-"}</div>
    `;
    card.onclick = () => openDetailModal(c);
    cardsContainer.appendChild(card);
  });
}

// 詳細モーダル表示
function openDetailModal(company){
  const detailDiv = detailModal.querySelector(".detail-content");
  detailDiv.innerHTML = `
    <h3>${company.companyName}</h3>
    <p><strong>勤務地:</strong> ${company.location || "-"}</p>
    <p><strong>提示年収:</strong> ${company.offeredAnnualSalary || "-"}</p>
    <p><strong>給与レンジ:</strong> ${company.salaryRangeMin || "-"} 〜 ${company.salaryRangeMax || "-"}</p>
    <p><strong>ポジション:</strong> ${company.position || "-"}</p>
    <p><strong>言語:</strong> ${(company.languages || []).join(", ")}</p>
    <p><strong>業務内容:</strong> ${company.jobDescription || "-"}</p>
    <p><strong>リモート制度:</strong> ${company.remotePolicy || "-"}</p>
    <p><strong>フレックス制度:</strong> ${company.flexPolicy || "-"}</p>
    <p><strong>選考状況:</strong> ${company.selectionStatus || "-"}</p>
    <p><strong>次回選考日:</strong> ${company.nextSelectionDate ? new Date(company.nextSelectionDate.seconds * 1000).toLocaleDateString() : "-"}</p>
  `;
  detailModal.style.display = "block";
}

// 登録フォーム送信処理
registerForm.onsubmit = e => {
  e.preventDefault();
  if(!currentUser) {
    alert("ログインしてください");
    return;
  }
  const formData = new FormData(registerForm);
  // 言語はカンマ区切りを配列に変換
  const langsRaw = formData.get("languages") || "";
  const langsArr = langsRaw.split(",").map(s => s.trim()).filter(s => s.length > 0);

  // 次回選考日は日付文字列をFirestore Timestampに変換
  const nextSelDateStr = formData.get("nextSelectionDate");
  const nextSelDate = nextSelDateStr ? firebase.firestore.Timestamp.fromDate(new Date(nextSelDateStr)) : null;

  db.collection("companies").add({
    companyName: formData.get("companyName"),
    location: formData.get("location"),
    offeredAnnualSalary: formData.get("offeredAnnualSalary"),
    salaryRangeMin: formData.get("salaryRangeMin"),
    salaryRangeMax: formData.get("salaryRangeMax"),
    position: formData.get("position"),
    languages: langsArr,
    jobDescription: formData.get("jobDescription"),
    remotePolicy: formData.get("remotePolicy"),
    flexPolicy: formData.get("flexPolicy"),
    selectionStatus: formData.get("selectionStatus"),
    nextSelectionDate: nextSelDate,
    userId: currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    alert("登録成功しました！");
    registerModal.style.display = "none";
    registerForm.reset();
  }).catch(err => {
    alert("登録失敗: " + err.message);
  });
};
