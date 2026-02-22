import { 
    getActiveMonthData, startMonth, closeMonth, 
    updateMonthGoals,
    addFixedExpense, getFixedExpenses,
    addInstallment, getInstallments,
    addVariableExpense, getVariableExpenses,
    getUserProfile, getPartnerVariableExpenses, getPartnerMonthSummary, addAuditLog, getWeekNumber,
    addSource, getSources, updateSource, deleteSource,
    getCategories, addCategory, deleteCategory,
    getPartnerAllVariableExpenses, getPartnerFixedExpenses, getPartnerInstallments,
    deleteExpense, updateExpense, getPartnerAuditLogs, getArchivedMonths
} from './firebase-services.js?v=1.1';

let currentUserId = null;
let currentProfile = null;

// Caches da aba Parcelas
let cacheSources = [];
let cacheInstallments = [];
let cacheFixed = [];
let cacheCategories = [];

// Gráficos (Para destruição ao recarregar aba)
let budgetChartInstance = null;
let categoryChartInstance = null;

// ==========================================
// 1. INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================
window.addEventListener('user-logged-in', async (e) => {
    currentUserId = e.detail.uid;
    const email = e.detail.email;
    currentProfile = await getUserProfile(currentUserId);
    
    // Atualiza nome de exibição e Tema Visual
    const rawName = currentProfile?.displayName || currentProfile?.name || email.split('@')[0];
    const displayFirst = rawName.split(' ')[0];
    
    // Switch de Tema (Requisito Fase 3)
    if(displayFirst.toLowerCase() === 'larissa') {
        document.documentElement.style.setProperty('--primary-color', '#CCA9DD');
        document.documentElement.style.setProperty('--primary-hover', '#b894c8'); // Tom um pouco mais escuro
    } else {
        // Volta para o verde padrão (Wesley/Outros)
        document.documentElement.style.setProperty('--primary-color', '#2ecc71');
        document.documentElement.style.setProperty('--primary-hover', '#27ae60');
    }

    document.getElementById('user-name-display').textContent = displayFirst;
    
    // Avatar Logic
    const avatarInitials = document.getElementById('user-avatar-initials');
    const avatarImg = document.getElementById('user-avatar-img');
    if (avatarInitials && avatarImg) {
        if (currentProfile?.photoURL) {
            avatarImg.src = currentProfile.photoURL;
            avatarImg.style.display = 'block';
            avatarInitials.style.display = 'none';
        } else {
            avatarInitials.textContent = displayFirst.charAt(0).toUpperCase();
            avatarInitials.style.display = 'block';
            avatarImg.style.display = 'none';
            avatarImg.src = '';
        }
    }
    
    // Atualiza nome do mês
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const now = new Date();
    document.getElementById('current-month-display').textContent = `Mês de ${monthNames[now.getMonth()]}`;

    // Reset de Estado Global (Garante troca limpa no modo Admin)
    cacheSources = [];
    cacheInstallments = [];
    cacheFixed = [];
    if(budgetChartInstance) budgetChartInstance.destroy();
    if(categoryChartInstance) categoryChartInstance.destroy();

    // Força navegação para Dashboard (clicando no botão invisivelmente)
    const btnHome = document.querySelector('.nav-item[data-target="dashboard"]');
    if(btnHome && !btnHome.classList.contains('active')) {
        btnHome.click();
    } else {
        await loadSources();
        await loadCategories();
        await reloadCurrentScreenData();
    }
});

// ==========================================
// CARREGAMENTO DE FONTES (CARTÕES)
// ==========================================
async function loadSources() {
    if(!currentUserId) return;
    try {
        const sources = await getSources(currentUserId);
        const sourceVar = document.getElementById('expense-source');
        const sourceInst = document.getElementById('inst-source');
        const sourceSub = document.getElementById('sub-source');
        
        let html = '<option value="" disabled selected>Selecione o Cartão/Conta...</option>';
        if(sources.length === 0) {
            html += '<option value="" disabled>Nenhuma fonte cadastrada.</option>';
        } else {
            sources.forEach(s => {
                html += `<option value="${s.id}" data-color="${s.color}">${s.name}</option>`;
            });
        }
        
        sourceVar.innerHTML = html;
        sourceInst.innerHTML = html;
        if(sourceSub) sourceSub.innerHTML = html;

        // Recuperar última fonte utilizada
        const lastSource = localStorage.getItem('A2_last_source');
        if (lastSource) {
            if (sourceVar && sourceVar.querySelector(`option[value="${lastSource}"]`)) sourceVar.value = lastSource;
            if (sourceInst && sourceInst.querySelector(`option[value="${lastSource}"]`)) sourceInst.value = lastSource;
            if (sourceSub && sourceSub.querySelector(`option[value="${lastSource}"]`)) sourceSub.value = lastSource;
        }
    } catch(err) {
        console.error("Erro ao carregar fontes: ", err);
    }
}

// ==========================================
// CARREGAMENTO DE CATEGORIAS
// ==========================================
async function loadCategories() {
    if(!currentUserId) return;
    try {
        const customCategories = await getCategories(currentUserId);
        const expenseCategory = document.getElementById('expense-category');
        const editCategory = document.getElementById('edit-category');
        
        cacheCategories = ["Lazer", "Mercado", "Transporte", "Outros", ...customCategories];
        
        let html = '';
        cacheCategories.forEach(c => {
            const name = typeof c === 'string' ? c : c.name;
            html += `<option value="${name}">${name}</option>`;
        });
        
        if (expenseCategory) expenseCategory.innerHTML = html;
        if (editCategory) editCategory.innerHTML = html;
        
        renderCategoriesManageList(customCategories);
    } catch(err) {
        console.error("Erro ao carregar categorias: ", err);
    }
}

function renderCategoriesManageList(categories) {
    const list = document.getElementById('categories-list');
    if (!list) return;
    list.innerHTML = '';
    if (categories.length === 0) {
        list.innerHTML = '<li class="empty-state">Nenhuma categoria personalizada.</li>';
        return;
    }
    categories.forEach(c => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.padding = '0.5rem 0';
        li.style.borderBottom = '1px solid #eee';
        li.innerHTML = `
            <span>${c.name}</span>
            <button type="button" class="btn-secondary btn-delete-cat" data-id="${c.id}" style="padding: 4px 8px; font-size: 0.8rem; border-color: var(--danger-color); color: var(--danger-color);">Excluir</button>
        `;
        list.appendChild(li);
    });
    
    document.querySelectorAll('.btn-delete-cat').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm('Tem certeza que deseja excluir esta categoria?')) {
                try {
                    await deleteCategory(currentUserId, id);
                    showToast('Categoria excluída!');
                    await loadCategories(); // recarrega
                } catch(err) {
                    showToast('Erro ao excluir: ' + err.message, 'error');
                }
            }
        });
    });
}

// ==========================================
// TOAST NOTIFICATION SYSTEM
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) { console.warn(message); return; }

    const icons = { success: '✅', error: '❌', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast${type !== 'success' ? ' ' + type : ''}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.prepend(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 350);
    }, 3200);
}

// ==========================================
// 2. LÓGICA DO DASHBOARD
// ==========================================
function toggleSkeleton(show) {
    const ids = [
        'available-balance', 'total-income', 'savings-goal', 'project-contribution', 
        'committed-total', 'week-spent', 'total-despesas', 'total-fixed', 
        'total-installments', 'total-variables', 'fixed-spent'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (show) el.classList.add('skeleton');
            else el.classList.remove('skeleton');
        }
    });
}

async function reloadCurrentScreenData() {
    await loadDashboardData(); 
    const activeNav = document.querySelector('.nav-item.active');
    if(activeNav) {
        const target = activeNav.getAttribute('data-target');
        if(target === 'auditoria') await loadAuditData();
        if(target === 'casal') await loadCoupleData();
        if(target === 'parcelas') await loadInstallmentsScreen();
        if(target === 'reports') await loadReportsScreen();
    }
}

