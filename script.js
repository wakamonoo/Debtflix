/* ------- Shortcuts from firebaseConfig.js ------- */
const {
  auth, provider, signInWithPopup, signInWithRedirect,
  getRedirectResult, onAuthStateChanged, signOut,
  db, collection, addDoc, getDocs, query, where,
  storage, ref, uploadBytes, getDownloadURL
} = window.firebaseApp;

/* ------- DOM elements ------- */
const loginBtn      = document.getElementById("loginBtn");
const addBtn        = document.querySelector(".add");
const modal         = document.getElementById("addModal");
const closeModalBtn = document.querySelector(".closeModal");
const addFriendBtn  = document.getElementById("addFriendBtn");
const friendListDiv = document.getElementById("friendList");

/* ------- Google login / logout ------- */
async function doLogin() {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    if (err.code === "auth/popup-blocked") {
      await signInWithRedirect(auth, provider);
    } else {
      console.error(err);
      alert("Login failed");
    }
  }
}

loginBtn.addEventListener("click", async () => {
  if (auth.currentUser) {
    await signOut(auth);
  } else {
    await doLogin();
  }
});

onAuthStateChanged(auth, async (user) => {
  loginBtn.textContent = user ? user.displayName.split(" ")[0] : "Login";
  if (user) await loadFriends(); // Load friends on login
});

getRedirectResult(auth).catch((err) => {
  if (err.code !== "auth/no-auth-event") console.error(err);
});

/* ------- Modal open / close ------- */
addBtn.addEventListener("click", () => modal.classList.remove("hidden"));
closeModalBtn.addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.add("hidden");
});

/* ------- Add Friend ------- */
addFriendBtn.addEventListener("click", async () => {
  if (!auth.currentUser) {
    alert("Please log in first.");
    return;
  }

  const name = document.getElementById("friendName").value.trim();
  const debt = parseFloat(document.getElementById("debtAmount").value) || 0;
  const paid = parseFloat(document.getElementById("amountPaid").value) || 0;
  const file = document.getElementById("friendImage").files[0];

  if (!name) {
    alert("Friend name is required"); return;
  }

  let imageUrl = "";
  if (file) {
    const imgRef   = ref(storage, `friends/${Date.now()}-${file.name}`);
    const snap     = await uploadBytes(imgRef, file);
    imageUrl       = await getDownloadURL(snap.ref);
  }

  await addDoc(collection(db, "friends"), {
    uid: auth.currentUser.uid,
    name, debt, paid, image: imageUrl,
    timestamp: Date.now()
  });

  alert("Friend added!");
  modal.classList.add("hidden");
  await loadFriends(); // Refresh list
});

/* ------- Load Friends ------- */
async function loadFriends() {
  if (!auth.currentUser) return;

  const q = query(collection(db, "friends"), where("uid", "==", auth.currentUser.uid));
  const snapshot = await getDocs(q);

  friendListDiv.innerHTML = "";

  if (snapshot.empty) {
    friendListDiv.innerHTML = `<p class="text-gray-400">No friends added yet.</p>`;
    return;
  }

  snapshot.forEach((doc) => {
    const data = doc.data();
    const { name, debt, paid, image } = data;
    const remaining = (debt - paid).toFixed(2);

    const card = document.createElement("div");
    card.className = "flex items-center space-x-4 bg-zinc-700 p-4 rounded mb-4 shadow-md";

    card.innerHTML = `
      ${image ? `<img src="${image}" alt="${name}" class="w-16 h-16 rounded-full object-cover">` : `
      <div class="w-16 h-16 bg-zinc-600 rounded-full flex items-center justify-center text-white text-xl font-bold">${name[0]}</div>`}
      <div class="flex-1">
        <h3 class="text-lg font-semibold">${name}</h3>
        <p class="text-sm text-gray-300">Debt: ₱${debt.toFixed(2)}</p>
        <p class="text-sm text-gray-300">Paid: ₱${paid.toFixed(2)}</p>
        <p class="text-sm text-red-400 font-medium">Owes: ₱${remaining}</p>
      </div>
    `;

    friendListDiv.appendChild(card);
  });
}
