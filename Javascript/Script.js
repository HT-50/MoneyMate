let currentUserUid = null;
let transactions = [];
let goals = [];
const STORAGE_KEYS = {
    transactions: 'moneymate_transactions_v1',
    goals: 'moneymate_goals_v1'
};
const EDIT_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>
</svg>
`;
function getScopedStorageKey(baseKey, uid = null) {
    const activeUid = uid || currentUserUid;
    return activeUid ? `${baseKey}_${activeUid}` : `${baseKey}_guest`;
}
function normalizeList(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data.filter(Boolean);
    if (typeof data === 'object') return Object.values(data).filter(Boolean);
    return [];
}
function loadFromLocalStorage(uid = null) {
    const scopedKeyTx = getScopedStorageKey(STORAGE_KEYS.transactions, uid);
    const scopedKeyGoals = getScopedStorageKey(STORAGE_KEYS.goals, uid);
    let rawTx = null;
    let rawGoals = null;
    try {
        rawTx = localStorage.getItem(scopedKeyTx);
        rawGoals = localStorage.getItem(scopedKeyGoals);
        // Fallback to shared/legacy keys if scoped keys are empty
        if (rawTx === null) rawTx = localStorage.getItem(STORAGE_KEYS.transactions);
        if (rawGoals === null) rawGoals = localStorage.getItem(STORAGE_KEYS.goals);
    } catch (err) {
        console.error('localStorage read failed:', err);
    }
    try {
        transactions = rawTx ? normalizeList(JSON.parse(rawTx)) : [];
    } catch (_) {
        transactions = [];
    }
    try {
        goals = rawGoals ? normalizeList(JSON.parse(rawGoals)) : [];
    } catch (_) {
        goals = [];
    }
    updateUI();
    updateGoalsUI();
}
function saveToLocalStorage(uid = null) {
    const activeUid = uid || currentUserUid;
    const txJson = JSON.stringify(transactions);
    const goalsJson = JSON.stringify(goals);
    try {
        localStorage.setItem(getScopedStorageKey(STORAGE_KEYS.transactions, activeUid), txJson);
        localStorage.setItem(getScopedStorageKey(STORAGE_KEYS.goals, activeUid), goalsJson);
        // Also keep shared keys updated so switching pages/states never loses recent edits
        localStorage.setItem(STORAGE_KEYS.transactions, txJson);
        localStorage.setItem(STORAGE_KEYS.goals, goalsJson);
    } catch (err) {
        console.error('localStorage save failed:', err);
    }
}
// Placeholder hooks for Firebase Realtime Database / Firestore integration next
async function pushLocalToCloud(uid = null) {
    const targetUid = uid || currentUserUid;
    if (!targetUid || typeof DB === 'undefined') return false;
    try {
        if (typeof DB.saveTransactions === 'function') {
            await Promise.resolve(DB.saveTransactions(targetUid, transactions));
        }
        if (typeof DB.saveGoals === 'function') {
            await Promise.resolve(DB.saveGoals(targetUid, goals));
        }
        return true;
    } catch (err) {
        console.warn('Cloud push skipped/failed (kept in localStorage):', err);
        return false;
    }
}
async function pullCloudToLocal(uid = null) {
    const targetUid = uid || currentUserUid;
    if (!targetUid || typeof DB === 'undefined') return false;
    return new Promise((resolve) => {
        let settled = false;
        const done = (updated) => {
            if (!settled) {
                settled = true;
                resolve(updated);
            }
        };
        try {
            let gotTx = false;
            let gotGoals = typeof DB.loadGoals !== 'function';
            const checkFinish = () => {
                if (gotTx && gotGoals) {
                    saveToLocalStorage(targetUid);
                    updateUI();
                    updateGoalsUI();
                    done(true);
                }
            };
            if (typeof DB.loadTransactions === 'function') {
                DB.loadTransactions(targetUid, (cloudTx) => {
                    const parsed = normalizeList(cloudTx);
                    if (parsed.length > 0) {
                        transactions = parsed;
                    } else if (transactions.length > 0) {
                        // Seed cloud if local already has transactions and cloud is empty
                        pushLocalToCloud(targetUid);
                    }
                    gotTx = true;
                    checkFinish();
                });
            } else {
                gotTx = true;
            }
            if (typeof DB.loadGoals === 'function') {
                DB.loadGoals(targetUid, (cloudGoals) => {
                    const parsed = normalizeList(cloudGoals);
                    if (parsed.length > 0) {
                        goals = parsed;
                    } else if (goals.length > 0) {
                        pushLocalToCloud(targetUid);
                    }
                    gotGoals = true;
                    checkFinish();
                });
            }
            checkFinish();
        } catch (err) {
            console.warn('Cloud pull skipped/failed (using localStorage):', err);
            done(false);
        }
        setTimeout(() => done(false), 1000);
    });
}
document.addEventListener("DOMContentLoaded", () => {
    loadFromLocalStorage();
    setupFormListeners();
});
function setupFormListeners() {
    const submitTxBtn = document.getElementById('submit-tx-btn');
    const typeEl = document.getElementById('tx-type');
    if (typeEl) {
        const updateTypeColor = () => {
            if (typeEl.value === 'income') {
                typeEl.style.color = '#16a34a';
            } else if (typeEl.value === 'expense') {
                typeEl.style.color = '#dc2626';
            } else {
                typeEl.style.color = '#64748b';
            }
        };
        typeEl.addEventListener('change', updateTypeColor);
        updateTypeColor();
    }
    if (submitTxBtn) {
        submitTxBtn.addEventListener('click', () => {
            const descEl = document.getElementById('tx-desc');
            const amountEl = document.getElementById('tx-amount');
            const categoryEl = document.getElementById('tx-category');
            const dateEl = document.getElementById('tx-date');
            const description = descEl ? descEl.value.trim() : '';
            const amount = amountEl ? parseFloat(amountEl.value) : NaN;
            const type = typeEl ? typeEl.value : '';
            const category = categoryEl && categoryEl.value ? categoryEl.value : 'General';
            const date = dateEl && dateEl.value ? dateEl.value : new Date().toISOString().split('T')[0];
            if (!description || !Number.isFinite(amount) || amount <= 0 || !type) {
                alert('Please enter a description, a valid amount greater than 0, and select cash flow.');
                return;
            }
            addTransaction(description, amount, type, category, date);
            if (descEl) descEl.value = '';
            if (amountEl) amountEl.value = '';
            if (typeEl) {
                typeEl.selectedIndex = 0;
                typeEl.style.color = '#64748b';
            }
            if (categoryEl) categoryEl.selectedIndex = 0;
        });
    }
    const submitGoalBtn = document.getElementById('submit-goal-btn');
    if (submitGoalBtn) {
        submitGoalBtn.addEventListener('click', () => {
            const titleEl = document.getElementById('goal-title');
            const targetEl = document.getElementById('goal-target');
            const currentEl = document.getElementById('goal-current');
            const title = titleEl ? titleEl.value.trim() : '';
            const targetAmount = targetEl ? parseFloat(targetEl.value) : NaN;
            const currentAmount = currentEl && currentEl.value !== '' ? parseFloat(currentEl.value) : 0;
            if (!title || !Number.isFinite(targetAmount) || targetAmount <= 0) {
                alert('Please enter a goal title and a valid target amount greater than 0.');
                return;
            }
            addGoal(title, targetAmount, Number.isFinite(currentAmount) ? currentAmount : 0);
            if (titleEl) titleEl.value = '';
            if (targetEl) targetEl.value = '';
            if (currentEl) currentEl.value = '';
        });
    }
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
function editTransaction(id) {
    const tx = transactions.find(item => item.id === id);
    if (!tx) return;

    const nextDesc = prompt('Edit description:', tx.description);
    if (nextDesc === null) return;
    const trimmedDesc = nextDesc.trim();
    if (!trimmedDesc) {
        alert('Description cannot be empty.');
        return;
    }

    const nextAmountRaw = prompt('Edit amount:', String(tx.amount));
    if (nextAmountRaw === null) return;
    const nextAmount = parseFloat(nextAmountRaw);
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
        alert('Please enter a valid amount greater than 0.');
        return;
    }

    const nextTypeRaw = prompt('Edit cash flow (income or expense):', tx.type);
    if (nextTypeRaw === null) return;
    const nextType = nextTypeRaw.trim().toLowerCase();
    if (nextType !== 'income' && nextType !== 'expense') {
        alert('Cash flow must be "income" or "expense".');
        return;
    }

    const nextCategoryRaw = prompt('Edit category:', tx.category || 'General');
    if (nextCategoryRaw === null) return;
    const nextCategory = nextCategoryRaw.trim() || 'General';

    const nextDateRaw = prompt('Edit date (YYYY-MM-DD):', tx.date);
    if (nextDateRaw === null) return;
    const nextDate = nextDateRaw.trim() || tx.date;

    transactions = transactions.map(item => {
        if (item.id === id) {
            return {
                ...item,
                description: trimmedDesc,
                amount: nextAmount,
                type: nextType,
                category: nextCategory,
                date: nextDate
            };
        }
        return item;
    });
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
function addSavedToGoal(id) {
    const goal = goals.find(item => item.id === id);
    if (!goal) return;
    const addAmountRaw = prompt(`How much do you want to add to "${goal.title}"?`, '10');
    if (addAmountRaw === null) return;
    const addAmount = parseFloat(addAmountRaw);
    if (!Number.isFinite(addAmount) || addAmount <= 0) {
        alert('Please enter an amount greater than 0.');
        return;
    }
    goals = goals.map(item => {
        if (item.id === id) {
            const current = Number(item.currentAmount || 0);
            return {
                ...item,
                currentAmount: current + addAmount
            };
        }
        return item;
    });
    syncData();
}
function editGoal(id) {
    const goal = goals.find(item => item.id === id);
    if (!goal) return;
    const nextTitleRaw = prompt('Edit goal title:', goal.title);
    if (nextTitleRaw === null) return;
    const nextTitle = nextTitleRaw.trim();
    if (!nextTitle) {
        alert('Goal title cannot be empty.');
        return;
    }
    const nextCurrentRaw = prompt('Edit current saved amount:', String(goal.currentAmount));
    if (nextCurrentRaw === null) return;
    const nextCurrent = parseFloat(nextCurrentRaw);
    if (!Number.isFinite(nextCurrent) || nextCurrent < 0) {
        alert('Please enter a valid saved amount (0 or greater).');
        return;
    }
    const nextTargetRaw = prompt('Edit target amount:', String(goal.targetAmount));
    if (nextTargetRaw === null) return;
    const nextTarget = parseFloat(nextTargetRaw);
    if (!Number.isFinite(nextTarget) || nextTarget <= 0) {
        alert('Please enter a valid target amount greater than 0.');
        return;
    }
    goals = goals.map(item => {
        if (item.id === id) {
            return {
                ...item,
                title: nextTitle,
                currentAmount: nextCurrent,
                targetAmount: nextTarget
            };
        }
        return item;
    });
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
    saveToLocalStorage();
    updateUI();
    updateGoalsUI();
    if (currentUserUid) {
        pushLocalToCloud(currentUserUid);
    }
}
function updateUI() {
    const totalIncome = transactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const totalExpense = transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
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
            const isIncome = tx.type === 'income';
            const amountColor = isIncome ? '#16a34a' : '#dc2626';
            const amountSign = isIncome ? '+' : '-';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${tx.date}</td>
                <td>${tx.description}</td>
                <td>${tx.category}</td>
                <td class="${isIncome ? 'income-text' : 'expense-text'}" style="color: ${amountColor}; font-weight: 600;">
                    ${amountSign}$${Number(tx.amount || 0).toFixed(2)}
                </td>
                <td>
                    <div class="action-btn-group">
                        <button type="button" class="edit-icon-btn" title="Edit Transaction" aria-label="Edit Transaction" onclick="editTransaction('${tx.id}')">${EDIT_ICON_SVG}</button>
                        <button type="button" onclick="deleteTransaction('${tx.id}')">Delete</button>
                    </div>
                </td>
            `;
            txListEl.appendChild(row);
        });
    }
}
function updateGoalsUI() {
    const goalsTableBody = document.getElementById('goals-list');
    if (goalsTableBody) {
        goalsTableBody.innerHTML = '';
        goals.forEach(goal => {
            const target = Number(goal.targetAmount || 0);
            const current = Number(goal.currentAmount || 0);
            const pct = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${goal.title}</td>
                <td>$${current.toFixed(2)}</td>
                <td>$${target.toFixed(2)}</td>
                <td>
                    <div class="goal-progress-bar-bg" style="min-width: 110px;">
                        <div class="goal-progress-bar-fill" style="width: ${pct.toFixed(1)}%;"></div>
                    </div>
                    <span style="font-size: 12px; color: #64748b;">${pct.toFixed(1)}%</span>
                </td>
                <td>
                    <div class="action-btn-group">
                        <button type="button" class="add-saved-btn" onclick="addSavedToGoal('${goal.id}')">+ Add Saved</button>
                        <button type="button" class="edit-icon-btn" title="Edit Goal" aria-label="Edit Goal" onclick="editGoal('${goal.id}')">${EDIT_ICON_SVG}</button>
                        <button type="button" onclick="deleteGoal('${goal.id}')">Delete</button>
                    </div>
                </td>
            `;
            goalsTableBody.appendChild(row);
        });
    }
    const dashboardGoalsGrid = document.getElementById('dashboard-goals-grid') || document.getElementById('goals-container') || document.querySelector('.goals-grid');
    if (dashboardGoalsGrid) {
        dashboardGoalsGrid.innerHTML = '';
        if (goals.length === 0) {
            dashboardGoalsGrid.innerHTML = `<p style="color: #64748b; font-size: 14px; grid-column: 1 / -1;">No goals added yet.</p>`;
            return;
        }
        goals.forEach(goal => {
            const target = Number(goal.targetAmount || 0);
            const current = Number(goal.currentAmount || 0);
            const pct = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;
            const card = document.createElement('div');
            card.className = 'goal-progress-card';
            card.innerHTML = `
                <div class="goal-progress-header">
                    <h3>${goal.title}</h3>
                    <span class="goal-progress-pct">${pct.toFixed(1)}%</span>
                </div>
                <div class="goal-progress-bar-bg">
                    <div class="goal-progress-bar-fill" style="width: ${pct.toFixed(1)}%;"></div>
                </div>
                <div class="goal-progress-meta">
                    <span>Saved: $${current.toFixed(2)}</span>
                    <span>Target: $${target.toFixed(2)}</span>
                </div>
            `;
            dashboardGoalsGrid.appendChild(card);
        });
    }
}