async function loadDashboardData() {
    if (!currentUserId) return;
    
    toggleSkeleton(true);

    try {
        // 1. Pega dados base do Mês Ativo
        const monthData = await getActiveMonthData(currentUserId);
        
        const btnStart = document.getElementById('btn-start-month');
        const btnClose = document.getElementById('btn-close-month');
        const displayMonth = document.getElementById('current-month-display');

        if (!monthData) {
            btnStart.style.display = 'block';
            btnClose.style.display = 'none';
            displayMonth.innerHTML = '<i class="ph ph-warning-circle text-danger"></i> Configure suas estimativas de salário.';
            
            document.getElementById('total-income').textContent = formatCurrency(0);
            document.getElementById('savings-goal').textContent = formatCurrency(0);
            document.getElementById('project-contribution').textContent = formatCurrency(0);
            document.getElementById('committed-total').textContent = formatCurrency(0);
            document.getElementById('week-spent').textContent = formatCurrency(0);
            document.getElementById('available-balance').textContent = 'Inativo';
            
            document.getElementById('budget-progress').style.width = '0%';
            document.getElementById('variable-expense-list').innerHTML = '<li class="empty-state">Inicie o mês para lançar gastos.</li>';
            
            renderBudgetChart(0, 0);
            renderCategoryChart({});
            toggleSkeleton(false);
            return;
        }

        // Caso exista Mês em Andamento
        btnStart.style.display = 'block';
        btnStart.textContent = 'Editar Metas';
        btnClose.style.display = 'block';
        displayMonth.innerHTML = '<i class="ph ph-check-circle text-main"></i> Metas Configuradas';

        // Atualizar dica contextual do balance
        const income = Number(monthData.income || 0);
        const balanceHint = document.getElementById('balance-hint');
        if (balanceHint) {
            if (income === 0) {
                balanceHint.textContent = '⚠️ Configure sua renda para ativar os gráficos';
            } else {
                const today = new Date();
                today.setHours(0,0,0,0);
                
                let limitDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                let businessDays = 0;
                while (businessDays < 5) {
                    const dayOfWeek = limitDate.getDay();
                    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                        businessDays++;
                    }
                    if (businessDays < 5) {
                        limitDate.setDate(limitDate.getDate() + 1);
                    }
                }
                limitDate.setHours(0,0,0,0);
                const diffTime = limitDate - today;
                const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                balanceHint.textContent = `Pagamento em ${daysLeft} dias`;
            }
        }

        // Preenche campos do modal de Configurações se já estiverem preenchidos no Cloud Firestore
        document.getElementById('start-income').value = monthData.income || 0;
        document.getElementById('start-savings').value = monthData.savingsGoal || 0;
        document.getElementById('start-project').value = monthData.projectContribution || 0;

        // 2. Busca Todos os Gastos
        const fixos = await getFixedExpenses(currentUserId);
        const parcelas = await getInstallments(currentUserId);
        const variaveis = await getVariableExpenses(currentUserId);

        let totalCommitted = 0;
        let totalVariableMonth = 0;
        let totalVariableWeek = 0;

        let sumFixed = 0;
        let sumInstallments = 0;
        let sumVariables = 0;
        
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
        const currentWeekNumber = Math.ceil((now.getDate() + firstDay) / 7);

        // Agrupar fixos, parcelas e variáveis por fonte para exibição no dashboard
        const sourceMap = {};
        const currentMonthName = new Date().toLocaleString('pt-BR', { month: 'long' });

        fixos.forEach(f => {
            const amount = Number(f.amount);
            totalCommitted += amount;
            
            if (f.isSubscription) sumInstallments += amount;
            else sumFixed += amount;
            
            const key = f.sourceId || '__despesas_fixas__';
            const label = f.sourceName || 'Despesas Fixas';
            const meta = f.sourceId ? 'Parcelas e assinaturas' : `Despesas de ${currentMonthName}`;
            if (!sourceMap[key]) sourceMap[key] = { label, meta, total: 0, items: [] };
            sourceMap[key].total += amount;
            sourceMap[key].items.push({ name: f.name, amount });
        });

        parcelas.forEach(p => {
            const amount = Number(p.installmentAmount || p.amount || 0);
            totalCommitted += amount;
            sumInstallments += amount;
            
            const key = p.sourceId || '__despesas_fixas__';
            const label = p.sourceName || 'Despesas Fixas';
            const meta = p.sourceId ? 'Parcelas e assinaturas' : `Despesas de ${currentMonthName}`;
            if (!sourceMap[key]) sourceMap[key] = { label, meta, total: 0, items: [] };
            sourceMap[key].total += amount;
            sourceMap[key].items.push({ name: p.description || p.name, amount });
        });

        const listContainer = document.getElementById('variable-expense-list');
        listContainer.innerHTML = '';

        variaveis.forEach(v => {
            const amount = Number(v.amount);
            totalVariableMonth += amount;
            sumVariables += amount;
            
            // Variável também entra no agrupamento de fontes se tiver fonte
            if (v.sourceId) {
                const key = v.sourceId;
                const label = v.sourceName;
                const meta = 'Parcelas e assinaturas';
                if (!sourceMap[key]) sourceMap[key] = { label, meta, total: 0, items: [] };
                sourceMap[key].total += amount;
                sourceMap[key].items.push({ name: `${v.description} (Variável)`, amount });
            }
            
            // Adiciona na lista UI (Card Gastos do Mês)
            const li = document.createElement('li');
            li.style.cursor = 'pointer';
            li.innerHTML = `
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 0.5rem 0;">
                    <span><strong>${v.description}</strong> <span class="text-muted">(${v.category})</span></span>
                    <strong class="text-danger">${formatCurrency(amount)}</strong>
                </div>
            `;
            li.addEventListener('click', () => openEditModal({ ...v, type: 'variableExpenses' }));
            listContainer.appendChild(li);
        });

        const cardGastosMes = document.getElementById('card-gastos-mes');
        if (listContainer.children.length === 0) {
            listContainer.innerHTML = '<li class="empty-state text-muted">Nenhum gasto registrado.</li>';
        }

        const fixedListContainer = document.getElementById('fixed-expense-list');
        if (fixedListContainer) {
            fixedListContainer.innerHTML = '';
            const sourceEntries = Object.values(sourceMap);
            if (sourceEntries.length === 0) {
                fixedListContainer.innerHTML = '<li class="empty-state text-muted" style="padding:1rem;">Nenhuma despesa fixa ou parcela cadastrada.</li>';
            } else {
                sourceEntries
                    .sort((a, b) => b.total - a.total)
                    .forEach(({ label, meta, total, items }, idx) => {
                        const li = document.createElement('li');
                        li.className = 'expense-item';
                        li.style.flexDirection = 'column';
                        li.style.alignItems = 'stretch';
                        
                        let itemsHtml = items.map(it => `
                            <div style="display:flex; justify-content:space-between; padding: 0.4rem 0; border-bottom: 1px dashed #eee;">
                                <span style="font-size:0.85rem; color:var(--text-muted);">${it.name}</span>
                                <span style="font-size:0.85rem; color:var(--danger-color);">${formatCurrency(it.amount)}</span>
                            </div>
                        `).join('');

                        li.innerHTML = `
                            <div class="expense-item-header" onclick="this.nextElementSibling.classList.toggle('hidden'); const icon = this.querySelector('.ph-caret-down'); if(icon.style.transform==='rotate(180deg)') icon.style.transform='rotate(0deg)'; else icon.style.transform='rotate(180deg)';" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer; width:100%; padding: 0.8rem 0;">
                                <div class="expense-item-left" style="display:flex; gap:0.8rem; align-items:center;">
                                    <div class="expense-category-dot" style="background: var(--primary-dark)"></div>
                                    <div class="expense-item-info">
                                        <span class="expense-item-name">${label}</span>
                                        <span class="expense-item-meta">${meta}</span>
                                    </div>
                                </div>
                                <div style="display:flex; align-items:center; gap:0.5rem;">
                                    <span class="expense-item-amount" style="color: var(--danger-color)">${formatCurrency(total)}</span>
                                    <i class="ph ph-caret-down text-muted" style="transition:transform 0.3s;"></i>
                                </div>
                            </div>
                            <div class="expense-item-details hidden" style="margin-top:0.2rem; padding-bottom:0.8rem; padding-left:1.5rem;">
                                ${itemsHtml}
                            </div>
                        `;
                        fixedListContainer.appendChild(li);
                    });
            }
        }

        const totalAllDespesas = sumFixed + sumInstallments + sumVariables;
        const fixedSpentEl = document.getElementById('fixed-spent');
        if(fixedSpentEl) fixedSpentEl.textContent = formatCurrency(totalAllDespesas);

        // 4. Cálculos Financeiros Core do Sistema
        // Note: income already declared above for balance-hint
        const savings = Number(monthData.savingsGoal || 0);
        const project = Number(monthData.projectContribution || 0);

        // Limite Máximo de Gasto Variável no mês
        const maxVariableLimit = income - savings - project - totalCommitted;
        
        // Saldo Fictício Hoje: Quanto sobrou do limite variável
        const availableBalance = maxVariableLimit - totalVariableMonth;

        // Regra de Negócio de % barra de progresso
        let progressPercent = 0;
        if (maxVariableLimit > 0) {
            progressPercent = (totalVariableMonth / maxVariableLimit) * 100;
        } else if (totalVariableMonth > 0) {
            progressPercent = 100; // Estourou tudo se o limite base já for <= 0
        }

        // 5. Atualização de Interface
        const totalDespesasEl = document.getElementById('total-despesas');
        if (totalDespesasEl) totalDespesasEl.textContent = formatCurrency(totalAllDespesas);
        
        const tfEl = document.getElementById('total-fixed');
        if (tfEl) tfEl.textContent = formatCurrency(sumFixed);
        
        const tiEl = document.getElementById('total-installments');
        if (tiEl) tiEl.textContent = formatCurrency(sumInstallments);
        
        const tvEl = document.getElementById('total-variables');
        if (tvEl) tvEl.textContent = formatCurrency(sumVariables);

        document.getElementById('total-income').textContent = formatCurrency(income);
        document.getElementById('savings-goal').textContent = formatCurrency(savings);
        document.getElementById('project-contribution').textContent = formatCurrency(project);
        
        // Se houver committed-total no HTML atualiza, senão ignora (afinal o retiramos num refactor HTML, mas a variável existe)
        const commitEl = document.getElementById('committed-total');
        if (commitEl) commitEl.textContent = formatCurrency(totalCommitted);
        
        document.getElementById('week-spent').textContent = formatCurrency(totalVariableMonth); // Mudamos a visualização de week para month

        
        const saldoEl = document.getElementById('available-balance');
        saldoEl.textContent = formatCurrency(availableBalance);
        
        if (availableBalance < 0) {
            saldoEl.classList.remove('text-main');
            saldoEl.classList.add('text-danger');
        } else {
            saldoEl.classList.remove('text-danger');
            saldoEl.classList.add('text-main');
        }

        // Cor da barra: <=70% verde, <=100% amarelo, >100% vermelho
        const bar = document.getElementById('budget-progress');
        bar.style.width = `${Math.min(progressPercent, 100)}%`;
        if (progressPercent <= 70) {
            bar.style.backgroundColor = 'var(--primary-color)';
        } else if (progressPercent <= 100) {
            bar.style.backgroundColor = 'var(--warning-color)';
        } else {
            bar.style.backgroundColor = 'var(--danger-color)';
        }
        
        // Metas: Poupança + Projeto
        const goalsTotal = savings + project;

        // Renderiza Gráficos Nativamente no Dashboard
        renderBudgetChart(totalCommitted, totalVariableMonth, goalsTotal, availableBalance > 0 ? availableBalance : 0);
        
        const categoryMap = {};
        variaveis.forEach(v => {
            const val = Number(v.amount);
            const cat = v.category || 'Outros';
            if(!categoryMap[cat]) categoryMap[cat] = 0;
            categoryMap[cat] += val;
        });
        renderCategoryChart(categoryMap);

    } catch (error) {
        console.error("Erro ao carregar dados:", error);
    } finally {
        toggleSkeleton(false);
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// ==========================================
// Dashboard: Accordion "Despesas"
// ==========================================
window.toggleDespesasAccordion = function() {
    const detailWrap = document.getElementById('despesas-detail-wrap');
    const chevron = document.getElementById('despesas-chevron');
    const subtitle = document.getElementById('despesas-subtitle');
    if (!detailWrap) return;

    const isOpen = !detailWrap.classList.contains('hidden');
    if (isOpen) {
        detailWrap.classList.add('hidden');
        if (chevron) chevron.style.transform = 'rotate(0deg)';
        if (subtitle) subtitle.textContent = 'Clique para detalhar';
    } else {
        detailWrap.classList.remove('hidden');
        if (chevron) chevron.style.transform = 'rotate(180deg)';
        if (subtitle) subtitle.textContent = 'Clique para recolher';
    }
};

// ==========================================
// 3. LÓGICA DE MODAIS E FAB (AÇÃO)
// ==========================================

// Configurações (Mês)
document.getElementById('btn-start-month').addEventListener('click', async () => {
    try {
        const monthData = await getActiveMonthData(currentUserId);
        if (monthData) {
            document.getElementById('start-income').value = monthData.income || '';
            document.getElementById('start-savings').value = monthData.savingsGoal || '';
            document.getElementById('start-project').value = monthData.projectContribution || '';
        }
    } catch(err) {
        console.error("Erro ao pré-carregar metas:", err);
    }
    document.getElementById('modal-start-month').classList.remove('hidden');
});
document.getElementById('btn-close-month').addEventListener('click', () => {
    document.getElementById('modal-close-month').classList.remove('hidden');
});

// Ação FAB (Flutuante)
const fabMain = document.getElementById('btn-fab-main');
const fabMenu = document.getElementById('fab-menu');

fabMain.addEventListener('click', () => {
    fabMain.classList.toggle('open');
    fabMenu.classList.toggle('hidden');
});

document.querySelectorAll('.fab-menu li').forEach(li => {
    li.addEventListener('click', (e) => {
        const action = e.currentTarget.getAttribute('data-action');
        fabMain.classList.remove('open');
        fabMenu.classList.add('hidden');
        
        if (action === 'expense') document.getElementById('modal-add-expense').classList.remove('hidden');
        else if (action === 'installment') document.getElementById('modal-add-installment').classList.remove('hidden');
        else if (action === 'subscription') document.getElementById('modal-add-subscription').classList.remove('hidden');
        else if (action === 'fixed') document.getElementById('modal-add-fixed').classList.remove('hidden');
        else if (action === 'source') document.getElementById('modal-add-source').classList.remove('hidden');
    });
});

// Botões Auxiliares Fase 3 (Criar Fontes)
document.querySelectorAll('.link-new-source').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('modal-add-source').classList.remove('hidden');
    });
});

