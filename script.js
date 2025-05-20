/* ------- Grab exports from firebaseConfig.js ------- */
const {
  auth,
  provider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  db,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
} = window.firebaseApp;

/* ------- DOM ------- */
const loginBtn = document.getElementById("loginBtn");
const addBtn = document.querySelector(".add");
const modal = document.getElementById("addModal");
const closeModalBtn = document.querySelector(".closeModal");
const addFriendBtn = document.getElementById("addFriendBtn");
const friendListDiv = document.getElementById("friendList");

/* ------- Auth flow ------- */
async function doLogin() {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    if (e.code === "auth/popup-blocked")
      await signInWithRedirect(auth, provider);
    else {
      console.error(e);
      alert("Login failed");
    }
  }
}

loginBtn.addEventListener("click", () =>
  auth.currentUser ? signOut(auth) : doLogin()
);

onAuthStateChanged(auth, (user) => {
  loginBtn.textContent = user ? user.displayName.split(" ")[0] : "Login";
  if (user) loadFriends();
});
getRedirectResult(auth).catch((err) => {
  if (err.code !== "auth/no-auth-event") console.error(err);
});

/* ------- Modal ------- */
addBtn.onclick = () => modal.classList.remove("hidden");
closeModalBtn.onclick = () => modal.classList.add("hidden");
modal.onclick = (e) => {
  if (e.target === modal) modal.classList.add("hidden");
};

/* ------- Add friend ------- */
addFriendBtn.onclick = async () => {
  if (!auth.currentUser) return alert("Please log in first.");

  const name = document.getElementById("friendName").value.trim();
  const debt = +document.getElementById("debtAmount").value || 0;
  const paid = +document.getElementById("amountPaid").value || 0;
  const file = document.getElementById("friendImage").files[0];
  if (!name) return alert("Friend name is required.");

  let imageUrl = "";
  if (file) {
    const imgRef = ref(storage, `friends/${Date.now()}-${file.name}`);
    const snap = await uploadBytes(imgRef, file);
    imageUrl = await getDownloadURL(snap.ref);
  }

  await addDoc(collection(db, "friends"), {
    uid: auth.currentUser.uid,
    name,
    debt,
    paid,
    image: imageUrl,
    timestamp: Date.now(),
  });

  modal.classList.add("hidden");
  loadFriends(); // refresh list
};

/* ------- Load & render friends ------- */
async function loadFriends() {
  friendListDiv.innerHTML = "";

  const q = query(
    collection(db, "friends"),
    where("uid", "==", auth.currentUser.uid),
    orderBy("timestamp", "desc")
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    friendListDiv.innerHTML = `<p class="text-gray-400">No friends added yet.</p>`;
    return;
  }

  snap.forEach((doc) => {
    const { name, debt, paid, image } = doc.data();
    const owes = (debt - paid).toFixed(2);

    friendListDiv.insertAdjacentHTML(
      "beforeend",
      `
      <div class="flex items-center space-x-4 bg-zinc-700 p-4 rounded mb-4 shadow-md">
        ${
          image
            ? `<img src="${image}" alt="${name}" class="w-16 h-16 rounded-full object-cover">`
            : `<div class="w-16 h-16 bg-zinc-600 rounded-full flex items-center justify-center text-xl font-bold">${name[0]}</div>`
        }
        <div class="flex-1">
          <h3 class="text-lg font-semibold">${name}</h3>
          <p class="text-sm text-gray-300">Debt: ₱${debt.toFixed(2)}</p>
          <p class="text-sm text-gray-300">Paid: ₱${paid.toFixed(2)}</p>
          <p class="text-sm text-red-400 font-medium">Owes: ₱${owes}</p>
        </div>
      </div>
    `
    );
  });
}
