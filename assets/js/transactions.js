import { auth, db } from "../../firebase/firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    collection,
    getDocs,
    query,
    orderBy,
    addDoc,
    serverTimestamp,
    deleteDoc,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// FILTER DRAWER

const openFilter = document.getElementById("openFilter");
const closeFilter = document.getElementById("closeFilter");
const filterDrawer = document.getElementById("filterDrawer");
const filterOverlay = document.getElementById("filterOverlay");

const resetFilters = document.getElementById("resetFilters");
const drawerResetFilters = document.getElementById("drawerResetFilters");

const searchInput = document.getElementById("searchInput");
const typeFilter = document.getElementById("typeFilter");
const categoryFilter = document.getElementById("categoryFilter");
const sortTransactions = document.getElementById("sortTransactions");
const applyFiltersBtn = document.getElementById("applyFilters");

function openFilterDrawer() {
    filterDrawer.classList.add("active");
    filterOverlay.classList.add("active");
}

function closeFilterDrawer() {
    filterDrawer.classList.remove("active");
    filterOverlay.classList.remove("active");
}

function checkActiveFilters() {
    const active =
        searchInput.value.trim() ||
        typeFilter.value ||
        categoryFilter.value ||
        sortTransactions.value !== "latest";

    resetFilters.classList.toggle("show", !!active);
}

function resetAllFilters() {
    searchInput.value = "";
    typeFilter.value = "";
    categoryFilter.value = "";
    sortTransactions.value = "latest";

    currentPage = 1;

    checkActiveFilters();
    applyFilters();
    closeFilterDrawer();
}

openFilter?.addEventListener("click", openFilterDrawer);
closeFilter?.addEventListener("click", closeFilterDrawer);
filterOverlay?.addEventListener("click", closeFilterDrawer);

applyFiltersBtn?.addEventListener("click", () => {
    currentPage = 1;

    checkActiveFilters();
    applyFilters();
    closeFilterDrawer();
});

resetFilters?.addEventListener("click", resetAllFilters);
drawerResetFilters?.addEventListener("click", resetAllFilters);

[searchInput, typeFilter, categoryFilter, sortTransactions].forEach(input => {
    input?.addEventListener("input", () => {
        currentPage = 1;

        checkActiveFilters();
        applyFilters();
    });

    input?.addEventListener("change", () => {
        currentPage = 1;

        checkActiveFilters();
        applyFilters();
    });
});

// FIREBASE TRANSACTIONS LOAD

let currentUser = null;
let allTransactions = [];
let editingTransactionId = null;
let currentPage = 1;
const rowsPerPage = 10;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    currentUser = user;
    await loadTransactions();
});

async function loadTransactions() {

    const tableBody =
        document.getElementById("transactionsTableBody");

    if (!tableBody || !currentUser) return;

    showTableSkeleton();

    const transactionsRef =
        collection(
            db,
            "users",
            currentUser.uid,
            "transactions"
        );

    const q =
        query(
            transactionsRef,
            orderBy("createdAt","desc")
        );

    const snapshot =
        await getDocs(q);

    allTransactions = [];

    snapshot.forEach(doc => {

        allTransactions.push({
            id:doc.id,
            ...doc.data()
        });

    });

    setTimeout(() => {

        document.body.classList.remove("transactions-loading");

        applyFilters();

    },1000);

}

// TABLE SKELETON

function showTableSkeleton() {
    const tableBody = document.getElementById("transactionsTableBody");

    if (!tableBody) return;
    let skeleton = "";

    for (let i = 0; i < 6; i++) {
        skeleton += `
            <tr class="skeleton-row">
                <td><div class="skeleton-box"></div></td>
                <td><div class="skeleton-box"></div></td>
                <td><div class="skeleton-box small"></div></td>
                <td><div class="skeleton-box"></div></td>
                <td><div class="skeleton-box"></div></td>
                <td><div class="skeleton-box small"></div></td>
            </tr>
        `;
    }
    tableBody.innerHTML = skeleton;
}

