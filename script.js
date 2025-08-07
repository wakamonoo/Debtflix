/* ───────── Imgur Client ID ───────── */
const IMGUR_CLIENT_ID = "d5f147f0aaaccff"; 
const IMGUR_API_URL = "https://api.imgur.com/3/image";
const DEFAULT_FRIEND_IMAGE = "images/cat.png";
const DEFAULT_PROFILE_IMAGE = "images/default-profile.png";

/* ───────── Grab Exports from firebaseConfig.js ───────── */
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
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
} = window.firebaseApp;

/* ───────── DomElements ───────── */
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userProfile = document.getElementById("userProfile");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const addBtn = document.querySelector(".add");
const modal = document.getElementById("addModal");
const closeModalBtn = document.querySelector(".closeModal");
const addFriendBtn = document.getElementById("addFriendBtn");
const friendListDiv = document.getElementById("friendList");
const searchBtn = document.querySelector(".search");
const searchInput = document.getElementById("searchInput");
const editModal = document.getElementById("editModal");
const closeEditModalBtn = document.querySelector(".closeEditModal");
const updateFriendBtn = document.getElementById("updateFriendBtn");
const editFriendIdInput = document.getElementById("editFriendId");
const debtChartCanvas = document.getElementById("debtChart");
const debtSummaryDiv = document.getElementById("debtSummary");
let debtChart;
const mostWantedListDiv = document.getElementById("mostWantedList");
const noWantedMsg = document.getElementById("noWantedMsg");
const loaderOverlay = document.getElementById("loaderOverlay");
const friendImageInput = document.getElementById("friendImage");
const previewImage = document.getElementById("previewImage");
const editFriendImageInput = document.getElementById("editFriendImage");
const editFriendImageDisplay = document.getElementById(
  "editFriendImageDisplay"
);
let selectedImageFile = null;
let selectedEditImageFile = null;

/* ───────── Image Upload Handling ───────── */
friendImageInput.addEventListener("change", function (e) {
  if (e.target.files && e.target.files[0]) {
    selectedImageFile = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function (event) {
      previewImage.src = event.target.result;
    };
    reader.readAsDataURL(selectedImageFile);
  }
});

/* ───────── Edit modal upload image ───────── */
editFriendImageInput.addEventListener("change", function (e) {
  if (e.target.files && e.target.files[0]) {
    selectedEditImageFile = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function (event) {
      editFriendImageDisplay.src = event.target.result;
    };
    reader.readAsDataURL(selectedEditImageFile);
  }
});

closeModalBtn.addEventListener("click", () => {
  selectedImageFile = null;
  previewImage.src = DEFAULT_FRIEND_IMAGE;
  friendImageInput.value = "";
});

closeEditModalBtn.addEventListener("click", () => {
  selectedEditImageFile = null;
  editFriendImageInput.value = "";
});

/* ───────── Upload Image to Imgur ───────── */
async function uploadImageToImgur(file) {
  if (!file) return DEFAULT_FRIEND_IMAGE;

  showLoader();

  try {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(IMGUR_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      return data.data.link;
    } else {
      throw new Error(data.data.error || "Imgur upload failed");
    }
  } catch (error) {
    console.error("Imgur upload error:", error);
    Swal.fire({
      icon: "error",
      title: "Image Upload Failed",
      text: "Could not upload image. Using default image instead.",
      background: "#27272a",
      color: "#ffffff",
      iconColor: "#ef4444",
      confirmButtonColor: "#dc2626",
    });
    return DEFAULT_FRIEND_IMAGE;
  } finally {
    hideLoader();
  }
}

/* ───────── Loader ───────── */
function showLoader() {
  loaderOverlay.classList.remove("hidden");
}

function hideLoader() {
  loaderOverlay.classList.add("hidden");
}

/* ───────── Authentication Flow ───────── */
async function doLogin() {
  try {
    showLoader();
    await signInWithPopup(auth, provider);
  } catch (e) {
    if (e.code === "auth/popup-blocked") {
      await signInWithRedirect(auth, provider);
    } else {
      console.error("Login failed:", e);
      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: "Could not log in. Please try again.",
        background: "#27272a",
        color: "#ffffff",
        iconColor: "#ef4444",
        confirmButtonColor: "#dc2626",
      });
    }
  } finally {
    hideLoader();
  }
}