// Fechar Modais
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modalId = e.target.getAttribute('data-modal');
        document.getElementById(modalId).classList.add('hidden');
    });
});

// ==========================================
// 4. SUBMISSÕES DOS FORMULÁRIOS
// ==========================================

// Gasto Variável
const formExpense = document.getElementById('form-add-expense');
formExpense.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formExpense.querySelector('button');
    btn.disabled = true;

    try {
        const sel = document.getElementById('expense-source');
        const sourceName = sel.options[sel.selectedIndex].text;
        
        // Salva a preferência de fonte
        localStorage.setItem('A2_last_source', sel.value);

        await addVariableExpense(currentUserId, {
            description: document.getElementById('expense-desc').value,
            amount: Number(document.getElementById('expense-amount').value),
            category: document.getElementById('expense-category').value,
            sourceId: sel.value,
            sourceName: sourceName
        });
        formExpense.reset();
        document.getElementById('modal-add-expense').classList.add('hidden');
        await reloadCurrentScreenData();
    } catch(err) {
        console.error(err);
        alert("Erro ao registrar");
    } finally { btn.disabled = false; }
});

// Criar Fonte (Cartão/Conta)
const formSource = document.getElementById('form-add-source');
formSource.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formSource.querySelector('button');
    btn.disabled = true;

    try {
        await addSource(currentUserId, {
            name: document.getElementById('source-name').value,
            color: document.getElementById('source-color').value
        });
        formSource.reset();
        document.getElementById('modal-add-source').classList.add('hidden');
        await reloadCurrentScreenData();
    } catch(err) {
        console.error(err);
        alert("Erro ao criar Cartão: " + err.message);
    } finally { btn.disabled = false; }
});

// Despesa Fixa (Mês, sem Cartão)
const formFixed = document.getElementById('form-add-fixed');
if (formFixed) {
    formFixed.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = formFixed.querySelector('button');
        btn.disabled = true;

        try {
            await addFixedExpense(currentUserId, {
                name: document.getElementById('fixed-name').value,
                amount: Number(document.getElementById('fixed-amount').value),
                dueDate: Number(document.getElementById('fixed-due').value),
                paid: false
            });
            document.getElementById('modal-add-fixed').classList.add('hidden');
            formFixed.reset();
            await reloadCurrentScreenData();
        } catch(err) {
            console.error(err);
            alert("Erro ao registrar Fixa: " + err.message);
        } finally { btn.disabled = false; }
    });
}

// Despesa Fixa C/ Cartão (Assinatura)
const formSub = document.getElementById('form-add-subscription');
if (formSub) {
    formSub.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = formSub.querySelector('button');
        btn.disabled = true;

        try {
            const sel = document.getElementById('sub-source');
            const sourceName = sel.options[sel.selectedIndex].text;
            
            // Salva a preferência de fonte
            localStorage.setItem('A2_last_source', sel.value);

            await addFixedExpense(currentUserId, {
                name: document.getElementById('sub-name').value,
                amount: Number(document.getElementById('sub-amount').value),
                dueDate: Number(document.getElementById('sub-due').value),
                sourceId: sel.value,
                sourceName: sourceName,
                isSubscription: true,
                paid: false
            });
            document.getElementById('modal-add-subscription').classList.add('hidden');
            formSub.reset();
            await reloadCurrentScreenData();
        } catch(err) {
            console.error(err);
            alert("Erro ao registrar Assinatura: " + err.message);
        } finally { btn.disabled = false; }
    });
}

// Parcela
const formInstallment = document.getElementById('form-add-installment');
formInstallment.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formInstallment.querySelector('button');
    btn.disabled = true;

    try {
        const sel = document.getElementById('inst-source');
        const sourceName = sel.options[sel.selectedIndex].text;
        
        // Salva a preferência de fonte
        localStorage.setItem('A2_last_source', sel.value);

        await addInstallment(currentUserId, {
            name: document.getElementById('inst-name').value,
            totalAmount: Number(document.getElementById('inst-totalAmount').value) || 0,
            installmentAmount: Number(document.getElementById('inst-amount').value), // Mapeando para as queries do app
            remainingInstallments: Number(document.getElementById('inst-remaining').value),
            sourceId: sel.value,
            sourceName: sourceName
        });
        formInstallment.reset();
        document.getElementById('modal-add-installment').classList.add('hidden');
        await reloadCurrentScreenData();
    } catch(err) {
        console.error(err);
        alert("Erro ao registrar");
    } finally { btn.disabled = false; }
});

// Abertura de Mês
const formStart = document.getElementById('form-start-month');
if (formStart) {
    formStart.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = formStart.querySelector('button');
        btn.disabled = true;

        try {
            await startMonth(currentUserId, {
                income: Number(document.getElementById('start-income').value),
                savingsGoal: Number(document.getElementById('start-savings').value),
                projectContribution: Number(document.getElementById('start-project').value)
            });
            document.getElementById('modal-start-month').classList.add('hidden');
            formStart.reset();
            await reloadCurrentScreenData();
        } catch(err) {
            console.error(err);
            alert("Erro ao registrar Parcela: " + err.message);
        } finally { btn.disabled = false; }
    });
}

// Fechamento de Mês
const formClose = document.getElementById('form-close-month');
if(formClose) {
    formClose.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = formClose.querySelector('button');
        btn.disabled = true;

        try {
            await closeMonth(currentUserId, {
                actualIncome: Number(document.getElementById('close-income').value),
                actualSavings: Number(document.getElementById('close-savings').value),
                actualProject: Number(document.getElementById('close-project').value)
            }, currentProfile ? currentProfile.partnerId : null);
            document.getElementById('modal-close-month').classList.add('hidden');
            formClose.reset();
            await loadDashboardData();
            alert("Ciclo Mensal arquivado com sucesso. Você não tem mais um mês ativo, planeje o próximo!");
        } catch(err) {
            console.error(err);
            alert("Erro ao fechar mês");
        } finally { btn.disabled = false; }
    });
}

// ==========================================
// MÓDULO DE EDIÇÃO E EXCLUSÃO (CRUD)
// ==========================================
async function openEditModal(item) {
    // Populando fontes atualizadas no Edit
    const sourceEdit = document.getElementById('edit-source');
    try {
        const sources = await getSources(currentUserId);
        let html = '<option value="" disabled selected>Selecione...</option>';
        sources.forEach(s => {
            html += `<option value="${s.id}" ${item.sourceId === s.id ? 'selected' : ''}>${s.name}</option>`;
        });
        sourceEdit.innerHTML = html;
    } catch(e) { console.error(e); }

    // Preenchendo campos base
    document.getElementById('edit-id').value = item.id;
    document.getElementById('edit-type').value = item.type; // fixedExpenses, installments, variableExpenses
    
    document.getElementById('edit-name').value = item.name || item.description || '';
    document.getElementById('edit-amount').value = item.amount || item.installmentAmount || '';

    // Lógica por tipo
    const grpSource = document.getElementById('edit-source-group');
    const grpCat = document.getElementById('edit-category-group');
    const grpInst = document.getElementById('edit-installments-group');

    grpSource.style.display = 'none';
    grpCat.style.display = 'none';
    grpInst.style.display = 'none';

    if (item.type === 'variableExpenses') {
        grpSource.style.display = 'block';
        grpCat.style.display = 'block';
        if(item.category) document.getElementById('edit-category').value = item.category;
    } else if (item.type === 'fixedExpenses') {
        if(item.isSubscription) grpSource.style.display = 'block';
    } else if (item.type === 'installments') {
        grpSource.style.display = 'block';
        grpInst.style.display = 'block';
        document.getElementById('edit-remaining').value = item.remainingInstallments || '';
    }

    document.getElementById('modal-edit-expense').classList.remove('hidden');
}

