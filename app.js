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
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(app);
const tasksRef = db.collection("tasks");

// ✅ タスク追加関数
async function addTask() {
  const input = document.getElementById("taskInput");
  const task = input.value.trim();
  if (!task) return;
  await tasksRef.add({ text: task, done: false });
  input.value = "";
}

// ✅ タスク一覧をリアルタイム表示
tasksRef.onSnapshot(snapshot => {
  const list = document.getElementById("taskList");
  list.innerHTML = "";
  snapshot.forEach(doc => {
    const li = document.createElement("li");
    li.textContent = doc.data().text;
    li.onclick = () => doc.ref.delete(); // クリックで削除
    list.appendChild(li);
  });
});
