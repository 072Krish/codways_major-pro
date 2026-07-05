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


/* ================= GLOBAL ================= */

let currentUser = null;
let allTransactions = [];


/* ================= DOM ================= */

const menuToggle = document.getElementById("menuToggle");
const sidebar = document.querySelector(".sidebar");
const logoutBtn = document.getElementById("logoutBtn");

const userName = document.getElementById("userName");
const userAvatar = document.querySelector(".user-avatar");

/* Snapshot */
const snapshotIncome = document.getElementById("snapshotIncome");
const snapshotExpense = document.getElementById("snapshotExpense");
const snapshotSavingsRate = document.getElementById("snapshotSavingsRate");
const snapshotHealth = document.getElementById("snapshotHealth");

const incomeStatus = document.getElementById("incomeStatus");
const expenseStatus = document.getElementById("expenseStatus");
const savingStatus = document.getElementById("savingStatus");
const healthStatusText = document.getElementById("healthStatusText");

/* Recommendation */
const recommendationTitle = document.getElementById("recommendationTitle");
const recommendationText = document.getElementById("recommendationText");
const recommendationPriority = document.getElementById("recommendationPriority");

/* Analysis */
const highestCategory = document.getElementById("highestCategory");
const highestCategoryAmount = document.getElementById("highestCategoryAmount");

const frequentCategory = document.getElementById("frequentCategory");
const frequentCategoryCount = document.getElementById("frequentCategoryCount");

const largestExpenseTitle = document.getElementById("largestExpenseTitle");
const largestExpenseAmount = document.getElementById("largestExpenseAmount");

const bestSavingMonth = document.getElementById("bestSavingMonth");
const bestSavingAmount = document.getElementById("bestSavingAmount");

/* Habits */
const habitOneTitle = document.getElementById("habitOneTitle");
const habitOneText = document.getElementById("habitOneText");

const habitTwoTitle = document.getElementById("habitTwoTitle");
const habitTwoText = document.getElementById("habitTwoText");

const habitThreeTitle = document.getElementById("habitThreeTitle");
const habitThreeText = document.getElementById("habitThreeText");

const habitFourTitle = document.getElementById("habitFourTitle");
const habitFourText = document.getElementById("habitFourText");

/* Tips */
const tipTitle1 = document.getElementById("tipTitle1");
const tipText1 = document.getElementById("tipText1");

const tipTitle2 = document.getElementById("tipTitle2");
const tipText2 = document.getElementById("tipText2");

const tipTitle3 = document.getElementById("tipTitle3");
const tipText3 = document.getElementById("tipText3");

const tipTitle4 = document.getElementById("tipTitle4");
const tipText4 = document.getElementById("tipText4");

/* Overall Score */
const overallScore = document.getElementById("overallScore");
const overallStatus = document.getElementById("overallStatus");
const scoreRing = document.querySelector(".score-ring");

const insightsSkeleton = document.getElementById("insightsSkeleton");
const insightsContent = document.getElementById("insightsContent");

/* ================= SIDEBAR ================= */

menuToggle?.addEventListener("click", () => {
    sidebar.classList.toggle("active");
});