// Handle Update
const formEdit = document.getElementById('form-edit-expense');
if(formEdit) {
    formEdit.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = formEdit.querySelector('button[type="submit"]');
        btn.disabled = true;

        try {
            const id = document.getElementById('edit-id').value;
            const type = document.getElementById('edit-type').value; // Collection Name
            
            const newData = {};
            const valName = document.getElementById('edit-name').value;
            const valAmount = Number(document.getElementById('edit-amount').value);
            
            // Tratamento especial dependendo da collection
            if (type === 'variableExpenses') {
                newData.description = valName;
                newData.amount = valAmount;
                newData.category = document.getElementById('edit-category').value;
                newData.sourceId = document.getElementById('edit-source').value;
                const selSrc = document.getElementById('edit-source');
                if (selSrc.selectedIndex > 0) newData.sourceName = selSrc.options[selSrc.selectedIndex].text;
            } else if (type === 'installments') {
                newData.name = valName;
                newData.installmentAmount = valAmount;
                newData.remainingInstallments = Number(document.getElementById('edit-remaining').value);
                newData.sourceId = document.getElementById('edit-source').value;
                const selSrc = document.getElementById('edit-source');
                if (selSrc.selectedIndex > 0) newData.sourceName = selSrc.options[selSrc.selectedIndex].text;
            } else if (type === 'fixedExpenses') {
                newData.name = valName;
                newData.amount = valAmount;
                const sourceId = document.getElementById('edit-source').value;
                if(sourceId) {
                    const selSrc = document.getElementById('edit-source');
                    newData.sourceId = sourceId;
                    newData.sourceName = selSrc.options[selSrc.selectedIndex].text;
                }
            }

            await updateExpense(currentUserId, id, type, newData);
            document.getElementById('modal-edit-expense').classList.add('hidden');
            await reloadCurrentScreenData();
        } catch(err) {
            console.error(err);
            alert("Erro ao atualizar!");
        } finally { btn.disabled = false; }
    });
}

// Handle Delete
const btnDelete = document.getElementById('btn-delete-expense');
if(btnDelete) {
    btnDelete.addEventListener('click', async () => {
        if(!confirm("Atenção: Você tem certeza que deseja excluir esta despesa?")) return;
        
        btnDelete.disabled = true;
        try {
            const id = document.getElementById('edit-id').value;
            const type = document.getElementById('edit-type').value;
            await deleteExpense(currentUserId, id, type);
            
            document.getElementById('modal-edit-expense').classList.add('hidden');
            await reloadCurrentScreenData();
        } catch (err) {
            console.error(err);
            alert("Erro ao remover despesa!");
        } finally { btnDelete.disabled = false; }
    });
}

// ==========================================
// 5. NAVEGAÇÃO BOTTOM NAV E TELAS FASE 2 & FASE 3
// ==========================================
const navItems = document.querySelectorAll('.nav-item');
const appContents = {
    'dashboard': document.getElementById('dashboard-screen-content'),
    'auditoria': document.getElementById('audit-screen-content'),
    'casal': document.getElementById('couple-screen-content'),
    'parcelas': document.getElementById('installments-screen-content'),
    'reports': document.getElementById('reports-screen-content')
};

navItems.forEach(item => {
    item.addEventListener('click', async () => {
        // Ignora botão central (+) que é fab-btn
        if(item.classList.contains('fab-btn')) return;

        // Reset Ativo
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        const target = item.getAttribute('data-target');

        // Esconde todas as telas
        Object.values(appContents).forEach(el => {
            if(el) el.classList.add('hidden');
        });

        // Modifica Título no Cabeçalho
        const headerTitle = document.getElementById('header-title');
        const headerExtras = document.getElementById('dashboard-header-extras');
        const btnLogout = document.getElementById('btn-logout');

        // Mostra a selecionada
        if(appContents[target]) {
            appContents[target].classList.remove('hidden');
            
            // Controle de visibilidade do Header
            if(target === 'dashboard') {
                if(headerExtras) headerExtras.style.display = 'block';
                if(btnLogout) btnLogout.style.display = 'block';
                const name = currentProfile ? currentProfile.name.split(' ')[0] : 'Usuário';
                headerTitle.innerHTML = `Olá, <span id="user-name-display">${name}</span>`;
            } else {
                if(headerExtras) headerExtras.style.display = 'none';
                if(btnLogout) btnLogout.style.display = 'none';
                
                if(target === 'auditoria') {
                    headerTitle.innerHTML = 'Auditar Fechamento';
                    await loadAuditData();
                } else if(target === 'casal') {
                    headerTitle.innerHTML = 'Visão do Casal';
                    await loadCoupleData();
                } else if(target === 'parcelas') {
                    headerTitle.innerHTML = 'Meus Cartões';
                    await loadInstallmentsScreen();
                } else if(target === 'reports') {
                    headerTitle.innerHTML = 'Relatórios / Metas';
                    await loadReportsScreen();
                }
            }
        }
    });
});

async function loadAuditData() {
    if(!currentProfile || !currentProfile.partnerId) {
        document.getElementById('audit-expense-list').innerHTML = '<li class="empty-state text-muted">Parceiro não configurado no perfil.</li>';
        return;
    }

    try {
        document.getElementById('audit-partner-name').textContent = "Parceiro(a)"; // Ideal seria buscar o nome
        
        // 1. Preencher Resumo Consolidado do Parceiro (Fixo no Topo)
        const pSummary = await getPartnerMonthSummary(currentProfile.partnerId);
        if(pSummary) {
            const pIncome = Number(pSummary.income || 0);
            const pSavings = Number(pSummary.savingsGoal || 0);
            const pProject = Number(pSummary.projectContribution || 0);
            
            const pFixed = await getPartnerFixedExpenses(currentProfile.partnerId);
            const pInstal = await getPartnerInstallments(currentProfile.partnerId);
            const pVars = await getPartnerAllVariableExpenses(currentProfile.partnerId);

            let pCommitted = 0;
            pFixed.forEach(f => pCommitted += Number(f.amount));
            pInstal.forEach(p => pCommitted += Number(p.installmentAmount || 0));
            
            let pVariableSpent = 0;
            pVars.forEach(v => pVariableSpent += Number(v.amount));

            let pAvailable = pIncome - pSavings - pProject - pCommitted - pVariableSpent;

            document.getElementById('audit-partner-income').textContent = formatCurrency(pIncome);
            document.getElementById('audit-partner-fixed').textContent = formatCurrency(pCommitted);
            document.getElementById('audit-partner-variable').textContent = formatCurrency(pVariableSpent);
            document.getElementById('audit-partner-available').textContent = formatCurrency(pAvailable >= 0 ? pAvailable : 0);

            // Vinculando o click do Card para abrir Visão Completa do parceiro
            const summaryCard = document.getElementById('card-audit-partner-summary');
            if (summaryCard) {
                summaryCard.onclick = () => openPartnerDetailsModal(pFixed, pInstal, pVars);
            }
        }

        // 2. Montar Linha do Tempo da Semana
        const currentWeek = getWeekNumber();
        const expenses = await getPartnerVariableExpenses(currentProfile.partnerId, currentWeek);
        const logs = await getPartnerAuditLogs(currentProfile.partnerId);
        
        const listContainer = document.getElementById('audit-expense-list');
        listContainer.innerHTML = '';

        // Mesclar TUDO em uma Timeline ordenando por data decrescente
        const timeline = [];
        expenses.forEach(e => timeline.push({ ...e, itemType: 'expense' }));
        logs.forEach(l => timeline.push({ ...l, itemType: 'audit' }));

        timeline.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
        });

        if(timeline.length === 0) {
            listContainer.innerHTML = '<li class="empty-state text-muted">Nenhuma atividade recente do parceiro.</li>';
            return;
        }

        timeline.forEach(item => {
            const li = document.createElement('li');
            
            if (item.itemType === 'audit') {
                // Evento de Auditoria / Ações Gerais
                const isClosure = item.type === 'month_closure';
                li.innerHTML = `
                    <div style="background: ${isClosure ? 'rgba(46, 204, 113, 0.1)' : 'var(--bg-card)'}; border: 1px solid ${isClosure ? 'var(--primary-color)' : '#eee'}; border-radius: 8px; padding: 0.8rem; margin-bottom: 0.5rem;">
                        <div style="display: flex; align-items:center; gap: 8px; margin-bottom: 4px;">
                            ${isClosure ? '<i class="ph ph-check-circle text-main" style="font-size:1.2rem;"></i> <strong class="text-main">Fechamento de Mês</strong>' : '<i class="ph ph-info text-muted"></i> <strong>Nota de Auditoria</strong>'}
                        </div>
                        <p style="margin:0; font-size: 0.85rem;" class="text-muted">${item.notes}</p>
                    </div>
                `;
            } else {
                // Despesa Variável
                li.innerHTML = `
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 0.5rem 0; align-items:center;">
                        <div>
                            <strong>${item.description}</strong> <span class="text-muted">(${item.category})</span>
                            <br><small class="text-muted">${item.approved ? '✅ Auditado' : '⏳ Pendente'}</small>
                        </div>
                        <div style="text-align: right;">
                            <strong class="text-danger" style="display:block;">${formatCurrency(item.amount)}</strong>
                            ${!item.approved ? `<button class="btn-secondary btn-audit" data-id="${item.id}" style="font-size:0.7rem; padding: 0.2rem 0.5rem; margin-top:0.2rem;">Auditar</button>` : ''}
                        </div>
                    </div>
                `;
            }
            listContainer.appendChild(li);
        });

        // Adicionar eventos dinâmicos aos botões de auditar (Mock para futuro Modal)
        document.querySelectorAll('.btn-audit').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const note = prompt("Insira uma observação para este gasto:");
                if (note !== null) {
                    await addAuditLog(currentProfile.partnerId, note);
                    alert("Nota salva na timeline!");
                    await loadAuditData(); // Recarrega
                }
            });
        });

        // 3. Carregar Meus Relatórios Arquivados
        const archivedList = document.getElementById('archived-reports-list');
        archivedList.innerHTML = '';
        
        try {
            const myArchived = await getArchivedMonths(currentUserId);
            if (myArchived.length === 0) {
                archivedList.innerHTML = '<li class="empty-state text-muted">Ainda não há ciclos financeiros encerrados.</li>';
            } else {
                myArchived.forEach(m => {
                    const li = document.createElement('li');
                    
                    // Formatar data
                    let dateStr = 'Data Desconhecida';
                    if (m.closedAt && m.closedAt.seconds) {
                        const d = new Date(m.closedAt.seconds * 1000);
                        dateStr = d.toLocaleDateString('pt-BR');
                    }
                    
                    li.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items:center; border-bottom: 1px solid #eee; padding: 0.5rem 0;">
                            <div>
                                <strong>Mês Fechado</strong>
                                <br><small class="text-muted">Encerrado em: ${dateStr}</small>
                            </div>
                            <button class="btn-secondary" onclick='openArchivedReportModal(${JSON.stringify(m)})'>Ver Relatório</button>
                        </div>
                    `;
                    archivedList.appendChild(li);
                });
            }
        } catch(e) {
            console.error("Erro ao puxar arquivos", e);
            archivedList.innerHTML = '<li class="empty-state text-muted text-danger">Erro ao carregar relatórios.</li>';
        }

    } catch (err) {
        console.error("Erro ao carregar auditoria", err);
    }
}

// ==========================================
// MÓDULO VISÃO COMPLETA PARCEIRO (READ-ONLY)
// ==========================================
function openPartnerDetailsModal(fixed, installments, variables) {
    const listFixed = document.getElementById('partner-fixed-list');
    const listInstal = document.getElementById('partner-installments-list');
    const listVars = document.getElementById('partner-variables-list');

    listFixed.innerHTML = '';
    listInstal.innerHTML = '';
    listVars.innerHTML = '';

    if (fixed.length === 0) {
        listFixed.innerHTML = '<li class="empty-state text-muted">Sem despesas fixas.</li>';
    } else {
        fixed.forEach(f => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 0.5rem 0;">
                    <span><strong>${f.name}</strong> <span class="text-muted">(${f.isSubscription ? 'Assinatura' : 'Fixo'}) ${f.sourceName ? ` - ${f.sourceName}` : ''}</span></span>
                    <strong class="text-danger">${formatCurrency(f.amount)}</strong>
                </div>
            `;
            listFixed.appendChild(li);
        });
    }

    if (installments.length === 0) {
        listInstal.innerHTML = '<li class="empty-state text-muted">Sem parcelas ativas.</li>';
    } else {
        installments.forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 0.5rem 0;">
                    <span><strong>${p.name || p.description}</strong> <span class="text-muted">(Parcela ${p.remainingInstallments}x) ${p.sourceName ? ` - ${p.sourceName}` : ''}</span></span>
                    <strong class="text-danger">${formatCurrency(p.installmentAmount || p.amount)}</strong>
                </div>
            `;
            listInstal.appendChild(li);
        });
    }

    if (variables.length === 0) {
        listVars.innerHTML = '<li class="empty-state text-muted">Sem gastos registrados.</li>';
    } else {
        variables.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).forEach(v => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 0.5rem 0;">
                    <span><strong>${v.description}</strong> <span class="text-muted">(${v.category}) Semana ${v.weekNumber || ''}</span></span>
                    <strong class="text-danger">${formatCurrency(v.amount)}</strong>
                </div>
            `;
            listVars.appendChild(li);
        });
    }

    document.getElementById('modal-partner-details').classList.remove('hidden');
}

