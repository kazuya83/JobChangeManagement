// Firebase SDK の読み込み（モジュール）
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// 🔐 Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyCTngInADgWVe4gu5y-CndjmlWQDJ2Ax1M",
  authDomain: "jobchangemanagement.firebaseapp.com",
  projectId: "jobchangemanagement",
  storageBucket: "jobchangemanagement.firebasestorage.app",
  messagingSenderId: "849575949330",
  appId: "1:849575949330:web:76e2619bb205da04bc94cb",
  measurementId: "G-T89C8PTBTS"
};

// Firebase 初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const tasksRef = collection(db, "tasks");

// 匿名ログイン
signInAnonymously(auth).catch((error) => {
  console.error("匿名ログインに失敗しました:", error);
});

// タスク追加
async function addTask() {
  const input = document.getElementById("taskInput");
  const text = input.value.trim();
  if (!text) return;

  try {
    await addDoc(tasksRef, { text, done: false });
    input.value = "";
  } catch (e) {
    console.error("タスク追加失敗:", e);
  }
}

// タスク表示（リアルタイム反映）
function renderTasks() {
  onSnapshot(tasksRef, snapshot => {
    const list = document.getElementById("taskList");
    list.innerHTML = "";
    snapshot.forEach(docSnap => {
      const li = document.createElement("li");
      li.textContent = docSnap.data().text;
      li.onclick = () => deleteDoc(doc(db, "tasks", docSnap.id));
      list.appendChild(li);
    });
  });
}

// 初期化
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("addTaskBtn").addEventListener("click", addTask);
  renderTasks();
});