logoutBtn.addEventListener("click", () => {
  Swal.fire({
    title: "Are you sure you want to log out?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#4b5563",
    confirmButtonText: "Yes, logout!",
    background: "#27272a",
    color: "#ffffff",
    iconColor: "#f59e0b",
    customClass: {
      confirmButton: "bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded",
      cancelButton:
        "bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded ml-2",
    },
    buttonsStyling: false,
  }).then(async (result) => {
    if (result.isConfirmed) {
      await signOut(auth);
      Swal.fire({
        icon: "success",
        title: "Logged Out",
        text: "You have been successfully logged out.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        background: "#27272a",
        color: "#ffffff",
        iconColor: "#22c55e",
      });
    }
  });
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    userProfile.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    loginBtn.classList.add("hidden");

    userAvatar.src = user.photoURL || DEFAULT_PROFILE_IMAGE;
    userName.textContent = user.displayName.split(" ")[0];

    loadFriends();
  } else {
    userProfile.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    loginBtn.classList.remove("hidden");

    friendListDiv.innerHTML = `<p class="text-gray-400 text-center mt-8">Please log in to see your Debtflix friends.</p>`;
    renderDebtChart(0, 0);
    renderMostWanted([]);
  }
});

getRedirectResult(auth).catch((err) => {
  if (err.code !== "auth/no-auth-event") {
    console.error("Redirect result error:", err);
  }
});

loginBtn.addEventListener("click", doLogin);

/* ───────── Modal Handling ───────── */
addBtn.onclick = () => modal.classList.remove("hidden");
closeModalBtn.onclick = () => modal.classList.add("hidden");
modal.onclick = (e) => {
  if (e.target === modal) modal.classList.add("hidden");
};

closeEditModalBtn.onclick = () => editModal.classList.add("hidden");
editModal.onclick = (e) => {
  if (e.target === editModal) editModal.classList.add("hidden");
};

/* ───────── Search ───────── */
searchBtn.addEventListener("click", () => {
  const val = searchInput.value.trim();
  loadFriends(val);
});

let debounceTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const val = searchInput.value.trim();
    loadFriends(val);
  }, 300);
});

/* ───────── Add Friend ───────── */
addFriendBtn.onclick = async () => {
  if (!auth.currentUser) {
    Swal.fire({
      icon: "info",
      title: "Login Required",
      text: "Please log in first to add a friend.",
      background: "#27272a",
      color: "#ffffff",
      iconColor: "#3b82f6",
      confirmButtonColor: "#dc2626",
    });
    return;
  }

  const name = document.getElementById("friendName").value.trim();
  const debtPurpose = document.getElementById("debtPurpose").value.trim();
  const debt = +document.getElementById("debtAmount").value || 0;
  const paid = +document.getElementById("amountPaid").value || 0;
  const notes = document.getElementById("notes").value.trim();

  if (!name) {
    Swal.fire({
      icon: "warning",
      title: "Name Required",
      text: "Friend's name cannot be empty.",
      background: "#27272a",
      color: "#ffffff",
      iconColor: "#f59e0b",
      confirmButtonColor: "#dc2626",
    });
    return;
  }

  try {
    showLoader();
    const imageUrl = await uploadImageToImgur(selectedImageFile);

    await addDoc(collection(db, "friends"), {
      uid: auth.currentUser.uid,
      name,
      debtPurpose,
      debt,
      paid,
      notes,
      image: imageUrl,
      timestamp: Date.now(),
    });

    document.getElementById("friendName").value = "";
    document.getElementById("debtPurpose").value = "";
    document.getElementById("debtAmount").value = "";
    document.getElementById("amountPaid").value = "";
    document.getElementById("notes").value = "";
    previewImage.src = DEFAULT_FRIEND_IMAGE;
    friendImageInput.value = "";
    selectedImageFile = null;

    modal.classList.add("hidden");
    loadFriends();

    Swal.fire({
      icon: "success",
      title: "Friend Added!",
      text: `${name} has been added to your list.`,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: "#27272a",
      color: "#ffffff",
      iconColor: "#22c55e",
    });
  } catch (error) {
    console.error("Error adding friend:", error);
    Swal.fire({
      icon: "error",
      title: "Oops...",
      text: "Something went wrong! Could not add friend.",
      background: "#27272a",
      color: "#ffffff",
      iconColor: "#ef4444",
      confirmButtonColor: "#dc2626",
    });
  } finally {
    hideLoader();
  }
};

