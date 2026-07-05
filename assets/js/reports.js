/* ================= FIREBASE IMPORTS ================= */

import { auth, db } from "../../firebase/firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* ================= GLOBAL VARIABLES ================= */

let currentUser = null;
let allTransactions = [];

let incomeExpenseChart = null;
let categoryChart = null;
let cashFlowChart = null;
let monthlySpendingChart = null;
let savingsChart = null;

/* ================= DOM ELEMENTS ================= */

const menuToggle = document.getElementById("menuToggle");
const sidebar = document.querySelector(".sidebar");
const logoutBtn = document.getElementById("logoutBtn");

const userName = document.getElementById("userName");
const userAvatar = document.querySelector(".user-avatar");

const monthFilter = document.getElementById("monthFilter");
const yearFilter = document.getElementById("yearFilter");
const resetReportFilters = document.getElementById("resetReportFilters");

const totalIncomeEl = document.getElementById("totalIncome");
const totalExpenseEl = document.getElementById("totalExpense");
const netBalanceEl = document.getElementById("netBalance");
const totalTransactionsEl = document.getElementById("totalTransactions");

const highestExpenseEl = document.getElementById("highestExpense");
const averageExpenseEl = document.getElementById("averageExpense");
const bestSavingMonthEl = document.getElementById("bestSavingMonth");

const topCategoriesList = document.getElementById("topCategoriesList");
const smartInsightTitle = document.getElementById("smartInsightTitle");
const smartInsightText = document.getElementById("smartInsightText");

const reportsLoader = document.getElementById("reportsLoader");
const reportsContent = document.querySelector(".reports-filter-bar").parentElement;

const reportsEmptyState = document.getElementById("reportsEmptyState");

const healthScoreEl = document.getElementById("healthScore");
const healthStatusEl = document.getElementById("healthStatus");
const healthMessageEl = document.getElementById("healthMessage");
const scoreCircle = document.querySelector(".score-circle");

const reportMenuBtn = document.getElementById("reportMenuBtn");
const reportMenu = document.getElementById("reportMenu");

/* ================= SIDEBAR TOGGLE ================= */

if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", () => {
        sidebar.classList.toggle("active");
    });
}

/* ================= FORMATTERS ================= */

function formatCurrency(amount) {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function getTransactionAmount(transaction) {
    return Number(transaction.amount || transaction.transactionAmount || 0);
}

function getTransactionType(transaction) {
    return (transaction.type || transaction.transactionType || "").toLowerCase();
}

function getTransactionCategory(transaction) {
    return transaction.category || transaction.transactionCategory || "Other";
}

function getTransactionDate(transaction) {
    if (transaction.date) {
        return new Date(transaction.date);
    }

    if (transaction.createdAt?.toDate) {
        return transaction.createdAt.toDate();
    }

    if (transaction.createdAt) {
        return new Date(transaction.createdAt);
    }
    return new Date();
}

/* ================= AUTH CHECK ================= */

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = user;

    await updateUserProfile(user);
    setLastFiveYears();
    await fetchTransactions();
});

/* ================= USER PROFILE ================= */

async function updateUserProfile(user) {
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        let name = "User";

        if (userSnap.exists()) {
            const userData = userSnap.data();
            name =
                userData.fullName ||
                userData.name ||
                userData.username ||
                "User";
        }

        if (userName) {
            userName.textContent = name;
        }

        if (userAvatar) {
            userAvatar.textContent = name.charAt(0).toUpperCase();
        }

    } catch (error) {
        console.error("User Profile Fetch Error:", error);
    }
}

/* ================= LOGOUT ================= */

logoutBtn?.addEventListener("click", async () => {
    try {
        await signOut(auth);
        window.location.href = "login.html";
    } catch (error) {
        console.error("Logout Error:", error);
    }
});

/* ================= AUTO LOGOUT ================= */

const AUTO_LOGOUT_TIME = 5 * 60 * 1000;
let autoLogoutTimer;