// ==========================================
// MÓDULO RELATÓRIOS ARQUIVADOS
// ==========================================
window.openArchivedReportModal = function(m) {
    document.getElementById('rep-est-income').textContent = formatCurrency(m.income || 0);
    document.getElementById('rep-act-income').textContent = formatCurrency(m.actualIncome || 0);
    
    document.getElementById('rep-est-savings').textContent = formatCurrency(m.savingsGoal || 0);
    document.getElementById('rep-act-savings').textContent = formatCurrency(m.actualSavings || 0);
    
    document.getElementById('rep-est-project').textContent = formatCurrency(m.projectContribution || 0);
    document.getElementById('rep-act-project').textContent = formatCurrency(m.actualProject || 0);
    
    document.getElementById('modal-archived-report').classList.remove('hidden');
};

async function loadCoupleData() {
    if(!currentProfile || !currentProfile.partnerId) {
        document.getElementById('couple-total-income').textContent = "Parceiro n/a";
        return;
    }

    try {
        const myData = await getActiveMonthData(currentUserId);
        const partnerData = await getPartnerMonthSummary(currentProfile.partnerId);

        if(!partnerData) {
            document.getElementById('couple-total-income').textContent = "Aguardando Parceiro";
            return;
        }

        const myIncome = Number(myData.income || 0);
        const partnerIncome = Number(partnerData.income || 0);
        const myProject = Number(myData.projectContribution || 0);
        const partnerProject = Number(partnerData.projectContribution || 0);

        const totalIncome = myIncome + partnerIncome;
        const totalSaved = myProject + partnerProject;

        document.getElementById('couple-total-income').textContent = formatCurrency(totalIncome);
        document.getElementById('couple-my-project').textContent = formatCurrency(myProject);
        document.getElementById('couple-partner-project').textContent = formatCurrency(partnerProject);
        document.getElementById('couple-total-saved').textContent = formatCurrency(totalSaved);

        // Preenchimento do Resumo do Parceiro
        document.getElementById('casal-partner-income').textContent = formatCurrency(partnerIncome);

        // Buscar dados granulares do parceiro
        const pFixed = await getPartnerFixedExpenses(currentProfile.partnerId);
        const pVars = await getPartnerAllVariableExpenses(currentProfile.partnerId);
        
        // As parcelas
        const parInstal = await getPartnerInstallments(currentProfile.partnerId);

        let pCommitted = 0;
        pFixed.forEach(f => pCommitted += Number(f.amount));
        parInstal.forEach(p => pCommitted += Number(p.installmentAmount || 0));
        
        let pVariableSpent = 0;
        pVars.forEach(v => pVariableSpent += Number(v.amount));

        const partnerSavings = Number(partnerData.savingsGoal || 0);
        
        // Pior cenário: (Renda) - (Metas de poupança + Comprimetidos + Gasto no Mês)
        let pAvailable = partnerIncome - partnerSavings - partnerProject - pCommitted - pVariableSpent;
        
        document.getElementById('casal-partner-fixed').textContent = formatCurrency(pCommitted);
        document.getElementById('casal-partner-variable').textContent = formatCurrency(pVariableSpent);
        document.getElementById('casal-partner-available').textContent = formatCurrency(pAvailable >= 0 ? pAvailable : 0);

    } catch (err) {
        console.error("Erro ao carregar dados do casal", err);
    }
}

// ==========================================
// 6. TELA DE PARCELAS E CARTÕES (FASE 3)
// ==========================================

async function loadInstallmentsScreen() {
    if(!currentUserId) return;

    try {
        cacheSources = await getSources(currentUserId);
        cacheInstallments = await getInstallments(currentUserId);
        cacheFixed = await getFixedExpenses(currentUserId);
        
        const monthData = await getActiveMonthData(currentUserId);
        if(monthData) {
            window.cacheVariables = await getVariableExpenses(currentUserId, monthData.id);
        } else {
            window.cacheVariables = [];
        }
        
        // Carrega preferências armazenadas
        const vToggle = document.getElementById('toggle-matrix-variables');
        if (vToggle) {
            const savedV = localStorage.getItem('A2_matrix_vars');
            if (savedV !== null) vToggle.checked = (savedV === 'true');
            vToggle.onchange = function() {
                localStorage.setItem('A2_matrix_vars', this.checked);
                renderSourcesCarousel();
                selectSource(window._currentSelectedSourceId);
            };
        }
        
        const iToggle = document.getElementById('toggle-matrix-installments');
        if (iToggle) {
            const savedI = localStorage.getItem('A2_matrix_insts');
            if (savedI !== null) iToggle.checked = (savedI === 'true');
            iToggle.onchange = function() {
                localStorage.setItem('A2_matrix_insts', this.checked);
                renderSourcesCarousel();
                selectSource(window._currentSelectedSourceId);
            };
        }
        
        setupCarouselScrollSpy();
        renderSourcesCarousel();
        
        // Simula click no cartão 'Visão Geral' por padrão
        window.selectSource('all');
    } catch(err) {
        console.error("Erro ao carregar tela de parcelas:", err);
    }
}

function renderSourcesCarousel() {
    const container = document.getElementById('sources-carousel');
    
    // Inicia com o Cartão Geral
    let html = `
        <div class="credit-card" data-source-id="all" style="background: linear-gradient(135deg, #333, #000);" onclick="selectSource('all')">
            <div class="card-name">Visão Geral</div>
            <div class="card-chip"></div>
            <div class="card-balance">Resumo</div>
            <div class="card-footer">Todas as Fontes</div>
        </div>
    `;

    const includeVars = document.getElementById('toggle-matrix-variables')?.checked !== false; // default true if missing
    const includeInst = document.getElementById('toggle-matrix-installments')?.checked !== false;

    cacheSources.forEach(source => {
        // Calcula quanto esse cartão acumula neste mês
        let monthTotal = 0;
        cacheInstallments.forEach(p => {
            if(includeInst && p.sourceId === source.id && p.remainingInstallments > 0) monthTotal += Number(p.installmentAmount);
        });
        cacheFixed.forEach(f => {
            if(f.sourceId === source.id) {
                if (f.isSubscription && !includeInst) return;
                monthTotal += Number(f.amount);
            }
        });
        if(includeVars && window.cacheVariables) {
            window.cacheVariables.forEach(v => {
                if(v.sourceId === source.id) monthTotal += Number(v.amount);
            });
        }

        html += `
            <div class="credit-card" data-source-id="${source.id}" style="background: linear-gradient(135deg, ${source.color}, #555); position:relative;" onclick="selectSource('${source.id}')">
                <div class="card-name">${source.name}</div>
                <button class="btn-edit-source" onclick="event.stopPropagation(); window.openEditSourceModal('${source.id}')" style="position:absolute; top:12px; right:12px; background:rgba(0,0,0,0.3); border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; border:none; color:#fff; cursor:pointer; transition:background 0.2s;"><i class="ph ph-gear" style="font-size:1.1rem;"></i></button>
                <div class="card-chip"></div>
                <div class="card-balance">${formatCurrency(monthTotal)}</div>
                <div class="card-footer">Fatura Prevista</div>
            </div>
        `;
    });

    container.innerHTML = html;
    if(typeof rebindDragEvents === 'function') rebindDragEvents();
}