function renderTransactions(transactions) {
    const tableBody = document.getElementById("transactionsTableBody");

    tableBody.innerHTML = "";

    if (transactions.length === 0) {
        tableBody.innerHTML = `
        <tr>
            <td colspan="6">
                <div class="premium-empty-state">
                    <div class="empty-icon">
                        <i class="fa-solid fa-chart-simple"></i>
                    </div>
                    <h3>No Transactions Found</h3>
                    <p>
                        Try changing your filters or add a new transaction
                        to start tracking your finances.
                    </p>
                    <button class="empty-add-btn" id="emptyAddTransaction">
                        <i class="fa-solid fa-plus"></i>
                        Add Transaction
                    </button>
                </div>
            </td>
        </tr>
    `;
        return;
    }

    transactions.forEach(transaction => {
        const isIncome = transaction.type === "income";

        tableBody.innerHTML += `
            <tr>
                <td> <strong>${transaction.title}</strong> </td>
                <td>${transaction.category}</td>

                <td>
                    <span class="type-badge ${transaction.type}"> ${transaction.type} </span>
                </td>

                <td>${formatDate(transaction.date)}</td>

                <td class="${isIncome ? "income-text" : "expense-text"}">
                    ${isIncome ? "+" : "-"} ₹${Number(transaction.amount).toLocaleString("en-IN")}
                </td>

                <td>
                    <div class="table-actions">
                       <button class="action-btn edit-btn" data-id="${transaction.id}">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="action-btn delete-btn" data-id="${transaction.id}">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

function updateTransactionStats(transactions, isFilterActive = false) {
    let income = 0;
    let expense = 0;

    transactions.forEach(transaction => {
        if (transaction.type === "income") {
            income += Number(transaction.amount);
        } else {
            expense += Number(transaction.amount);
        }
    });

    const balance = isFilterActive ? 0 : income - expense;

    document.getElementById("txTotalIncome").textContent =
        "₹" + income.toLocaleString("en-IN");

    document.getElementById("txTotalExpense").textContent =
        "₹" + expense.toLocaleString("en-IN");

    document.getElementById("txNetBalance").textContent =
        "₹" + balance.toLocaleString("en-IN");

    document.getElementById("txTotalCount").textContent =
        transactions.length;
}

// APPLY FILTERS

function applyFilters() {
    let filtered = [...allTransactions];

    const search = searchInput.value.trim().toLowerCase();
    const type = typeFilter.value;
    const category = categoryFilter.value;
    const sort = sortTransactions.value;

    if (search) {
        filtered = filtered.filter(transaction =>
            transaction.title.toLowerCase().includes(search) ||
            transaction.category.toLowerCase().includes(search)
        );
    }

    if (type) {
        filtered = filtered.filter(transaction =>
            transaction.type === type
        );
    }

    if (category) {
        filtered = filtered.filter(transaction =>
            transaction.category === category
        );
    }

    switch (sort) {
        case "oldest":
            filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;

        case "high":
            filtered.sort((a, b) => Number(b.amount) - Number(a.amount));
            break;

        case "low":
            filtered.sort((a, b) => Number(a.amount) - Number(b.amount));
            break;

        default:
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    renderPaginatedTransactions(filtered);

    const isFilterActive =
        search ||
        type ||
        category ||
        sort !== "latest";

    updateTransactionStats(
        filtered,
        isFilterActive
    );
}

function formatDate(dateValue) {
    if (!dateValue) return "No Date";

    return new Date(dateValue).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

// ADD TRANSACTION MODAL

const addTransactionBtn = document.getElementById("addTransactionBtn");
const transactionModal = document.getElementById("transactionModal");
const closeModal = document.getElementById("closeModal");
const transactionForm = document.getElementById("transactionForm");
const transactionDate = document.getElementById("transactionDate");

if (transactionDate) {
    transactionDate.max = new Date().toISOString().split("T")[0];
}

addTransactionBtn?.addEventListener("click", () => {
    transactionModal.classList.add("active");
});

closeModal?.addEventListener("click", () => {
    resetTransactionModal();
    transactionModal.classList.remove("active");
});

transactionModal?.addEventListener("click", (e) => {
    if (e.target === transactionModal) {
        resetTransactionModal();
        transactionModal.classList.remove("active");
    }
});

transactionForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser) return;

    const title = document.getElementById("transactionTitle").value.trim();
    const amount = Number(document.getElementById("transactionAmount").value);
    const type = document.getElementById("transactionType").value;
    const category = document.getElementById("transactionCategory").value;
    const date = document.getElementById("transactionDate").value;
    const saveBtn = document.getElementById("saveTransactionBtn");

    if (!title || !amount || !type || !category || !date) {
        alert("Please fill all fields");
        return;
    }

    if (amount <= 0) {
        alert("Amount must be greater than 0");
        return;
    }

    try {
        const isEditMode = !!editingTransactionId;
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

        const transactionsRef = collection(
            db,
            "users",
            currentUser.uid,
            "transactions"
        );

        if (editingTransactionId) {
            const transactionRef = doc(db,"users",currentUser.uid,"transactions",editingTransactionId);

            await updateDoc(transactionRef, {title,amount,type,category,date});

        } else {
            await addDoc(transactionsRef, {title,amount,type,category,date,createdAt: serverTimestamp()});
        }

        transactionForm.reset();

        editingTransactionId = null;

        document.querySelector(".modal-header h3").textContent =
            "Add Transaction";

        document.querySelector(".modal-header p").textContent =
            "Record your income or expense";

        saveBtn.innerHTML =
            `<i class="fa-solid fa-plus"></i> Save Transaction`;

        transactionModal.classList.remove("active");

        await loadTransactions();
        saveBtn.disabled = false;

        showToast(
            isEditMode
                ? "Transaction updated successfully"
                : "Transaction added successfully",
            "success"
        );
    } catch (error) {
        console.error("Add Error:", error);

        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="fa-solid fa-plus"></i> Save Transaction`;
    }
});