function logoutUserDueToInactivity() {
    signOut(auth).then(() => {
        window.location.href = "login.html";
    });
}

function resetAutoLogoutTimer() {
    clearTimeout(autoLogoutTimer);

    autoLogoutTimer = setTimeout(
        logoutUserDueToInactivity,
        AUTO_LOGOUT_TIME
    );
}

["mousemove", "mousedown", "keydown", "scroll", "touchstart"].forEach(eventName => {
    document.addEventListener(eventName, resetAutoLogoutTimer);
});

resetAutoLogoutTimer();

/* ================= YEAR FILTER ================= */

function setLastFiveYears() {
    if (!yearFilter) return;

    const currentYear = new Date().getFullYear();

    yearFilter.innerHTML = `
        <option value="all">All Years</option>
    `;

    for (let i = 0; i < 5; i++) {
        const year = currentYear - i;
        yearFilter.innerHTML += `
            <option value="${year}">${year}</option>
        `;
    }
}


/* ================= FETCH TRANSACTIONS ================= */

async function fetchTransactions() {
    try {
        reportsLoader.style.display = "block";

        document.querySelector(".reports-filter-bar").style.display = "none";
        document.querySelector(".report-cards").style.display = "none";
        document.querySelector(".charts-grid").style.display = "none";
        document.querySelector(".insights-grid").style.display = "none";
        reportsEmptyState.style.display = "none";

        const transactionsRef = collection(db, "users", currentUser.uid, "transactions");
        const snapshot = await getDocs(transactionsRef);

        allTransactions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        setTimeout(() => {
            document.body.classList.remove("reports-loading");
            reportsLoader.style.display = "none";
            document.querySelector(".reports-filter-bar").style.display = "flex";
            updateReports();
        }, 1500);

    } catch (error) {
        console.error("Fetch Transactions Error:", error);
        reportsLoader.style.display = "none";
    }
}

/* ================= FILTERS ================= */

monthFilter?.addEventListener("change", updateReports);
yearFilter?.addEventListener("change", updateReports);

resetReportFilters?.addEventListener("click", () => {
    monthFilter.value = "all";
    yearFilter.value = "all";
    updateReports();
});

function getFilteredTransactions() {
    const selectedMonth = monthFilter?.value || "all";
    const selectedYear = yearFilter?.value || "all";

    return allTransactions.filter(transaction => {
        const date = getTransactionDate(transaction);

        const monthMatch =
            selectedMonth === "all" ||
            date.getMonth() === Number(selectedMonth);

        const yearMatch =
            selectedYear === "all" ||
            date.getFullYear() === Number(selectedYear);

        return monthMatch && yearMatch;
    });
}

/* ================= MAIN UPDATE ================= */

function updateReports() {
    const transactions = getFilteredTransactions();
    const healthSection = document.querySelector(".health-section");

    if (transactions.length === 0) {
        reportsEmptyState.style.display = "block";

        document.querySelector(".report-cards").style.display = "none";
        document.querySelector(".health-section").style.display = "none";
        document.querySelector(".charts-grid").style.display = "none";
        document.querySelector(".insights-grid").style.display = "none";
        return;
    }

    reportsEmptyState.style.display = "none";

    document.querySelector(".report-cards").style.display = "grid";
    document.querySelector(".health-section").style.display = "block";
    document.querySelector(".charts-grid").style.display = "grid";
    document.querySelector(".insights-grid").style.display = "grid";

    updateSummaryCards(transactions);
    updateQuickStats(transactions);
    updateTopCategories(transactions);
    updateSmartInsight(transactions);
    updateHealthScore(transactions);

    renderIncomeExpenseChart(transactions);
    renderCategoryChart(transactions);
    renderCashFlowChart(transactions);
    renderMonthlySpendingChart(transactions);
    renderSavingsChart(transactions);
}

/* ================= CALCULATIONS ================= */

function calculateTotals(transactions) {
    let income = 0;
    let expense = 0;

    transactions.forEach(transaction => {
        const amount = getTransactionAmount(transaction);
        const type = getTransactionType(transaction);
        if (type === "income") {
            income += amount;
        }

        if (type === "expense") {
            expense += amount;
        }
    });

    return {income,expense,balance: income - expense};
}