/* ───────── Edit Friend ───────── */
window.editFriend = async (friendId) => {
  if (!auth.currentUser) {
    Swal.fire({
      icon: "info",
      title: "Login Required",
      text: "Please log in to edit friends.",
      background: "#27272a",
      color: "#ffffff",
      iconColor: "#3b82f6",
      confirmButtonColor: "#dc2626",
    });
    return;
  }

  const editFriendNameInput = document.getElementById("editFriendName");
  const editDebtPurposeInput = document.getElementById("editDebtPurpose");
  const editDebtAmountInput = document.getElementById("editDebtAmount");
  const editAmountPaidInput = document.getElementById("editAmountPaid");
  const editNotesInput = document.getElementById("editNotes");

  try {
    showLoader();
    const friendDocRef = doc(db, "friends", friendId);
    const friendDoc = await getDoc(friendDocRef);

    if (!friendDoc.exists() || friendDoc.data().uid !== auth.currentUser.uid) {
      Swal.fire({
        icon: "error",
        title: "Access Denied",
        text: "Friend not found or you don't have permission to edit.",
        background: "#27272a",
        color: "#ffffff",
        iconColor: "#ef4444",
        confirmButtonColor: "#dc2626",
      });
      return;
    }

    const data = friendDoc.data();

    document.getElementById("editFriendId").value = friendId;
    editFriendNameInput.value = data.name;
    editDebtPurposeInput.value = data.debtPurpose || "";
    editDebtAmountInput.value = data.debt;
    editAmountPaidInput.value = data.paid;
    editNotesInput.value = data.notes || "";

    editFriendImageDisplay.src = data.image || DEFAULT_FRIEND_IMAGE;
    selectedEditImageFile = null;
    editFriendImageInput.value = "";

    editModal.classList.remove("hidden");
  } catch (error) {
    console.error("Error fetching friend for edit:", error);
    Swal.fire({
      icon: "error",
      title: "Error!",
      text: "Could not load friend data for editing.",
      background: "#27272a",
      color: "#ffffff",
      iconColor: "#ef4444",
      confirmButtonColor: "#dc2626",
    });
  } finally {
    hideLoader();
  }
};

/* ───────── Update Friend ───────── */
updateFriendBtn.onclick = async () => {
  if (!auth.currentUser) {
    Swal.fire({
      icon: "info",
      title: "Login Required",
      text: "Please log in to update friends.",
      background: "#27272a",
      color: "#ffffff",
      iconColor: "#3b82f6",
      confirmButtonColor: "#dc2626",
    });
    return;
  }

  const friendId = editFriendIdInput.value;
  const name = document.getElementById("editFriendName").value.trim();
  const debtPurpose = document.getElementById("editDebtPurpose").value.trim();
  const debt = +document.getElementById("editDebtAmount").value || 0;
  const paid = +document.getElementById("editAmountPaid").value || 0;
  const notes = document.getElementById("editNotes").value.trim();

  if (!name) {
    Swal.fire({
      icon: "warning",
      title: "Name Required",
      text: "Friend's name cannot be empty.",
      background: "#27272a",
      color: "#ffffff",
      iconColor: "#f59e0b",
      confirmButtonColor: "#dc2626",
    });
    return;
  }
  if (!friendId) {
    Swal.fire({
      icon: "error",
      title: "Error!",
      text: "Friend ID not found for update.",
      background: "#27272a",
      color: "#ffffff",
      iconColor: "#ef4444",
      confirmButtonColor: "#dc2626",
    });
    return;
  }

  try {
    showLoader();
    const friendDocRef = doc(db, "friends", friendId);
    let imageUrl = null;
    if (selectedEditImageFile) {
      imageUrl = await uploadImageToImgur(selectedEditImageFile);
    }

    const updateData = {
      name,
      debtPurpose,
      debt,
      paid,
      notes,
    };

    if (imageUrl) {
      updateData.image = imageUrl;
    }

    await updateDoc(friendDocRef, updateData);

    selectedEditImageFile = null;
    editFriendImageInput.value = "";

    editModal.classList.add("hidden");
    loadFriends();

    Swal.fire({
      icon: "success",
      title: "Friend Updated!",
      text: `${name}'s details have been updated.`,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: "#27272a",
      color: "#ffffff",
      iconColor: "#22c55e",
    });
  } catch (error) {
    console.error("Error updating friend:", error);
    Swal.fire({
      icon: "error",
      title: "Oops...",
      text: "Something went wrong! Could not update friend.",
      background: "#27272a",
      color: "#ffffff",
      iconColor: "#ef4444",
      confirmButtonColor: "#dc2626",
    });
  } finally {
    hideLoader();
  }
};

