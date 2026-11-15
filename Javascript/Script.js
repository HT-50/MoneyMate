let currentUserUid = null;
let transactions = [];
let goals = [];

document.addEventListener("DOMContentLoaded", () => {
    if (typeof DB !== 'undefined') {
        DB.initAuth(uid => {
            currentUserUid = uid;
            DB.loadTransactions(uid, data => {
                transactions = Array.isArray(data) ? data : Object.values(data);
                updateUI();
            });
            DB.loadGoals(uid, data => {
                goals = Array.isArray(data) ? data : Object.values(data);
                updateGoalsUI();
            });
        });
    } else {
        loadFromLocalStorage();
    }
});

function loadFromLocalStorage() {
    transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    goals = JSON.parse(localStorage.getItem('goals')) || [];
    updateUI();
    updateGoalsUI();
}

function saveToLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('goals', JSON.stringify(goals));
}

function addTransaction(description, amount, type, category, date) {
    const newTx = {
        id: Date.now().toString(),
        description,
        amount: parseFloat(amount),
        type,
        category: category || 'General',
        date: date || new Date().toISOString().split('T')[0]
    };
    transactions.push(newTx);
    syncData();
}

function deleteTransaction(id) {
    transactions = transactions.filter(tx => tx.id !== id);
    syncData();
}

function addGoal(title, targetAmount, currentAmount = 0) {
    const newGoal = {
        id: Date.now().toString(),
        title,
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(currentAmount)
    };
    goals.push(newGoal);
    syncData();
}

function updateGoalProgress(id, amount) {
    goals = goals.map(goal => {
        if (goal.id === id) goal.currentAmount = parseFloat(amount);
        return goal;
    });
    syncData();
}

function deleteGoal(id) {
    goals = goals.filter(goal => goal.id !== id);
    syncData();
}

function syncData() {
    if (currentUserUid && typeof DB !== 'undefined') {
        DB.saveTransactions(currentUserUid, transactions);
        DB.saveGoals(currentUserUid, goals);
    } else {
        saveToLocalStorage();
    }
    updateUI();
    updateGoalsUI();
}

function updateUI() {
    const totalIncome = transactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpense = transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
    const balance = totalIncome - totalExpense;

    const balanceEl = document.getElementById('total-balance');
    if (balanceEl) balanceEl.textContent = `$${balance.toFixed(2)}`;

    const incomeEl = document.getElementById('total-income');
    if (incomeEl) incomeEl.textContent = `$${totalIncome.toFixed(2)}`;

    const expenseEl = document.getElementById('total-expense');
    if (expenseEl) expenseEl.textContent = `$${totalExpense.toFixed(2)}`;

    const txListEl = document.getElementById('transaction-list');
    if (txListEl) {
        txListEl.innerHTML = '';
        transactions.forEach(tx => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${tx.date}</td>
                <td>${tx.description}</td>
                <td>${tx.category}</td>
                <td style="color: ${tx.type === 'income' ? 'green' : 'red'};">
                    ${tx.type === 'income' ? '+' : '-'}$${tx.amount.toFixed(2)}
                </td>
                <td><button onclick="deleteTransaction('${tx.id}')">Delete</button></td>
            `;
            txListEl.appendChild(row);
        });
    }
}

function updateGoalsUI() {
    const goalsContainer = document.getElementById('goals-container');
    if (goalsContainer) {
        goalsContainer.innerHTML = '';
        goals.forEach(goal => {
            const percentage = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100).toFixed(1);
            const goalCard = document.createElement('div');
            goalCard.className = 'goal-card';
            goalCard.innerHTML = `
                <h3>${goal.title}</h3>
                <p>Target: $${goal.targetAmount.toFixed(2)} | Current: $${goal.currentAmount.toFixed(2)}</p>
                <div style="background:#eee; width:100%; height:15px; border-radius:5px; overflow:hidden;">
                    <div style="width: ${percentage}%; background: #4f46e5; height: 100%;"></div>
                </div>
                <p>${percentage}% achieved</p>
                <button onclick="deleteGoal('${goal.id}')">Delete Goal</button>
            `;
            goalsContainer.appendChild(goalCard);
        });
    }
}