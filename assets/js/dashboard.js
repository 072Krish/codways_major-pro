/* FIREBASE IMPORTS */

import { auth, db } from "../../firebase/firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    serverTimestamp,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* AUTH GUARD */

let currentUser = null;
let transactionsRef = null;
let incomeExpenseChart = null;
let expenseCategoryChart = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = user;
    transactionsRef = collection(
        db, "users", currentUser.uid, "transactions"
    );

    loadTransactions();

    const userName = document.getElementById("userName");
    const userAvatar = document.querySelector(".user-avatar");
    const transactionList = document.getElementById("transactionList");

    let fullName = user.displayName || "User";

    try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            fullName = userData.name || fullName;
        }
    } catch (error) {
        console.error("User Name Error:", error);
    }

    if (userName) {
        userName.textContent = fullName;
    }

    if (userAvatar) {
        userAvatar.textContent =
            (fullName || user.email || "U")
                .charAt(0)
                .toUpperCase();
    }
});

/* SIDEBAR TOGGLE */

const menuToggle = document.getElementById("menuToggle");
const sidebar = document.querySelector(".sidebar");

if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", () => {
        sidebar.classList.toggle("active");
    });
}

// INCOME VS EXPENSE CHART

const incomeExpenseCanvas =
    document.getElementById("incomeExpenseChart");

if (incomeExpenseCanvas) {
    incomeExpenseChart = new Chart(incomeExpenseCanvas, {
        type: "bar",
        data: {
            labels: [
                "Jan", "Feb", "Mar", "Apr",
                "May", "Jun", "Jul", "Aug",
                "Sep", "Oct", "Nov", "Dec"
            ],
            datasets: [
                {
                    label: "Income",
                    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: "#22C55E",
                    borderRadius: 10
                },
                {
                    label: "Expense",
                    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: "#2563EB",
                    borderRadius: 10
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: "#CBD5E1"
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: "#94A3B8"
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    ticks: {
                        color: "#94A3B8"
                    },
                    grid: {
                        color: "rgba(255,255,255,.08)"
                    }
                }
            }
        }
    });
}

// EXPENSE CATEGORY CHART

const expenseCategoryCanvas =
    document.getElementById("expenseCategoryChart");

if (expenseCategoryCanvas) {
    expenseCategoryChart = new Chart(expenseCategoryCanvas, {
        type: "doughnut",
        data: {
            labels: ["Food", "Transport", "Shopping", "Bills", "Others"],
            datasets: [{
                data: [35, 20, 18, 15, 12],

                backgroundColor: ["#22C55E", "#2563EB", "#F59E0B", "#EF4444", "#8B5CF6"],
                borderWidth: 0,
                hoverOffset: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: "#CBD5E1",
                        padding: 18,
                        usePointStyle: true,
                        pointStyle: "circle"
                    }
                }
            }
        }
    });
}

// TRANSACTION MODAL

const openModalBtn = document.getElementById("openModal");
const closeModalBtn = document.getElementById("closeModal");
const transactionModal = document.getElementById("transactionModal");

if (openModalBtn && transactionModal) {
    openModalBtn.addEventListener("click", () => {
        transactionModal.classList.add("active");
    });
}

if (closeModalBtn && transactionModal) {
    closeModalBtn.addEventListener("click", () => {
        transactionModal.classList.remove("active");
    });
}

// Close when clicking outside

transactionModal?.addEventListener("click", (e) => {
    if (e.target === transactionModal) {
        transactionModal.classList.remove("active");
    }
});

// ESC Key Support

document.addEventListener("keydown", (e) => {
    if (
        e.key === "Escape" &&
        transactionModal.classList.contains("active")
    ) {
        transactionModal.classList.remove("active");
    }
});

// ADD TRANSACTION TO FIRESTORE

const transactionForm = document.getElementById("transactionForm");

const transactionDate =
    document.getElementById("transactionDate");

if (transactionDate) {
    transactionDate.max =
        new Date().toISOString().split("T")[0];
}