/* ───────── Delete Friend ───────── */
window.deleteFriend = async (friendId) => {
  if (!auth.currentUser) {
    Swal.fire({
      icon: "info",
      title: "Login Required",
      text: "Please log in to delete friends.",
      background: "#27272a",
      color: "#ffffff",
      iconColor: "#3b82f6",
      confirmButtonColor: "#dc2626",
    });
    return;
  }

  Swal.fire({
    title: "Are you sure?",
    text: "You won't be able to revert this!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#4b5563",
    confirmButtonText: "Yes, delete it!",
    background: "#27272a",
    color: "#ffffff",
    iconColor: "#f59e0b",
    customClass: {
      confirmButton: "bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded",
      cancelButton:
        "bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded ml-2",
    },
    buttonsStyling: false,
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        showLoader();
        const friendDocRef = doc(db, "friends", friendId);
        await deleteDoc(friendDocRef);

        loadFriends();
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Your friend has been deleted.",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
          background: "#27272a",
          color: "#ffffff",
          iconColor: "#22c55e",
        });
      } catch (error) {
        console.error("Error deleting friend:", error);
        Swal.fire({
          icon: "error",
          title: "Error!",
          text: "Failed to delete friend.",
          background: "#27272a",
          color: "#ffffff",
          iconColor: "#ef4444",
          confirmButtonColor: "#dc2626",
        });
      } finally {
        hideLoader();
      }
    }
  });
};

/* ───────── Load Friends ───────── */
async function loadFriends(filterName = "") {
  showLoader();
  friendListDiv.innerHTML = "";
  let totalDebt = 0;
  let totalPaid = 0;
  const allFriendsData = [];

  try {
    let q = query(
      collection(db, "friends"),
      where("uid", "==", auth.currentUser.uid),
      orderBy("timestamp", "desc")
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      friendListDiv.innerHTML = `<p class="text-gray-400 text-center mt-8">No friends added yet.</p>`;
      renderDebtChart(0, 0);
      renderMostWanted([]);
      hideLoader();
      return;
    }

    let found = false;
    snap.forEach((doc) => {
      const friendId = doc.id;
      const data = doc.data();
      const { name, debt, paid, image, debtPurpose, notes } = data;

      totalDebt += debt;
      totalPaid += paid;

      allFriendsData.push({ id: friendId, ...data });

      if (
        !filterName ||
        name.toLowerCase().includes(filterName.toLowerCase())
      ) {
        found = true;
        const owes = (debt - paid).toFixed(2);
        const friendImageSrc = image || DEFAULT_FRIEND_IMAGE;

        friendListDiv.insertAdjacentHTML(
          "beforeend",
          `
                <div class="friend-card flex items-center space-x-4 bg-zinc-700 p-4 rounded mb-4 shadow-md">
                  <img src="${friendImageSrc}" alt="${name}" class="w-16 h-16 rounded-full object-cover">
                  <div class="flex-1">
                    <h3 class="text-lg font-semibold">${name}</h3>
                    <p class="text-sm text-gray-300">Purpose: ${
                      debtPurpose || "N/A"
                    }</p>
                    <p class="text-sm text-gray-300">Debt: ₱${debt.toFixed(
                      2
                    )}</p>
                    <p class="text-sm text-gray-300">Paid: ₱${paid.toFixed(
                      2
                    )}</p>
                    <p class="text-sm ${
                      owes > 0 ? "text-red-400" : "text-green-400"
                    } font-medium">Owes: ₱${owes}</p>
                    ${
                      notes
                        ? `<p class="text-sm text-gray-400 italic mt-1">Notes: ${notes}</p>`
                        : ""
                    }
                  </div>

                  <div class="flex flex-col items-end space-y-2 ml-4">
                    <button onclick="editFriend('${friendId}')" class="text-gray-400 hover:text-white"><i class="fas fa-pen"></i></button>
                    <button onclick="deleteFriend('${friendId}')" class="text-red-400 hover:text-white"><i class="fas fa-trash"></i></button>
                  </div>
                </div>
              `
        );
      }
    });

    if (!found && filterName) {
      friendListDiv.innerHTML = `<p class="text-gray-400 text-center mt-8">No matching friends found for "${filterName}".</p>`;
    } else if (!found && !filterName && snap.empty) {
      friendListDiv.innerHTML = `<p class="text-gray-400 text-center mt-8">No friends added yet.</p>`;
    }

    renderDebtChart(totalDebt, totalPaid);

    renderMostWanted(allFriendsData);
  } catch (error) {
    console.error("Error loading friends:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to load friends data. Please try again.",
      background: "#27272a",
      color: "#ffffff",
      iconColor: "#ef4444",
      confirmButtonColor: "#dc2626",
    });
  } finally {
    hideLoader();
  }
}