// Current sort key for the installments list
let _matrixSortKey = 'source';
let _matrixSortDir = 'asc';
window._currentSelectedSourceId = 'all';

// O HTML usa onclick="selectSource(...)", por isso precisamos expor no window
window.selectSource = function(sourceId) {
    window._currentSelectedSourceId = sourceId;
    const titleEl = document.getElementById('inst-table-title');

    let sourceName = 'Todos';
    if (sourceId !== 'all') {
        const found = cacheSources.find(s => s.id === sourceId);
        if (found) sourceName = found.name;
    }
    titleEl.textContent = `${sourceName}`;

    // Highlight carousel
    document.querySelectorAll('.credit-card').forEach(cc => cc.style.transform = 'scale(0.95)');
    const selCard = document.querySelector(`.credit-card[data-source-id="${sourceId}"]`);
    if (selCard) selCard.style.transform = 'scale(1)';

    // Scroll automatically if not user scroll
    if (!window._isProgrammaticScroll && selCard) {
        window._isProgrammaticScroll = true;
        selCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        setTimeout(() => { window._isProgrammaticScroll = false; }, 600);
    }

    // Filtrar
    const filteredInst = sourceId === 'all'
        ? cacheInstallments
        : cacheInstallments.filter(p => p.sourceId === sourceId);

    const filteredFixed = (sourceId === 'all'
        ? cacheFixed
        : cacheFixed.filter(f => f.sourceId === sourceId)
    ).filter(f => f.sourceId || sourceId !== 'all');

    const includeVars = document.getElementById('toggle-matrix-variables')?.checked !== false; // default true
    const includeInst = document.getElementById('toggle-matrix-installments')?.checked !== false; // default true

    // Junta numa lista
    const allItems = [];
    if (includeInst) {
        filteredInst.forEach(p => allItems.push({ type: 'installments', ...p }));
    }
    
    filteredFixed.forEach(f => {
        if (sourceId === 'all' && !f.sourceId) return;
        if (f.isSubscription && !includeInst) return;
        allItems.push({ type: 'fixedExpenses', ...f });
    });

    if (includeVars && window.cacheVariables) {
        let varsToInclude = window.cacheVariables.filter(v => v.sourceId);
        if (sourceId !== 'all') {
            varsToInclude = varsToInclude.filter(v => v.sourceId === sourceId);
        }
        varsToInclude.forEach(v => allItems.push({ type: 'variableExpenses', ...v }));
    }

    // Store globally for the months modal
    window._currentMatrixItems = allItems;

    renderMatrixList(allItems);
};

function renderMatrixList(items) {
    const listEl = document.getElementById('matrix-list');
    if (!listEl) return;

    // Sort
    const sorted = [...items];
    const sign = _matrixSortDir === 'asc' ? 1 : -1;
    
    if (_matrixSortKey === 'name') {
        sorted.sort((a, b) => sign * (a.description || a.name || '').localeCompare(b.description || b.name || ''));
    } else if (_matrixSortKey === 'price') {
        sorted.sort((a, b) => sign * (Number(a.installmentAmount || a.amount || 0) - Number(b.installmentAmount || b.amount || 0)));
    } else if (_matrixSortKey === 'installments') {
        sorted.sort((a, b) => {
            const remA = a.type === 'installments' ? (a.remainingInstallments || 0) : 0;
            const remB = b.type === 'installments' ? (b.remainingInstallments || 0) : 0;
            return sign * (remA - remB);
        });
    } else {
        // source A-Z then name
        sorted.sort((a, b) => {
            const sa = a.sourceName || 'ZZZ';
            const sb = b.sourceName || 'ZZZ';
            if (sa < sb) return sign * -1;
            if (sa > sb) return sign * 1;
            return sign * (a.description || a.name || '').localeCompare(b.description || b.name || '');
        });
    }

    if (sorted.length === 0) {
        listEl.innerHTML = '<li class="empty-state" style="padding:1.5rem; text-align:center; color:var(--text-muted);">Nenhuma fatura encontrada.</li>';
        return;
    }

    listEl.innerHTML = '';
    sorted.forEach(item => {
        const name = item.description || item.name || '—';
        const source = item.sourceName || (item.type === 'installments' ? 'Sem fonte' : 'Despesas Fixas');
        const isInst = item.type === 'installments';
        const isVar = item.type === 'variableExpenses';
        const val = Number(item.installmentAmount || item.amount || 0);
        let typeLabel = isVar ? 'Variável' : (isInst ? `${item.remainingInstallments}x parcela` : 'Assinatura');
        if (item.type === 'fixedExpenses' && !item.isSubscription) typeLabel = 'Fixo';

        // Find source color
        let dotColor = '#8a94a6';
        if (item.sourceId) {
            const src = cacheSources.find(s => s.id === item.sourceId);
            if (src && src.color) dotColor = src.color;
        }

        const li = document.createElement('li');
        li.className = 'expense-item';
        li.style.cursor = 'pointer';
        li.innerHTML = `
            <div class="expense-item-left">
                <span class="source-color-dot" style="background:${dotColor};"></span>
                <div class="expense-item-info">
                    <span class="expense-item-name">${name}</span>
                    <span class="expense-item-meta">${source} · ${typeLabel}</span>
                </div>
            </div>
            <span class="expense-item-amount" style="color:var(--danger-color);">${formatCurrency(val)}</span>
        `;
        li.addEventListener('click', () => openItemActionModal(item));
        listEl.appendChild(li);
    });
}

window.sortMatrix = function(key) {
    if (_matrixSortKey === key) {
        _matrixSortDir = _matrixSortDir === 'asc' ? 'desc' : 'asc';
    } else {
        _matrixSortKey = key;
        _matrixSortDir = 'asc';
    }
    
    document.querySelectorAll('.sort-btn').forEach(b => {
        b.classList.remove('active');
        const icon = b.querySelector('.list-sort-icon');
        if(icon) icon.style.display = 'none';
        
        if(b.dataset.sort === key) {
            b.classList.add('active');
            if(icon) {
                icon.style.display = 'inline-block';
                // Adjust arrow visual directions purely for aesthetics based on user feedback
                icon.className = _matrixSortDir === 'asc' ? 'ph ph-arrow-up list-sort-icon' : 'ph ph-arrow-down list-sort-icon';
            }
        }
    });
    renderMatrixList(window._currentMatrixItems || []);
};

function setupCarouselScrollSpy() {
    const carousel = document.getElementById('sources-carousel');
    if (!carousel || carousel.dataset.spyInit) return;
    carousel.dataset.spyInit = 'true';

    carousel.addEventListener('scroll', () => {
        if (window._isProgrammaticScroll) return;
        
        clearTimeout(window._carouselScrollTimer);
        window._carouselScrollTimer = setTimeout(() => {
            const cards = carousel.querySelectorAll('.credit-card');
            const carouselRect = carousel.getBoundingClientRect();
            // middle point of the scroll container
            const centerX = carouselRect.left + (carousel.clientWidth / 2);
            
            let closestCard = null;
            let minDiff = Infinity;
            
            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                const cardCenter = rect.left + (rect.width / 2);
                const diff = Math.abs(centerX - cardCenter);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestCard = card;
                }
            });
            
            if (closestCard) {
                const sid = closestCard.getAttribute('data-source-id');
                if (sid && sid !== window._currentSelectedSourceId) {
                    window._isProgrammaticScroll = true;
                    // change selection visually and reload list
                    window.selectSource(sid);
                    setTimeout(() => { window._isProgrammaticScroll = false; }, 300);
                }
            }
        }, 150); // debounce time
    });
}