/* ================= AUTH ================= */

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = user;

    await updateUserProfile(user);
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

        if (userName) userName.textContent = name;

        if (userAvatar) {
            userAvatar.textContent = name.charAt(0).toUpperCase();
        }

    } catch (error) {
        console.error("Profile Error:", error);
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

[
    "mousemove",
    "mousedown",
    "keydown",
    "scroll",
    "touchstart"
].forEach(eventName => {
    document.addEventListener(eventName, resetAutoLogoutTimer);
});

resetAutoLogoutTimer();


/* ================= FETCH TRANSACTIONS ================= */

async function fetchTransactions() {
    try {
        insightsSkeleton.style.display = "block";
        insightsContent.style.display = "none";

        const transactionsRef = collection(
            db,
            "users",
            currentUser.uid,
            "transactions"
        );

        const snapshot = await getDocs(transactionsRef);

        allTransactions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        setTimeout(() => {
            try {
                updateInsights();
            } catch (error) {
                console.error("Update Insights Error:", error);
            }

            insightsSkeleton.style.display = "none";
            insightsContent.style.display = "block";

        }, 1800);

    } catch (error) {
        console.error("Fetch Transactions Error:", error);

        insightsSkeleton.style.display = "none";
        insightsContent.style.display = "block";
    }
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

function getTransactionTitle(transaction) {
    return (
        transaction.title ||
        transaction.name ||
        transaction.description ||
        "Transaction"
    );
}

function getTransactionDate(transaction) {
    if (transaction.date) {
        return new Date(transaction.date);
    }

    if (transaction.transactionDate) {
        return new Date(transaction.transactionDate);
    }

    if (transaction.createdAt?.toDate) {
        return transaction.createdAt.toDate();
    }

    if (transaction.createdAt) {
        return new Date(transaction.createdAt);
    }

    return new Date();
}


/* ================= CALCULATIONS ================= */

function calculateTotals(transactions) {
    let income = 0;
    let expense = 0;

    transactions.forEach(transaction => {
        const amount = getTransactionAmount(transaction);
        const type = getTransactionType(transaction);

        if (type === "income") income += amount;
        if (type === "expense") expense += amount;
    });

    return {
        income,
        expense,
        balance: income - expense
    };
}

function getCurrentMonthTransactions() {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    return allTransactions.filter(transaction => {
        const date = getTransactionDate(transaction);

        return (
            date.getMonth() === month &&
            date.getFullYear() === year
        );
    });
}

function calculateHealthScore(totals, transactions) {
    let score = 0;

    if (totals.income > 0) {
        const savingRate = (totals.balance / totals.income) * 100;
        const expenseRate = (totals.expense / totals.income) * 100;

        score =
            (Math.max(0, savingRate) * 0.65) +
            (Math.max(0, 100 - expenseRate) * 0.35);

        score += Math.min(transactions.length, 20);

        score = Math.round(Math.min(100, Math.max(0, score)));
    }

    return score;
}

function getMonthName(index) {
    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    return months[index];
}


/* ================= MAIN UPDATE ================= */

function updateInsights() {
    const transactions = getCurrentMonthTransactions();

    const data =
        transactions.length > 0
            ? transactions
            : allTransactions;

    updateSnapshotCards(data);
    updateRecommendation(data);
    updateSpendingAnalysis(data);
    updateFinancialHabits(data);
    updateMoneyTips(data);
    updateOverallScore(data);
}


/* ================= SNAPSHOT ================= */

function updateSnapshotCards(transactions) {
    const totals = calculateTotals(transactions);

    const savingRate =
        totals.income > 0
            ? Math.max(0, (totals.balance / totals.income) * 100)
            : 0;

    const score = calculateHealthScore(totals, transactions);

    snapshotIncome.textContent = formatCurrency(totals.income);
    snapshotExpense.textContent = formatCurrency(totals.expense);
    snapshotSavingsRate.textContent = `${savingRate.toFixed(1)}%`;
    snapshotHealth.textContent = `${score}%`;

    incomeStatus.textContent =
        totals.income > 0
            ? "Money received"
            : "No income recorded";

    expenseStatus.textContent =
        totals.expense <= totals.income
            ? "Within Budget"
            : "Overspending";

    savingStatus.textContent =
        savingRate >= 40
            ? "Excellent Saving"
            : savingRate >= 20
                ? "Good Saving"
                : "Needs Improvement";

    healthStatusText.textContent =
        score >= 85
            ? "Excellent"
            : score >= 70
                ? "Good"
                : score >= 50
                    ? "Average"
                    : "Needs Attention";
}


/* ================= RECOMMENDATION ENGINE ================= */

function updateRecommendation(transactions) {
    const totals = calculateTotals(transactions);

    if (transactions.length === 0) {
        recommendationTitle.textContent = "No insights available yet";
        recommendationText.textContent =
            "Add income and expense transactions to generate personalized financial recommendations.";
        recommendationPriority.textContent = "Low";
        recommendationPriority.style.color = "#94A3B8";
        return;
    }

    const savingRate =
        totals.income > 0
            ? (totals.balance / totals.income) * 100
            : 0;

    const categoryData = getExpenseCategoryTotals(transactions);
    const topCategory = categoryData[0];

    if (totals.expense > totals.income && totals.income > 0) {
        recommendationTitle.textContent = "Overspending detected";
        recommendationText.textContent =
            "Your expenses are higher than your income. Try reducing non-essential spending first.";
        recommendationPriority.textContent = "Critical";
        recommendationPriority.style.color = "#EF4444";
        return;
    }

    if (topCategory && totals.expense > 0) {
        const categoryShare =
            (topCategory.amount / totals.expense) * 100;

        if (categoryShare >= 40) {
            recommendationTitle.textContent =
                `Reduce ${topCategory.category} expenses`;

            recommendationText.textContent =
                `${categoryShare.toFixed(1)}% of your spending is on ${topCategory.category}. Reducing it can improve your monthly savings.`;

            recommendationPriority.textContent = "High";
            recommendationPriority.style.color = "#F59E0B";
            return;
        }
    }

    if (savingRate >= 40) {
        recommendationTitle.textContent = "Excellent saving habit";
        recommendationText.textContent =
            "You are saving a strong portion of your income. Keep maintaining this financial discipline.";
        recommendationPriority.textContent = "Low";
        recommendationPriority.style.color = "#22C55E";
        return;
    }

    recommendationTitle.textContent = "Improve your savings rate";
    recommendationText.textContent =
        "Try saving at least 20% of your income every month to build stronger financial stability.";
    recommendationPriority.textContent = "Medium";
    recommendationPriority.style.color = "#38BDF8";
}


/* ================= SPENDING ANALYSIS ================= */

function updateSpendingAnalysis(transactions) {
    const expenses = transactions.filter(transaction =>
        getTransactionType(transaction) === "expense"
    );

    if (expenses.length === 0) {
        highestCategory.textContent = "--";
        highestCategoryAmount.textContent = "₹0";

        frequentCategory.textContent = "--";
        frequentCategoryCount.textContent = "0 Transactions";

        largestExpenseTitle.textContent = "--";
        largestExpenseAmount.textContent = "₹0";

        bestSavingMonth.textContent = "--";
        bestSavingAmount.textContent = "₹0 Saved";
        return;
    }

    const categoryTotals = getExpenseCategoryTotals(transactions);
    const categoryCounts = getExpenseCategoryCounts(transactions);

    const topCategory = categoryTotals[0];

    highestCategory.textContent = topCategory.category;
    highestCategoryAmount.textContent = formatCurrency(topCategory.amount);

    const mostFrequent = categoryCounts[0];

    frequentCategory.textContent = mostFrequent.category;
    frequentCategoryCount.textContent =
        `${mostFrequent.count} Transactions`;

    const largestExpense = expenses.reduce((max, transaction) => {
        return getTransactionAmount(transaction) >
            getTransactionAmount(max)
            ? transaction
            : max;
    }, expenses[0]);

    largestExpenseTitle.textContent =
        getTransactionTitle(largestExpense);

    largestExpenseAmount.textContent =
        formatCurrency(getTransactionAmount(largestExpense));

    const bestMonth = getBestSavingMonthData(transactions);

    bestSavingMonth.textContent = bestMonth.month;
    bestSavingAmount.textContent =
        `${formatCurrency(bestMonth.savings)} Saved`;
}

function getExpenseCategoryTotals(transactions) {
    const totals = {};

    transactions.forEach(transaction => {
        if (getTransactionType(transaction) !== "expense") return;

        const category = getTransactionCategory(transaction);
        const amount = getTransactionAmount(transaction);

        totals[category] = (totals[category] || 0) + amount;
    });

    return Object.entries(totals)
        .map(([category, amount]) => ({
            category,
            amount
        }))
        .sort((a, b) => b.amount - a.amount);
}

function getExpenseCategoryCounts(transactions) {
    const counts = {};

    transactions.forEach(transaction => {
        if (getTransactionType(transaction) !== "expense") return;

        const category = getTransactionCategory(transaction);

        counts[category] = (counts[category] || 0) + 1;
    });

    return Object.entries(counts)
        .map(([category, count]) => ({
            category,
            count
        }))
        .sort((a, b) => b.count - a.count);
}

function getBestSavingMonthData(transactions) {
    const monthly = Array.from({ length: 12 }, (_, index) => ({
        month: getMonthName(index),
        income: 0,
        expense: 0,
        savings: 0
    }));

    transactions.forEach(transaction => {
        const date = getTransactionDate(transaction);
        const month = date.getMonth();
        const amount = getTransactionAmount(transaction);
        const type = getTransactionType(transaction);

        if (type === "income") monthly[month].income += amount;
        if (type === "expense") monthly[month].expense += amount;
    });

    monthly.forEach(item => {
        item.savings = item.income - item.expense;
    });

    const best = monthly.reduce((max, item) => {
        return item.savings > max.savings ? item : max;
    }, monthly[0]);

    return best.savings > 0
        ? best
        : {
            month: "--",
            savings: 0
        };
}


/* ================= FINANCIAL HABITS ================= */

function updateFinancialHabits(transactions) {
    const totals = calculateTotals(transactions);

    const savingRate =
        totals.income > 0
            ? (totals.balance / totals.income) * 100
            : 0;

    const score = calculateHealthScore(totals, transactions);

    if (savingRate >= 40) {
        habitOneTitle.textContent = "Excellent Saver";
        habitOneText.textContent =
            "You are saving a strong portion of your income.";
    } else {
        habitOneTitle.textContent = "Savings Builder";
        habitOneText.textContent =
            "Try increasing your savings rate step by step.";
    }

    if (totals.expense <= totals.income) {
        habitTwoTitle.textContent = "Budget Conscious";
        habitTwoText.textContent =
            "Your expenses are under control.";
    } else {
        habitTwoTitle.textContent = "High Spender";
        habitTwoText.textContent =
            "Expenses are higher than income this month.";
    }

    const incomeTransactions = transactions.filter(transaction =>
        getTransactionType(transaction) === "income"
    );

    if (incomeTransactions.length >= 2) {
        habitThreeTitle.textContent = "Consistent Earner";
        habitThreeText.textContent =
            "Income records show regular money inflow.";
    } else {
        habitThreeTitle.textContent = "Income Tracker";
        habitThreeText.textContent =
            "Add income regularly for better insights.";
    }

    if (score >= 75) {
        habitFourTitle.textContent = "Smart Planner";
        habitFourText.textContent =
            "Your financial health score is strong.";
    } else {
        habitFourTitle.textContent = "Planning Needed";
        habitFourText.textContent =
            "Review spending and set monthly saving targets.";
    }
}


/* ================= MONEY TIPS ================= */

function updateMoneyTips(transactions) {
    const totals = calculateTotals(transactions);

    const savingRate =
        totals.income > 0
            ? (totals.balance / totals.income) * 100
            : 0;

    const categoryTotals = getExpenseCategoryTotals(transactions);
    const topCategory = categoryTotals[0];

    if (topCategory) {
        tipTitle1.textContent = `Reduce ${topCategory.category}`;
        tipText1.textContent =
            `Your highest spending is in ${topCategory.category}. Try reducing it by 10% next month.`;
    }

    tipTitle2.textContent = "Set Weekly Limits";
    tipText2.textContent =
        "Divide your monthly expense budget into weekly limits to avoid overspending.";

    if (savingRate < 20) {
        tipTitle3.textContent = "Increase Savings";
        tipText3.textContent =
            "Try saving at least 20% of your income for better financial stability.";
    } else {
        tipTitle3.textContent = "Maintain Savings";
        tipText3.textContent =
            "Your savings are on track. Keep this habit consistent.";
    }

    tipTitle4.textContent = "Track Every Expense";
    tipText4.textContent =
        "Recording every transaction helps identify unnecessary spending patterns.";
}