/* ───────── Chart.js ───────── */
function renderDebtChart(totalDebt, totalPaid) {
  const canvas = document.getElementById("debtChart");
  const summary = document.getElementById("debtSummary");
  const noDataImage = document.getElementById("noDataImage");

  const hasData = totalDebt > 0 || totalPaid > 0;

  if (!hasData) {
    canvas.style.display = "none";
    summary.style.display = "none";
    noDataImage.style.display = "block";
    return;
  } else {
    canvas.style.display = "block";
    summary.style.display = "block";
    noDataImage.style.display = "none";
  }

  if (debtChart) {
    debtChart.destroy();
  }

  const totalOwed = Math.max(totalDebt - totalPaid, 0);

  const data = {
    labels: ["Total Debt (Lent)", "Total Paid", "Still Owed"],
    datasets: [
      {
        data: [totalDebt, totalPaid, totalOwed],
        backgroundColor: [
          "rgba(239, 68, 68, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(250, 204, 21, 0.8)",
        ],
        borderColor: "#1f2937",
        borderWidth: 2,
        borderRadius: 6,
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#e5e7eb",
          font: { size: 14, family: "Inter, sans-serif" },
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: "#111827",
        titleColor: "#f3f4f6",
        bodyColor: "#f3f4f6",
        padding: 12,
        callbacks: {
          label: (context) => `${context.label}: ₱${context.parsed.toFixed(2)}`,
        },
      },
    },
  };

  debtChart = new Chart(canvas, {
    type: "pie",
    data: data,
    options: options,
  });

  summary.innerHTML = `
          <div class="space-y-2 mt-4 text-sm text-gray-200">
            <p><span class="text-gray-400">Total Debt Lent:</span> <span class="text-red-400 font-semibold">₱${totalDebt.toFixed(
              2
            )}</span></p>
            <p><span class="text-gray-400">Total Amount Paid:</span> <span class="text-green-400 font-semibold">₱${totalPaid.toFixed(
              2
            )}</span></p>
            <p><span class="text-gray-400">Total Still Owed:</span> 
              <span class="${
                totalOwed > 0 ? "text-yellow-400" : "text-green-400"
              } font-semibold">
                ₱${totalOwed.toFixed(2)}
              </span>
            </p>
          </div>
        `;
}

/* ───────── Most Wanted ───────── */
function renderMostWanted(friends) {
  mostWantedListDiv.innerHTML = "";
  noWantedMsg.classList.add("hidden");

  const debtors = friends
    .map((friend) => ({
      ...friend,
      netOwed: friend.debt - friend.paid,
    }))
    .filter((friend) => friend.netOwed > 0)
    .sort((a, b) => b.netOwed - a.netOwed)
    .slice(0, 2);

  if (debtors.length === 0) {
    noWantedMsg.classList.remove("hidden");
    return;
  }

  debtors.forEach((debtor) => {
    const friendImageSrc = debtor.image || DEFAULT_FRIEND_IMAGE;
    mostWantedListDiv.insertAdjacentHTML(
      "beforeend",
      `
        <div class="wanted-poster rounded-lg">
          <h3>Wanted</h3>
          <div class="wanted-divider"></div>
          <img src="${friendImageSrc}" alt="${debtor.name}"
                class="w-20 h-20 mx-auto object-cover mt-1 mb-2 rounded-full">
          <h3>${debtor.name}</h3>
          <p>For: ${debtor.debtPurpose || "Unpaid Debt"}</p>
          <div class="wanted-divider"></div>
          <p class="wanted-reward">₱${debtor.netOwed.toFixed(2)} REWARD</p>
        </div>
      `
    );
  });
}

document.addEventListener("DOMContentLoaded", () => {
  previewImage.src = DEFAULT_FRIEND_IMAGE;
  editFriendImageDisplay.src = DEFAULT_FRIEND_IMAGE;
});