// Meses Seguintes: opens a bottom sheet with the full 12-month table
window.openMonthsModal = function() {
    document.getElementById('modal-months-overlay')?.remove();

    const items = window._currentMatrixItems || [];
    const now = new Date();
    const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const numMonths = 12;

    const showVar = document.getElementById('toggle-matrix-variables').checked;
    const showInst = document.getElementById('toggle-matrix-installments').checked;

    // Build header
    let headHtml = '<tr><th>Despesa / Fonte</th>';
    for (let i = 0; i < numMonths; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        headHtml += `<th>${monthNames[d.getMonth()]} ${d.getFullYear()}</th>`;
    }
    headHtml += '</tr>';

    // Build rows
    const colTotals = Array(numMonths).fill(0);
    let bodyHtml = '';
    const sorted = [...items].sort((a, b) => {
        const sa = a.sourceName || 'ZZZ';
        const sb = b.sourceName || 'ZZZ';
        return sa.localeCompare(sb) || (a.description || a.name || '').localeCompare(b.description || b.name || '');
    });

    sorted.forEach(item => {
        const name = item.description || item.name || '—';
        const source = item.sourceName || 'Despesas Fixas';
        const isInst = item.type === 'installments';
        const val = Number(item.installmentAmount || item.amount || 0);

        bodyHtml += `<tr><td><strong>${name}</strong><br><small class="text-muted">${source}</small></td>`;
        for (let i = 0; i < numMonths; i++) {
            const active = isInst ? i < item.remainingInstallments : true;
            if (active) {
                bodyHtml += `<td>${formatCurrency(val)}</td>`;
                colTotals[i] += val;
            } else {
                bodyHtml += `<td style="opacity:0.35; color:var(--text-muted);">—</td>`;
            }
        }
        bodyHtml += '</tr>';
    });

    // Totals footer
    bodyHtml += `<tr class="matrix-footer"><td>Total</td>`;
    for (let i = 0; i < numMonths; i++) {
        bodyHtml += `<td>${formatCurrency(colTotals[i])}</td>`;
    }
    bodyHtml += '</tr>';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-months-overlay';
    overlay.innerHTML = `
        <div class="modal-sheet" style="max-height:88vh;">
            <div class="modal-sheet-header" style="flex-wrap: wrap; gap: 10px;">
                <h3>📅 Próximos 12 Meses</h3>
                <div style="display:flex; gap:1rem;">
                    <label style="display:flex; align-items:center; gap:0.4rem; font-size:0.8rem; cursor:pointer;">
                        <input type="checkbox" id="modal-tgl-var" ${showVar ? 'checked' : ''} style="accent-color: var(--primary-color);">
                        Gastos
                    </label>
                    <label style="display:flex; align-items:center; gap:0.4rem; font-size:0.8rem; cursor:pointer;">
                        <input type="checkbox" id="modal-tgl-inst" ${showInst ? 'checked' : ''} style="accent-color: var(--primary-color);">
                        Parcelas
                    </label>
                </div>
                <button class="modal-sheet-close" onclick="document.getElementById('modal-months-overlay').remove()">×</button>
            </div>
            <div class="months-modal-scroll">
                <table class="months-modal-table">
                    <thead>${headHtml}</thead>
                    <tbody>${bodyHtml}</tbody>
                </table>
                <div style="margin-top: 1.5rem; background: var(--bg-main); padding: 1rem; border-radius: 8px;">
                    <h4 style="margin-bottom: 1rem; color: var(--text-color); font-size: 0.9rem; text-align: center;">Evolução da Dívida</h4>
                    <div style="position: relative; height: 200px;">
                        <canvas id="monthsChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    
    // Bind the new checkboxes to trigger an update flow
    document.getElementById('modal-tgl-var').addEventListener('change', (e) => {
        document.getElementById('toggle-matrix-variables').checked = e.target.checked;
        localStorage.setItem('A2_matrix_var', e.target.checked);
        window.selectSource(window._currentSelectedSourceId || 'all');
        setTimeout(window.openMonthsModal, 50); // slight delay to allow selectSource to run
    });
    document.getElementById('modal-tgl-inst').addEventListener('change', (e) => {
        document.getElementById('toggle-matrix-installments').checked = e.target.checked;
        localStorage.setItem('A2_matrix_inst', e.target.checked);
        window.selectSource(window._currentSelectedSourceId || 'all');
        setTimeout(window.openMonthsModal, 50);
    });

    // Initialize Chart
    const ctx = document.getElementById('monthsChart').getContext('2d');
    const labels = [];
    for (let i = 0; i < numMonths; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        labels.push(`${monthNames[d.getMonth()]} ${d.getFullYear().toString().substr(-2)}`);
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total',
                data: colTotals,
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#e74c3c',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw || 0);
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, ticks: { display: false }, grid: { color: 'rgba(200,200,200,0.1)' } },
                x: { grid: { display: false }, ticks: { font: { size: 10 } } }
            }
        }
    });
};

// Item Action Modal – opens when clicking a row in the installments list
function openItemActionModal(item) {
    const name = item.description || item.name || '—';
    const isInst = item.type === 'installments';
    const val = Number(item.installmentAmount || item.amount || 0);
    const itemType = item.type; // 'installments' or 'fixedExpenses'

    // Remove previous modal if any
    document.getElementById('modal-item-action-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-item-action-overlay';
    overlay.innerHTML = `
        <div class="modal-sheet">
            <div class="modal-sheet-header">
                <h3>${name}</h3>
                <button class="modal-sheet-close" onclick="document.getElementById('modal-item-action-overlay').remove()">×</button>
            </div>
            <div class="item-action-field">
                <label>Nome</label>
                <input type="text" id="iaf-name" value="${name}">
            </div>
            <div class="item-action-field">
                <label>Valor ${isInst ? '(por parcela)' : ''}</label>
                <input type="number" id="iaf-amount" value="${val.toFixed(2)}" step="0.01">
            </div>
            ${isInst ? `<div class="item-action-field">
                <label>Parcelas restantes</label>
                <input type="number" id="iaf-remaining" value="${item.remainingInstallments || 1}" min="0">
            </div>` : ''}
            <div class="item-action-actions">
                <button class="btn-save" id="iaf-save-btn">Salvar</button>
                <button class="btn-delete" id="iaf-delete-btn">Excluir</button>
            </div>
        </div>
    `;

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    // Save handler
    document.getElementById('iaf-save-btn').addEventListener('click', async () => {
        const newName = document.getElementById('iaf-name').value.trim();
        const newAmount = parseFloat(document.getElementById('iaf-amount').value);
        if (!newName || isNaN(newAmount) || newAmount <= 0) {
            showToast('Preencha nome e valor válidos.', 'warning');
            return;
        }
        const updates = isInst
            ? { description: newName, installmentAmount: newAmount, remainingInstallments: parseInt(document.getElementById('iaf-remaining').value) || 1 }
            : { name: newName, amount: newAmount };
        try {
            await updateExpense(currentUserId, item.id, itemType, updates);
            showToast('Atualizado com sucesso!', 'success');
            overlay.remove();
            await loadInstallmentsScreen();
            await loadDashboardData();
        } catch (err) {
            console.error(err);
            showToast('Erro ao salvar. Tente novamente.', 'error');
        }
    });

    // Delete handler
    document.getElementById('iaf-delete-btn').addEventListener('click', async () => {
        if (!confirm(`Excluir "${name}"? Esta ação é irreversível.`)) return;
        try {
            await deleteExpense(currentUserId, item.id, itemType);
            showToast(`"${name}" excluído.`, 'success');
            overlay.remove();
            await loadInstallmentsScreen();
            await loadDashboardData();
        } catch (err) {
            console.error(err);
            showToast('Erro ao excluir. Tente novamente.', 'error');
        }
    });
}

// Handlers globais legados (mantidos por compatibilidade)
window._editMatrixItem = function(id, type) {
    const cacheToSearch = type === 'installments' ? cacheInstallments : cacheFixed;
    const found = cacheToSearch.find(item => item.id === id);
    if (found) openItemActionModal({ ...found, type });
    else showToast('Item não encontrado. Recarregue a tela.', 'error');
};


// ==========================================
// 7. RELATÓRIOS E GRÁFICOS (FASE 3)
// ==========================================

async function loadReportsScreen() {
    if(!currentUserId) return;

    try {
        const monthData = await getActiveMonthData(currentUserId);
        const fixos = await getFixedExpenses(currentUserId);
        const parcelas = await getInstallments(currentUserId);
        const variaveis = await getVariableExpenses(currentUserId);

        let totalCommitted = 0;
        fixos.forEach(f => totalCommitted += Number(f.amount));
        parcelas.forEach(p => totalCommitted += Number(p.installmentAmount || 0));

        let totalVariable = 0;
        const categoryMap = {};

        variaveis.forEach(v => {
            const val = Number(v.amount);
            totalVariable += val;
            
            const cat = v.category || 'Outros';
            if(!categoryMap[cat]) categoryMap[cat] = 0;
            categoryMap[cat] += val;
        });

        // Orçamento Mensal
        const income = Number(monthData.income || 0);
        const savings = Number(monthData.savingsGoal || 0);
        const project = Number(monthData.projectContribution || 0);
        
        let maxVariableLimit = income - savings - project - totalCommitted;
        if(maxVariableLimit < 0) maxVariableLimit = 0; // Previne erro visual
        const available = maxVariableLimit - totalVariable;
        const availableLabel = available >= 0 ? available : 0;

        const goalsTotal = savings + project;
        renderBudgetChart(totalCommitted, totalVariable, goalsTotal, availableLabel);
        renderCategoryChart(categoryMap);

    } catch(err) {
        console.error("Erro ao carregar relatórios:", err);
    }
}

function renderBudgetChart(committed, variable, goals, available) {
    const ctx = document.getElementById('budgetChart').getContext('2d');
    
    if(budgetChartInstance) {
        budgetChartInstance.destroy();
    }

    // Cores baseadas no tema dinâmico atual
    // Pedido do usuário: Mostrar despesas totais fixas+parcelas em vermelho
    const mainColor = '#ff6b6b';

    // Fallback vazio se Mês não tem metas nem gastos
    const isEmpty = (committed === 0 && variable === 0 && goals === 0 && available === 0);
    const plotData = isEmpty ? [0, 1] : [committed, variable, goals, available];
    
    // Vermelho (Fixas), Laranja/Amarelo (Variáveis), Roxo (Metas), Verde (Saldo Livre)
    const plotBg = isEmpty ? ['transparent', '#e0e0e0'] : ['#ff6b6b', '#f39c12', '#9b59b6', '#2ecc71'];
    const plotHover = isEmpty ? ['transparent', '#d0d0d0'] : ['#ff5252', '#e67e22', '#8e44ad', '#27ae60'];

    budgetChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: isEmpty ? ['Nenhum Gasto', 'Sem Receita Configurada'] : ['Desp. Fixas/Parcelas', 'Gastos Variáveis', 'Metas (Poupança/Projeto)', 'Saldo Livre/Sobra'],
            datasets: [{
                data: plotData,
                backgroundColor: plotBg,
                hoverBackgroundColor: plotHover,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderCategoryChart(categoryMap) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    if(categoryChartInstance) {
        categoryChartInstance.destroy();
    }

    const labels = Object.keys(categoryMap);
    const data = Object.values(categoryMap);

    // Paleta de cores para categorias
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#9966FF', '#FF9F40', '#4BC0C0'];

    // Fallback se não há variáveis
    const isEmpty = labels.length === 0;
    const finalLabels = isEmpty ? ['Nenhum'] : labels;
    const finalData = isEmpty ? [0.01] : data; // pequeno para renderizar eixo X e Y corretamente se necessário
    const finalColors = isEmpty ? ['#e0e0e0'] : colors.slice(0, labels.length);

    categoryChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: finalLabels,
            datasets: [{
                label: 'Gastos por Categoria (R$)',
                data: finalData,
                backgroundColor: finalColors,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// ==========================================
// UTILITÁRIOS E EXPORTAÇÃO
// ==========================================
function exportToCSV(dataList, headerRow) {
    let csvContent = headerRow.join(',') + '\n';
    
    dataList.forEach(item => {
        csvContent += item.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `export_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==========================================
// DRAG TO SCROLL (Mouse-drag para desktop, touch nativo via CSS)
// ==========================================
// Track abort controllers per element to safely remove/rebind listeners
const _dragControllers = new WeakMap();

function rebindDragEvents() {
    const scrollables = document.querySelectorAll('.cards-carousel, .table-responsive');

    scrollables.forEach(ele => {
        // Abort previous listeners for this exact element instance
        if (_dragControllers.has(ele)) {
            _dragControllers.get(ele).abort();
        }
        const controller = new AbortController();
        const { signal } = controller;
        _dragControllers.set(ele, controller);

        let pos = { left: 0, top: 0, x: 0, y: 0 };
        let isDown = false;

        ele.addEventListener('mousedown', function(e) {
            // Ignore if user clicked on interactive child elements
            if (e.target.closest('button, a, input, select, .expense-item-amount')) return;
            isDown = true;
            ele.style.cursor = 'grabbing';
            ele.style.userSelect = 'none';
            pos = { left: ele.scrollLeft, top: ele.scrollTop, x: e.clientX, y: e.clientY };
        }, { signal });

        ele.addEventListener('mousemove', function(e) {
            if (!isDown) return;
            e.preventDefault();
            ele.scrollLeft = pos.left - (e.clientX - pos.x);
            ele.scrollTop = pos.top - (e.clientY - pos.y);
        }, { signal });

        const stopDrag = () => {
            if (!isDown) return;
            isDown = false;
            ele.style.cursor = 'grab';
            ele.style.userSelect = '';
        };

        ele.addEventListener('mouseup', stopDrag, { signal });
        ele.addEventListener('mouseleave', stopDrag, { signal });
        ele.style.cursor = 'grab';
    });
}

// ==========================================
// AVATAR E PERFIL
// ==========================================
const avatarBtn = document.getElementById('user-avatar-btn');
const avatarMenu = document.getElementById('avatar-dropdown-menu');

if (avatarBtn && avatarMenu) {
    avatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        avatarMenu.style.display = avatarMenu.style.display === 'none' ? 'flex' : 'none';
    });

    document.addEventListener('click', (e) => {
        if (!avatarBtn.contains(e.target) && !avatarMenu.contains(e.target)) {
            avatarMenu.style.display = 'none';
        }
    });
}