if (transactionForm) {
    transactionForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!currentUser || !transactionsRef) {
            showDashboardToast("User not logged in", "error");
            return;
        }

        const title = document.getElementById("transactionTitle").value.trim();
        const amount = Number(document.getElementById("transactionAmount").value);
        const type = document.getElementById("transactionType").value;
        const category = document.getElementById("transactionCategory").value;
        const date = document.getElementById("transactionDate").value;
        const saveBtn = document.getElementById("saveTransactionBtn");

        if (!title || !amount || !type || !category || !date) {
            showDashboardToast("Please fill all fields", "error");
            return;
        }

        if (amount <= 0) {
            showDashboardToast("Amount must be greater than 0", "error");
            return;
        }

        const today = new Date().toISOString().split("T")[0];

        if (date > today) {
            showDashboardToast("Future date is not allowed", "error");
            return;
        }

        try {
            await addDoc(transactionsRef, { title, amount, type, category, date, createdAt: serverTimestamp() });

            saveBtn.disabled = true;
            saveBtn.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin"></i>
    Saving...
`;

            // Refresh Dashboard Data
            await loadTransactions();
            // Reset Form
            transactionForm.reset();
            // Close Modal
            transactionModal.classList.remove("active");
            // Success Message
            showDashboardToast("Transaction added successfully", "success");
            saveBtn.disabled = false;

            saveBtn.innerHTML = `
    <i class="fa-solid fa-plus"></i>
    Save Transaction
`;

        } catch (error) {
            console.error("Transaction Error:", error);
            showDashboardToast("Failed to add transaction", "error");
            saveBtn.disabled = false;

            saveBtn.innerHTML = `
    <i class="fa-solid fa-plus"></i>
    Save Transaction
`;
        }
    });
}

// LOAD TRANSACTIONS

async function loadTransactions() {
    if (!transactionsRef) return;
    const transactionList = document.getElementById("transactionList");
    try {
        const q = query(
            transactionsRef,
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        if (transactionList) {
            transactionList.innerHTML = "";
        }

        let totalIncome = 0;
        let totalExpense = 0;
        let visibleCount = 0;
        let transactionFound = false;

        const monthlyIncome = Array(12).fill(0);
        const monthlyExpense = Array(12).fill(0);

        const categoryTotals = { Food: 0, Transport: 0, Shopping: 0, Bills: 0, Others: 0 };

        snapshot.forEach(doc => {
            const transaction = doc.data();
            transactionFound = true;

            if (transaction.type === "income") {
                totalIncome += Number(transaction.amount);
            } else {
                totalExpense += Number(transaction.amount);
            }

            const transactionMonth = new Date(transaction.date).getMonth();

            if (transactionMonth >= 0 && transactionMonth < 12) {
                if (transaction.type === "income") {
                    monthlyIncome[transactionMonth] += Number(transaction.amount);
                } else {
                    monthlyExpense[transactionMonth] += Number(transaction.amount);
                }
            }

            if (transaction.type === "expense") {
                if (categoryTotals[transaction.category] !== undefined) {
                    categoryTotals[transaction.category] += Number(transaction.amount);
                } else {
                    categoryTotals.Others += Number(transaction.amount);
                }
            }

            if (transactionList && visibleCount < 3) {
                const sign = transaction.type === "income" ? "+" : "-";
                const amountClass =
                    transaction.type === "income"
                        ? "income-text"
                        : "expense-text";

                const iconClass =
                    transaction.type === "income"
                        ? "income-icon"
                        : "expense-icon";

                const icon =
                    transaction.type === "income"
                        ? "fa-arrow-trend-up"
                        : "fa-arrow-trend-down";

                transactionList.innerHTML += `
                    <div class="transaction-item">
                        <div class="transaction-left">
                            <div class="transaction-icon ${iconClass}">
                                <i class="fa-solid ${icon}"></i>
                            </div>

                            <div>
                                <h4>${transaction.title}</h4>
                                <span>${transaction.category} • ${formatDate(transaction.date)}</span>
                            </div>
                        </div>

                        <strong class="${amountClass}">
                            ${sign} ₹${Number(transaction.amount).toLocaleString("en-IN")}
                        </strong>
                    </div>
                `;
                visibleCount++;
            }
        });

        if (!transactionFound && transactionList) {
            transactionList.innerHTML = `
        <div class="empty-transactions">

            <i class="fa-solid fa-wallet"></i>

            <h3>No Transactions Yet</h3>

            <p>
                Click <strong>Add Transaction</strong> to start tracking your finances.
            </p>

        </div>
    `;
        }

        const totalBalance = totalIncome - totalExpense;
        const totalSavings = Math.max(totalBalance, 0);

        updateCharts(monthlyIncome, monthlyExpense, categoryTotals);

        updateSmartInsights(totalIncome, totalExpense, totalSavings, categoryTotals);

        document.getElementById("totalIncome").textContent =
            "₹" + totalIncome.toLocaleString("en-IN");

        document.getElementById("totalExpense").textContent =
            "₹" + totalExpense.toLocaleString("en-IN");

        document.getElementById("totalBalance").textContent =
            "₹" + totalBalance.toLocaleString("en-IN");

        document.getElementById("totalSavings").textContent =
            "₹" + totalSavings.toLocaleString("en-IN");

// LIVE CARD STATUS

const expensePercent =
    totalIncome > 0
        ? Math.round((totalExpense / totalIncome) * 100)
        : 0;

const savingsPercent =
    totalIncome > 0
        ? Math.round((totalSavings / totalIncome) * 100)
        : 0;

const balancePercent =
    totalIncome > 0
        ? Math.round((totalBalance / totalIncome) * 100)
        : 0;

document.getElementById("balanceStatus").innerHTML =
    `<i class="fa-solid fa-arrow-up"></i> ${balancePercent}%`;

document.getElementById("incomeStatus").innerHTML =
    `<i class="fa-solid fa-arrow-up"></i> 100%`;

document.getElementById("expenseStatus").innerHTML =
    `<i class="fa-solid fa-arrow-down"></i> ${expensePercent}%`;

document.getElementById("savingsStatus").innerHTML =
    `<i class="fa-solid fa-arrow-up"></i> ${savingsPercent}%`;

    } catch (error) {
        console.error("Load Error:", error);
    }
}

// DASHBOARD TOAST

function showDashboardToast(message, type = "success") {
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
    }, 3000);
}

// UPDATE CHARTS

function updateCharts(monthlyIncome, monthlyExpense, categoryTotals) {
    if (incomeExpenseChart) {
        incomeExpenseChart.data.datasets[0].data = monthlyIncome;
        incomeExpenseChart.data.datasets[1].data = monthlyExpense;
        incomeExpenseChart.update();
    }

    if (expenseCategoryChart) {
        expenseCategoryChart.data.datasets[0].data = [
            categoryTotals.Food,
            categoryTotals.Transport,
            categoryTotals.Shopping,
            categoryTotals.Bills,
            categoryTotals.Others
        ];
        expenseCategoryChart.update();
    }
}

// UPDATE SMART INSIGHTS

function updateSmartInsights(totalIncome, totalExpense, totalSavings, categoryTotals) {
    const savingRate =
        totalIncome > 0
            ? Math.round((totalSavings / totalIncome) * 100)
            : 0;

    const topCategory =
        Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])[0];

    document.getElementById("insightTitle1").textContent =
        savingRate >= 50 ? "Excellent Saving" : "Savings Alert";

    document.getElementById("insightText1").textContent =
        savingRate >= 50
            ? `You saved ${savingRate}% of your income. Great job!`
            : `Your saving rate is ${savingRate}%. Try to reduce expenses.`;

    document.getElementById("insightTitle2").textContent =
        topCategory[1] > 0 ? `${topCategory[0]} Spending` : "No Expense Yet";

    document.getElementById("insightText2").textContent =
        topCategory[1] > 0
            ? `${topCategory[0]} is your highest expense category at ₹${topCategory[1].toLocaleString("en-IN")}.`
            : "Add expense transactions to see spending insights.";

    document.getElementById("insightTitle3").textContent =
        totalExpense > totalIncome ? "Budget Warning" : "Smart Suggestion";

    document.getElementById("insightText3").textContent =
        totalExpense > totalIncome
            ? "Your expenses are higher than income. Review your spending."
            : "Maintain this spending pattern to build stronger savings.";
}

// FORMAT DATE

function formatDate(dateValue) {
    if (!dateValue) return "No Date";

    const date = new Date(dateValue);

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

// LOGOUT

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.href = "login.html";
        } catch (error) {
            console.error("Logout Error:", error);
            showDashboardToast("Logout failed", "error");
        }
    });
}