import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCTngInADgWVe4gu5y-CndjmlWQDJ2Ax1M",
  authDomain: "jobchangemanagement.firebaseapp.com",
  projectId: "jobchangemanagement",
  storageBucket: "jobchangemanagement.firebasestorage.app",
  messagingSenderId: "849575949330",
  appId: "1:849575949330:web:76e2619bb205da04bc94cb",
  measurementId: "G-T89C8PTBTS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const taskInput = document.getElementById("taskInput");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskList = document.getElementById("taskList");

// ログイン処理
loginBtn.onclick = () => {
  signInWithPopup(auth, provider)
    .catch(e => console.error("Googleログイン失敗:", e));
};

// ログアウト処理
logoutBtn.onclick = () => {
  signOut(auth);
};

// ログイン状態の変化を監視
onAuthStateChanged(auth, user => {
  if (user) {
    // ログイン成功 → タスク処理開始
    const uid = user.uid;
    const tasksRef = collection(db, `users/${uid}/tasks`);

    // タスク追加
    async function addTask() {
      const text = taskInput.value.trim();
      if (!text) return;
      try {
        await addDoc(tasksRef, { text, done: false });
        taskInput.value = "";
      } catch (e) {
        console.error("タスク追加失敗:", e);
      }
    }

    // タスク表示
    onSnapshot(tasksRef, snapshot => {
      taskList.innerHTML = "";
      snapshot.forEach(docSnap => {
        const li = document.createElement("li");
        li.textContent = docSnap.data().text;
        li.onclick = () => deleteDoc(doc(db, `users/${uid}/tasks/${docSnap.id}`));
        taskList.appendChild(li);
      });
    });

    addTaskBtn.onclick = addTask;

    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    // ログアウト状態
    taskList.innerHTML = "";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
});