const btnEditProfile = document.getElementById('btn-edit-profile');
const modalEditProfile = document.getElementById('modal-edit-profile');
const formEditProfile = document.getElementById('form-edit-profile');

if (btnEditProfile) {
    btnEditProfile.addEventListener('click', () => {
        avatarMenu.style.display = 'none';
        document.getElementById('profile-display-name').value = currentProfile?.displayName || currentProfile?.name || document.getElementById('user-name-display').textContent;
        document.getElementById('profile-photo-url').value = currentProfile?.photoURL || '';
        if (document.getElementById('profile-photo-file')) document.getElementById('profile-photo-file').value = '';
        modalEditProfile.classList.remove('hidden');
    });
}

if (formEditProfile) {
    formEditProfile.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = formEditProfile.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'Salvando...';
        try {
            const newName = document.getElementById('profile-display-name').value.trim();
            let newPhoto = document.getElementById('profile-photo-url').value.trim();
            const fileInput = document.getElementById('profile-photo-file');

            if (fileInput && fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                newPhoto = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            // Cropping to Square (center)
                            const minSize = Math.min(img.width, img.height);
                            const startX = (img.width - minSize) / 2;
                            const startY = (img.height - minSize) / 2;

                            const canvas = document.createElement('canvas');
                            const targetSize = 150; 
                            canvas.width = targetSize;
                            canvas.height = targetSize;
                            const ctx = canvas.getContext('2d');
                            // Draw the central square cropped to targetSize
                            ctx.drawImage(img, startX, startY, minSize, minSize, 0, 0, targetSize, targetSize);
                            
                            resolve(canvas.toDataURL('image/webp', 0.8));
                        };
                        img.onerror = () => reject(new Error("Erro ao ler imagem"));
                        img.src = e.target.result;
                    };
                    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
                    reader.readAsDataURL(file);
                });
            }
            
            await updateUserProfile(currentUserId, {
                displayName: newName,
                photoURL: newPhoto
            });
            
            if (!currentProfile) currentProfile = {};
            currentProfile.displayName = newName;
            currentProfile.photoURL = newPhoto;
            
            const displayFirst = newName.split(' ')[0];
            document.getElementById('user-name-display').textContent = displayFirst;
            
            const avatarInitials = document.getElementById('user-avatar-initials');
            const avatarImg = document.getElementById('user-avatar-img');
            if (newPhoto) {
                avatarImg.src = newPhoto;
                avatarImg.style.display = 'block';
                avatarInitials.style.display = 'none';
            } else {
                avatarInitials.textContent = displayFirst.charAt(0).toUpperCase();
                avatarInitials.style.display = 'block';
                avatarImg.style.display = 'none';
                avatarImg.src = '';
            }

            modalEditProfile.classList.add('hidden');
            showToast('Perfil atualizado com sucesso!');
        } catch (err) {
            console.error(err);
            alert("Erro ao salvar perfil.");
        } finally {
            btn.disabled = false;
            btn.textContent = 'Salvar Alterações';
        }
    });
}

// Inicializar botões globais e cores (novo Modal Categorias, Edição Fonte)
document.addEventListener('DOMContentLoaded', () => {
    // Variable matrix toggle
    const toggleVars = document.getElementById('toggle-matrix-variables');
    if (toggleVars) {
        // Load preference
        const savedPref = localStorage.getItem('A2_include_variables');
        if (savedPref !== null) {
            toggleVars.checked = savedPref === 'true';
        }
        
        toggleVars.addEventListener('change', () => {
            localStorage.setItem('A2_include_variables', toggleVars.checked);
            renderSourcesCarousel();
            if(window._currentSelectedSourceId) {
                window.selectSource(window._currentSelectedSourceId);
            }
        });
    }

    // Cores Add
    const colorSwatchesAdd = document.querySelectorAll('.source-color-swatch-add');
    const sourceColorInput = document.getElementById('source-color');
    colorSwatchesAdd.forEach(swatch => {
        swatch.addEventListener('click', (e) => {
            const color = e.target.getAttribute('data-color');
            if(sourceColorInput) sourceColorInput.value = color;
            // Destaca a seleção visualmente
            colorSwatchesAdd.forEach(s => s.style.border = '2px solid transparent');
            e.target.style.border = '2px solid var(--text-color)';
        });
    });

    // Cores Edit
    const colorSwatchesEdit = document.querySelectorAll('.source-color-swatch-edit');
    const editSourceColorInput = document.getElementById('edit-source-color-input');
    colorSwatchesEdit.forEach(swatch => {
        swatch.addEventListener('click', (e) => {
            const color = e.target.getAttribute('data-color');
            if(editSourceColorInput) editSourceColorInput.value = color;
            colorSwatchesEdit.forEach(s => s.style.border = '2px solid transparent');
            e.target.style.border = '2px solid var(--text-color)';
        });
    });

    // Links de Gerenciar Categoria
    document.querySelectorAll('.link-manage-categories').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('modal-manage-categories').classList.remove('hidden');
        });
    });
    
    // Add Categoria form
    const formAddCategory = document.getElementById('form-add-category');
    if (formAddCategory) {
        formAddCategory.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = formAddCategory.querySelector('button');
            const input = document.getElementById('new-category-name');
            const name = input.value.trim();
            if(!name) return;
            
            btn.disabled = true;
            try {
                await addCategory(currentUserId, name);
                input.value = '';
                showToast('Categoria adicionada!');
                await loadCategories();
            } catch(err) {
                showToast('Erro ao criar: ' + err.message, 'error');
            } finally { btn.disabled = false; }
        });
    }

    // Modal Edit Source open func
    window.openEditSourceModal = function(sourceId) {
        const source = cacheSources.find(s => s.id === sourceId);
        if(!source) return;
        document.getElementById('edit-source-id').value = source.id;
        document.getElementById('edit-source-name').value = source.name;
        document.getElementById('edit-source-color-input').value = source.color;
        
        // Destacar swatch respectivo
        colorSwatchesEdit.forEach(s => {
            if(s.getAttribute('data-color') === source.color) {
                s.style.border = '2px solid var(--text-color)';
            } else {
                s.style.border = '2px solid transparent';
            }
        });
        
        document.getElementById('modal-edit-source').classList.remove('hidden');
    };

    // Form Edit Source
    const formEditSource = document.getElementById('form-edit-source');
    if (formEditSource) {
        formEditSource.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = formEditSource.querySelector('button[type="submit"]');
            btn.disabled = true;
            try {
                const id = document.getElementById('edit-source-id').value;
                const name = document.getElementById('edit-source-name').value;
                const color = document.getElementById('edit-source-color-input').value;
                await updateSource(currentUserId, id, { name, color });
                document.getElementById('modal-edit-source').classList.add('hidden');
                showToast('Cartão atualizado com sucesso!');
                await loadSources();
                await loadInstallmentsScreen(); // recarrega a tela de cartões
            } catch(err) {
                showToast('Erro: ' + err.message, 'error');
            } finally { btn.disabled = false; }
        });
    }

    // Delete Source
    const btnDeleteSource = document.getElementById('btn-delete-source');
    if(btnDeleteSource) {
        btnDeleteSource.addEventListener('click', async () => {
            const id = document.getElementById('edit-source-id').value;
            if(!confirm('Tem certeza que deseja excluir ESTE CARTÃO?')) return;
            
            // Checar se não existem despesas vinculadas e avisar? (No MVP só deletamos)
            btnDeleteSource.disabled = true;
            try {
                await deleteSource(currentUserId, id);
                document.getElementById('modal-edit-source').classList.add('hidden');
                showToast('Cartão removido!');
                await loadSources();
                await loadInstallmentsScreen();
            } catch(err) {
                showToast('Erro: ' + err.message, 'error');
            } finally { btnDeleteSource.disabled = false; }
        });
    }
});
