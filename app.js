// Firebase モジュールの読み込み
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyCTngInADgWVe4gu5y-CndjmlWQDJ2Ax1M",
  authDomain: "jobchangemanagement.firebaseapp.com",
  projectId: "jobchangemanagement",
  storageBucket: "jobchangemanagement.firebasestorage.app",
  messagingSenderId: "849575949330",
  appId: "1:849575949330:web:76e2619bb205da04bc94cb",
  measurementId: "G-T89C8PTBTS"
};

// ✅ Firebase 初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const tasksRef = collection(db, "tasks");

// ✅ タスク追加処理
async function addTask() {
  const input = document.getElementById("taskInput");
  const text = input.value.trim();
  if (!text) return;
  await addDoc(tasksRef, { text, done: false });
  input.value = "";
}

// ✅ タスク表示処理
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

// ✅ 初期化処理
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("addTaskBtn").addEventListener("click", addTask);
  renderTasks();
});