/* ================= SUMMARY CARDS ================= */

function animateNumber(element, value, prefix = "₹") {
    let start = 0;
    const duration = 900;
    const startTime = performance.now();

    function update(currentTime) {
        const progress = Math.min(
            (currentTime - startTime) / duration,
            1
        );

        const currentValue = Math.floor(
            start + (value - start) * progress
        );

        element.textContent =
            prefix + currentValue.toLocaleString("en-IN");

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function updateSummaryCards(transactions) {
    const totals = calculateTotals(transactions);

    animateNumber(totalIncomeEl, totals.income);
    animateNumber(totalExpenseEl, totals.expense);
    animateNumber(netBalanceEl, totals.balance);
    animateNumber(totalTransactionsEl, transactions.length, "");
}

/* ================= QUICK STATS ================= */

function updateQuickStats(transactions) {
    const expenses = transactions.filter(transaction =>
        getTransactionType(transaction) === "expense"
    );

    if (expenses.length === 0) {
        highestExpenseEl.textContent = "₹0";
        averageExpenseEl.textContent = "₹0";
        bestSavingMonthEl.textContent = "-";
        return;
    }

    const expenseAmounts = expenses.map(transaction => getTransactionAmount(transaction));
    const highestExpense = Math.max(...expenseAmounts);
    const averageExpense = expenseAmounts.reduce((sum, amount) => sum + amount, 0) / expenseAmounts.length;

    highestExpenseEl.textContent = formatCurrency(highestExpense);
    averageExpenseEl.textContent = formatCurrency(Math.round(averageExpense));
    bestSavingMonthEl.textContent = getBestSavingMonth(transactions);
}

/* ================= TOP CATEGORIES ================= */

function updateTopCategories(transactions) {
    const categoryTotals = {};

    transactions.forEach(transaction => {
        if (getTransactionType(transaction) !== "expense") return;

        const category = getTransactionCategory(transaction);
        const amount = getTransactionAmount(transaction);

        categoryTotals[category] =
            (categoryTotals[category] || 0) + amount;
    });

    const sortedCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    if (sortedCategories.length === 0) {
        topCategoriesList.innerHTML = `
            <div class="category-row">
                <span>No expense data found</span>
                <strong>₹0</strong>
            </div>
        `;
        return;
    }

    topCategoriesList.innerHTML = sortedCategories.map(([category, amount]) => {
        return `
            <div class="category-row">
                <span>${category}</span>
                <strong>${formatCurrency(amount)}</strong>
            </div>
        `;
    }).join("");
}


/* ================= SMART INSIGHT ================= */

function updateSmartInsight(transactions) {
    const totals = calculateTotals(transactions);

    if (transactions.length === 0) {
        smartInsightTitle.textContent = "No data available";
        smartInsightText.textContent =
            "Add income and expense transactions to generate smart financial insights.";
        return;
    }

    if (totals.expense > totals.income) {
        smartInsightTitle.textContent = "Expenses are higher than income";
        smartInsightText.textContent =
            "Your spending is above your income. Try reducing high expense categories first.";
    } else if (totals.income > 0 && totals.expense <= totals.income * 0.5) {
        smartInsightTitle.textContent = "Great savings performance";
        smartInsightText.textContent =
            "You are spending less than half of your income. This is a strong saving pattern.";
    } else {
        smartInsightTitle.textContent = "Balanced financial activity";
        smartInsightText.textContent =
            "Your income and expenses look balanced. Keep tracking regularly for better control.";
    }
}

/* ================= MONTH HELPERS ================= */

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getMonthlyData(transactions) {
    const data = monthNames.map(month => ({month,income: 0,expense: 0,savings: 0}));

    transactions.forEach(transaction => {
        const date = getTransactionDate(transaction);
        const monthIndex = date.getMonth();
        const amount = getTransactionAmount(transaction);
        const type = getTransactionType(transaction);

        if (type === "income") {
            data[monthIndex].income += amount;
        }

        if (type === "expense") {
            data[monthIndex].expense += amount;
        }
    });

    data.forEach(item => {
        item.savings = item.income - item.expense;
    });

    return data;
}

function getBestSavingMonth(transactions) {
    const monthlyData = getMonthlyData(transactions);
    const bestMonth = monthlyData.reduce((best, current) => {
        return current.savings > best.savings ? current : best;
    }, monthlyData[0]);

    return bestMonth.savings > 0 ? bestMonth.month : "-";
}

/* ================= CHART DEFAULTS ================= */

Chart.defaults.color = "#CBD5E1";
Chart.defaults.borderColor = "rgba(255,255,255,.08)";
Chart.defaults.font.family = "Poppins";

/* ================= DESTROY CHART ================= */

function destroyChart(chart) {
    if (chart) {
        chart.destroy();
    }
}

/* ================= 1. INCOME VS EXPENSE ================= */

function renderIncomeExpenseChart(transactions) {
    const ctx = document.getElementById("incomeExpenseChart");
    if (!ctx) return;

    destroyChart(incomeExpenseChart);
    const monthlyData = getMonthlyData(transactions);

    incomeExpenseChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: monthlyData.map(item => item.month),
            datasets: [
                {
                    label: "Income",
                    data: monthlyData.map(item => item.income),
                    backgroundColor: "rgba(34,197,94,.65)",
                    borderRadius: 8,
                    barThickness: 18,
                    maxBarThickness: 22
                },
                {
                    label: "Expense",
                    data: monthlyData.map(item => item.expense),
                    backgroundColor: "rgba(239,68,68,.65)",
                    borderRadius: 8,
                    barThickness: 18,
                    maxBarThickness: 22
                }
            ]
        },
        options: getChartOptions(true)
    });
}

