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
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
} = window.firebaseApp;

/* ------- DOM Elements ------- */
const loginBtn = document.getElementById("loginBtn");
const addBtn = document.querySelector(".add");
const modal = document.getElementById("addModal");
const closeModalBtn = document.querySelector(".closeModal");
const addFriendBtn = document.getElementById("addFriendBtn");
const friendListDiv = document.getElementById("friendList");
const searchBtn = document.querySelector(".search");
const searchInput = document.getElementById("searchInput");

// Elements for Edit Modal
const editModal = document.getElementById("editModal");
const closeEditModalBtn = document.querySelector(".closeEditModal");
const updateFriendBtn = document.getElementById("updateFriendBtn");
const editFriendIdInput = document.getElementById("editFriendId");
const editFriendImageDisplay = document.getElementById(
  "editFriendImageDisplay"
); // NEW: For displaying image in edit modal

// Elements for Chart and Summary
const debtChartCanvas = document.getElementById("debtChart");
const debtSummaryDiv = document.getElementById("debtSummary");
let debtChart; // Variable to hold the Chart.js instance

// Elements for Most Wanted Section
const mostWantedListDiv = document.getElementById("mostWantedList");
const noWantedMsg = document.getElementById("noWantedMsg");

// Define a default image path for friends
const DEFAULT_FRIEND_IMAGE = "images/cat.png";

/* ------- Authentication Flow ------- */
async function doLogin() {
  try {
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
  }
}

loginBtn.addEventListener("click", () =>
  auth.currentUser ? signOut(auth) : doLogin()
);

onAuthStateChanged(auth, (user) => {
  loginBtn.textContent = user ? user.displayName.split(" ")[0] : "Login";
  if (user) {
    loadFriends(); // Load friends and update chart and most wanted list
  } else {
    friendListDiv.innerHTML = `<p class="text-gray-400 text-center mt-8">Please log in to see your Debtflix friends.</p>`;
    renderDebtChart(0, 0); // Clear chart when logged out
    renderMostWanted([]); // Clear most wanted list
  }
});

getRedirectResult(auth).catch((err) => {
  if (err.code !== "auth/no-auth-event") {
    console.error("Redirect result error:", err);
  }
});

/* ------- Modal Handling ------- */
addBtn.onclick = () => modal.classList.remove("hidden");
closeModalBtn.onclick = () => modal.classList.add("hidden");
modal.onclick = (e) => {
  if (e.target === modal) modal.classList.add("hidden");
};

closeEditModalBtn.onclick = () => editModal.classList.add("hidden");
editModal.onclick = (e) => {
  if (e.target === editModal) editModal.classList.add("hidden");
};

/* ------- Search Functionality ------- */
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

/* ------- Add Friend ------- */
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
    await addDoc(collection(db, "friends"), {
      uid: auth.currentUser.uid,
      name,
      debtPurpose,
      debt,
      paid,
      notes,
      image: DEFAULT_FRIEND_IMAGE,
      timestamp: Date.now(),
    });

    document.getElementById("friendName").value = "";
    document.getElementById("debtPurpose").value = "";
    document.getElementById("debtAmount").value = "";
    document.getElementById("amountPaid").value = "";
    document.getElementById("notes").value = "";

    modal.classList.add("hidden");
    loadFriends(); // Refresh list, chart, and most wanted

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
  }
};

/* ------- Edit Friend ------- */
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
  // const editFriendImageDisplay = document.getElementById("editFriendImageDisplay"); // Already declared globally

  try {
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

    // Set the image source for the edit modal, using default if none is set
    editFriendImageDisplay.src = data.image || DEFAULT_FRIEND_IMAGE;

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
  }
};

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
    const friendDocRef = doc(db, "friends", friendId);

    await updateDoc(friendDocRef, {
      name,
      debtPurpose,
      debt,
      paid,
      notes,
    });

    editModal.classList.add("hidden");
    loadFriends(); // Refresh list, chart, and most wanted

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
  }
};

/* ------- Delete Friend ------- */
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
        const friendDocRef = doc(db, "friends", friendId);
        await deleteDoc(friendDocRef);

        loadFriends(); // Refresh list, chart, and most wanted
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
      }
    }
  });
};