// RESET TRANSACTION MODAL

function resetTransactionModal() {
    editingTransactionId = null;

    transactionForm.reset();

    document.querySelector(".modal-header h3").textContent =
        "Add Transaction";

    document.querySelector(".modal-header p").textContent =
        "Record your income or expense";

    document.getElementById("saveTransactionBtn").innerHTML =
        `<i class="fa-solid fa-plus"></i> Save Transaction`;
}

// DELETE TRANSACTION

document.addEventListener("click", async (e) => {
    const deleteBtn = e.target.closest(".delete-btn");

    if (!deleteBtn) return;
    const transactionId = deleteBtn.dataset.id;

    if (!transactionId || !currentUser) return;
    const result = await Swal.fire({
        title: "Delete Transaction ?",
        text: "This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#EF4444",
        cancelButtonColor: "#64748B",
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel",
        reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
        const transactionRef = doc( db,"users",currentUser.uid,"transactions",transactionId);

        await deleteDoc(transactionRef);
        await loadTransactions();

        Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: "Transaction deleted successfully.",
            timer: 1800,
            showConfirmButton: false
        });

    } catch (error) {
        console.error("Delete Error:", error);

        Swal.fire({
            icon: "error",
            title: "Oops...",
            text: "Failed to delete transaction."
        });
    }
});

// EDIT TRANSACTION

document.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".edit-btn");

    if (!editBtn) return;

    const transactionId = editBtn.dataset.id;
    const transaction = allTransactions.find(item =>
        item.id === transactionId
    );

    if (!transaction) return;

    editingTransactionId = transactionId;

    document.getElementById("transactionTitle").value =
        transaction.title;

    document.getElementById("transactionAmount").value =
        transaction.amount;

    document.getElementById("transactionType").value =
        transaction.type;

    document.getElementById("transactionCategory").value =
        transaction.category;

    document.getElementById("transactionDate").value =
        transaction.date;

    document.querySelector(".modal-header h3").textContent =
        "Edit Transaction";

    document.querySelector(".modal-header p").textContent =
        "Update your transaction details";

    document.getElementById("saveTransactionBtn").innerHTML =
        `<i class="fa-solid fa-pen"></i> Update Transaction`;

    transactionModal.classList.add("active");
});