/* ================= 2. CATEGORY BREAKDOWN ================= */

function renderCategoryChart(transactions) {
    const ctx = document.getElementById("categoryChart");
    if (!ctx) return;

    destroyChart(categoryChart);

    const categoryTotals = {};

    transactions.forEach(transaction => {
        if (getTransactionType(transaction) !== "expense") return;

        const category = getTransactionCategory(transaction);
        const amount = getTransactionAmount(transaction);

        categoryTotals[category] =
            (categoryTotals[category] || 0) + amount;
    });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);

    categoryChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: labels.length ? labels : ["No Data"],
            datasets: [{
                data: values.length ? values : [1],
                backgroundColor: [
                    "rgba(37,99,235,.8)",
                    "rgba(34,197,94,.8)",
                    "rgba(239,68,68,.8)",
                    "rgba(168,85,247,.8)",
                    "rgba(245,158,11,.8)",
                    "rgba(14,165,233,.8)"
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%",
            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    });
}


/* ================= 3. CASH FLOW TREND ================= */

function renderCashFlowChart(transactions) {
    const ctx = document.getElementById("cashFlowChart");
    if (!ctx) return;

    destroyChart(cashFlowChart);

    const monthlyData = getMonthlyData(transactions);

    cashFlowChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: monthlyData.map(item => item.month),
            datasets: [
                {
                    label: "Income",
                    data: monthlyData.map(item => item.income),
                    borderColor: "rgba(34,197,94,1)",
                    backgroundColor: "rgba(34,197,94,.12)",
                    tension: .4,
                    fill: true
                },
                {
                    label: "Expense",
                    data: monthlyData.map(item => item.expense),
                    borderColor: "rgba(239,68,68,1)",
                    backgroundColor: "rgba(239,68,68,.12)",
                    tension: .4,
                    fill: true
                }
            ]
        },
        options: getChartOptions(true)
    });
}

/* ================= 4. MONTHLY SPENDING ================= */