/* ------- Load & Render Friends and Update Chart/Most Wanted ------- */
async function loadFriends(filterName = "") {
  friendListDiv.innerHTML = ""; // Clear existing friend list
  let totalDebt = 0;
  let totalPaid = 0;
  const allFriendsData = []; // To store all friends for sorting for most wanted

  let q = query(
    collection(db, "friends"),
    where("uid", "==", auth.currentUser.uid), // Filter by current user's UID
    orderBy("timestamp", "desc") // Order by timestamp (most recent first)
  );

  const snap = await getDocs(q); // Execute the query

  if (snap.empty) {
    friendListDiv.innerHTML = `<p class="text-gray-400 text-center mt-8">No friends added yet.</p>`;
    renderDebtChart(0, 0);
    renderMostWanted([]); // Render empty most wanted list
    return;
  }

  let found = false; // Flag to track if any friends match the filter
  snap.forEach((doc) => {
    const friendId = doc.id; // Get the document ID for edit/delete functions
    const data = doc.data();
    const { name, debt, paid, image, debtPurpose, notes } = data;

    // Accumulate totals for the chart and summary
    totalDebt += debt;
    totalPaid += paid;

    // Add friend data to allFriendsData for Most Wanted calculation
    allFriendsData.push({ id: friendId, ...data });

    // Filter for display in the right panel
    if (!filterName || name.toLowerCase().includes(filterName.toLowerCase())) {
      found = true;
      const owes = (debt - paid).toFixed(2);
      const friendImageSrc = image || DEFAULT_FRIEND_IMAGE; // Use default if 'image' field is missing

      friendListDiv.insertAdjacentHTML(
        "beforeend",
        `
        <div class="flex items-center space-x-4 bg-zinc-700 p-4 rounded mb-4 shadow-md">
          <img src="${friendImageSrc}" alt="${name}" class="w-16 h-16 rounded-full object-cover">
          <div class="flex-1">
            <h3 class="text-lg font-semibold">${name}</h3>
            <p class="text-sm text-gray-300">Purpose: ${
              debtPurpose || "N/A"
            }</p>
            <p class="text-sm text-gray-300">Debt: ₱${debt.toFixed(2)}</p>
            <p class="text-sm text-gray-300">Paid: ₱${paid.toFixed(2)}</p>
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
    // Corrected condition to specifically check for empty snap
    friendListDiv.innerHTML = `<p class="text-gray-400 text-center mt-8">No friends added yet.</p>`;
  }

  // Render or update the chart with aggregated data
  renderDebtChart(totalDebt, totalPaid);

  // Render the most wanted list
  renderMostWanted(allFriendsData);
}

/* ------- Chart Rendering Function (Chart.js) ------- */
function renderDebtChart(totalDebt, totalPaid) {
  if (debtChart) {
    debtChart.destroy();
  }

  const totalOwed = totalDebt - totalPaid;

  const data = {
    labels: ["Total Debt (Lent)", "Total Paid", "Still Owed"],
    datasets: [
      {
        data: [totalDebt, totalPaid, totalOwed > 0 ? totalOwed : 0],
        backgroundColor: [
          "#dc2626", // red-600
          "#22c55e", // green-500
          "#facc15", // amber-500
        ],
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#ffffff",
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed !== null) {
              label += "₱" + context.parsed.toFixed(2);
            }
            return label;
          },
        },
        backgroundColor: "#27272a",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
      },
    },
  };

  debtChart = new Chart(debtChartCanvas, {
    type: "pie",
    data: data,
    options: options,
  });

  debtSummaryDiv.innerHTML = `
    <p>Total Debt Lent: <span class="text-red-400 font-bold">₱${totalDebt.toFixed(
      2
    )}</span></p>
    <p>Total Amount Paid: <span class="text-green-400 font-bold">₱${totalPaid.toFixed(
      2
    )}</span></p>
    <p>Total Still Owed: <span class="${
      totalOwed > 0 ? "text-yellow-400" : "text-green-400"
    } font-bold">₱${totalOwed.toFixed(2)}</span></p>
  `;
}

/* ------- Render Most Wanted ------- */
function renderMostWanted(friends) {
  mostWantedListDiv.innerHTML = ""; // Clear existing posters
  noWantedMsg.classList.add("hidden"); // Hide default message initially

  const debtors = friends
    .map((friend) => ({
      ...friend,
      netOwed: friend.debt - friend.paid,
    }))
    .filter((friend) => friend.netOwed > 0) // Only show those who owe money
    .sort((a, b) => b.netOwed - a.netOwed) // Sort by highest net debt
    .slice(0, 3); // Get top 3

  if (debtors.length === 0) {
    noWantedMsg.classList.remove("hidden"); // Show message if no debtors
    return;
  }

  debtors.forEach((debtor) => {
    const friendImageSrc = debtor.image || DEFAULT_FRIEND_IMAGE;
    mostWantedListDiv.insertAdjacentHTML(
      "beforeend",
      `
  <div class="wanted-poster">
    <h3>Wanted</h3>
    <div class="wanted-divider"></div>
    <img src="${friendImageSrc}" alt="${debtor.name}" 
         class="w-20 h-20 mx-auto object-cover mt-1 mb-2">
    <h3>${debtor.name}</h3>
    <p>For: ${debtor.debtPurpose || "Unpaid Debt"}</p>
    <div class="wanted-divider"></div>
    <p class="wanted-reward">₱${debtor.netOwed.toFixed(2)} REWARD</p>
  </div>
`
    );
  });
}