function showToast(message, type = "success") {
    const toast = document.createElement("div");

    toast.className = `dashboard-toast ${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 100);

    setTimeout(() => {
        toast.classList.remove("show");

        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 2500);
}

// PAGINATION

function renderPaginatedTransactions(transactions) {
    const totalPages = Math.ceil(transactions.length / rowsPerPage);

    if (currentPage > totalPages) {
        currentPage = totalPages || 1;
    }

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedData = transactions.slice(start, end);

    renderTransactions(paginatedData);
    renderPagination(transactions.length);
}

function renderPagination(totalItems) {
    const pagination = document.getElementById("pagination");
    const paginationInfo = document.getElementById("paginationInfo");

    if (!pagination || !paginationInfo) return;

    const totalPages = Math.ceil(totalItems / rowsPerPage);
    pagination.innerHTML = "";

    if (totalItems === 0) {
        paginationInfo.textContent = "Showing 0 of 0 transactions";
        return;
    }

    const start = (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(currentPage * rowsPerPage, totalItems);

    paginationInfo.textContent =
        `Showing ${start}-${end} of ${totalItems} transactions`;

    createPageButton("«", 1, currentPage === 1);
    createPageButton("‹", currentPage - 1, currentPage === 1);

    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 ||
            i === totalPages ||
            Math.abs(i - currentPage) <= 1
        ) {
            createPageButton(i, i, false, i === currentPage);
        }

        else if (
            i === currentPage - 2 ||
            i === currentPage + 2
        ) {
            createDots();
        }
    }

    createPageButton("›", currentPage + 1, currentPage === totalPages);
    createPageButton("»", totalPages, currentPage === totalPages);

    function createPageButton(text, page, disabled = false, active = false) {
        const btn = document.createElement("button");
        btn.textContent = text;

        if (active) {
            btn.classList.add("active");
        }

        btn.disabled = disabled;
        btn.addEventListener("click", () => {
            if (disabled || active) return;

            currentPage = page;
            applyFilters();
        });
        pagination.appendChild(btn);
    }

    function createDots() {
        const dots = document.createElement("span");

        dots.className = "pagination-dots";
        dots.textContent = "...";
        pagination.appendChild(dots);
    }
}

// EMPTY STATE ADD BUTTON

document.addEventListener("click", (e) => {
    const emptyAddBtn = e.target.closest("#emptyAddTransaction");
    if (!emptyAddBtn) return;
    transactionModal.classList.add("active");
});

// LOGOUT

const logoutBtn = document.getElementById("logoutBtn");

logoutBtn?.addEventListener("click", async () => {
    try {
        await auth.signOut();
        showToast(
            "Logged out successfully",
            "success"
        );

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1200);

    } catch (error) {
        console.error("Logout Error:", error);
        showToast(
            "Logout failed. Please try again.",
            "error"
        );
    }
});

// AUTO LOGOUT (5 MINUTES)

const AUTO_LOGOUT_TIME = 5 * 60 * 1000; // 5 Minutes
let logoutTimer;

function startLogoutTimer() {
    clearTimeout(logoutTimer);

    logoutTimer = setTimeout(async () => {
        try {
            await auth.signOut();
            showToast(
                "Session expired due to inactivity",
                "error"
            );

            setTimeout(() => {
                window.location.href = "login.html";
            }, 1200);

        } catch (error) {
            console.error("Auto Logout Error:", error);
        }
    }, AUTO_LOGOUT_TIME);
}

["mousemove","mousedown","click","scroll","keypress","touchstart"].forEach(event => {
    document.addEventListener(event,startLogoutTimer);
});

startLogoutTimer();