function renderMonthlySpendingChart(transactions) {
    const ctx = document.getElementById("monthlySpendingChart");
    if (!ctx) return;

    destroyChart(monthlySpendingChart);

    const monthlyData = getMonthlyData(transactions);

    monthlySpendingChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: monthlyData.map(item => item.month),
            datasets: [{
                label: "Expense",
                data: monthlyData.map(item => item.expense),
                backgroundColor: "rgba(239,68,68,.75)",
                borderRadius: 12,
                borderSkipped: false
            }]
        },
        options: getChartOptions(false)
    });
}

/* ================= 5. SAVINGS PERFORMANCE ================= */

function renderSavingsChart(transactions) {
    const ctx = document.getElementById("savingsChart");
    if (!ctx) return;

    destroyChart(savingsChart);

    const monthlyData = getMonthlyData(transactions);

    savingsChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: monthlyData.map(item => item.month),
            datasets: [{
                label: "Savings",
                data: monthlyData.map(item => item.savings),
                borderColor: "rgba(56,189,248,1)",
                backgroundColor: "rgba(56,189,248,.12)",
                tension: .4,
                fill: true
            }]
        },
        options: getChartOptions(true)
    });
}

/* ================= COMMON CHART OPTIONS ================= */

function getChartOptions(showLegend = true) {
    return {
        responsive: true,
        maintainAspectRatio: false,

        animation: {
            duration: 1500,
            easing: "easeOutQuart"
        },

        interaction: {
            mode: "index",
            intersect: false
        },

        plugins: {
            legend: {
                display: showLegend,
                position: "bottom",
                labels: {
                    usePointStyle: true,
                    pointStyle: "circle",
                    padding: 18,
                    color: "#CBD5E1",
                    font: {
                        size: 12,
                        family: "Poppins"
                    }
                }
            },

            tooltip: {
                backgroundColor: "#020617",
                titleColor: "#F8FAFC",
                bodyColor: "#CBD5E1",
                borderColor: "rgba(255,255,255,.10)",
                borderWidth: 1,
                padding: 14,
                cornerRadius: 14,
                displayColors: true,

                callbacks: {
                    label: function (context) {
                        return `${context.dataset.label || "Amount"}: ${formatCurrency(context.raw)}`;
                    }
                }
            }
        },

        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: "rgba(255,255,255,.06)"
                },
                ticks: {
                    color: "#94A3B8",
                    callback: value => "₹" + value
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: "#94A3B8"
                }
            }
        }
    };
}

/* ================= FINANCIAL HEALTH SCORE ================= */

function updateHealthScore(transactions) {
    const totals = calculateTotals(transactions);

    let score = 0;

    if (totals.income > 0) {
        const savingRate = (totals.balance / totals.income) * 100;
        const expenseRate = (totals.expense / totals.income) * 100;

        score =
            (Math.max(0, savingRate) * 0.65) +
            (Math.max(0, 100 - expenseRate) * 0.35);

        score = Math.round(Math.min(100, Math.max(0, score)));
    }

    const degree = Math.round((score / 100) * 360);

    let status = "No Data";
    let message = "Add income and expense transactions to calculate your score.";
    let color = "#64748B";

    if (score >= 85) {
        status = "Excellent";
        message = "Your savings pattern is strong. Keep maintaining this discipline.";
        color = "#22C55E";
    } else if (score >= 70) {
        status = "Good";
        message = "Your finances look healthy. Try increasing your savings rate slowly.";
        color = "#38BDF8";
    } else if (score >= 55) {
        status = "Average";
        message = "You are stable, but expenses can be optimized for better savings.";
        color = "#EAB308";
    } else if (score > 0) {
        status = "Needs Attention";
        message = "Expenses are too close to income. Review your spending categories.";
        color = "#EF4444";
    }

    healthScoreEl.textContent = `${score}%`;
    healthStatusEl.textContent = status;
    healthMessageEl.textContent = message;

    scoreCircle.style.background = `
        conic-gradient(
            ${color} 0deg,
            ${color} ${degree}deg,
            rgba(255,255,255,.08) ${degree}deg
        )
    `;

    healthStatusEl.style.color = color;
}