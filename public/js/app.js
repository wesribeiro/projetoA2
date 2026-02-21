import { 
    getOrCreateCurrentMonth, 
    updateMonthGoals,
    addFixedExpense, getFixedExpenses,
    addInstallment, getInstallments,
    addVariableExpense, getVariableExpenses,
    getUserProfile, getPartnerVariableExpenses, getPartnerMonthSummary, addAuditLog, getWeekNumber,
    addSource, getSources,
    getPartnerAllVariableExpenses, getPartnerFixedExpenses, getPartnerInstallments
} from './firebase-services.js';

let currentUserId = null;
let currentProfile = null;

// Caches da aba Parcelas
let cacheSources = [];
let cacheInstallments = [];
let cacheFixed = [];

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
    const rawName = currentProfile?.name || email.split('@')[0];
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
    
    // Atualiza nome do mês
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const now = new Date();
    document.getElementById('current-month-display').textContent = `Mês de ${monthNames[now.getMonth()]}`;

    await loadSources();
    await loadDashboardData();
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
    } catch(err) {
        console.error("Erro ao carregar fontes: ", err);
    }
}

// ==========================================
// 2. LÓGICA DO DASHBOARD
// ==========================================
async function loadDashboardData() {
    if (!currentUserId) return;

    try {
        // 1. Garante que o mês existe e pega dados base
        const monthData = await getOrCreateCurrentMonth(currentUserId);
        
        // 2. Busca Despesas Fixas e Parcelas
        const fixos = await getFixedExpenses(currentUserId);
        const parcelas = await getInstallments(currentUserId);
        
        let totalCommitted = 0;
        fixos.forEach(f => totalCommitted += Number(f.amount));
        parcelas.forEach(p => totalCommitted += Number(p.amount || p.installmentAmount || 0)); // Adapto se o campo p for text/number
        
        // 3. Busca Gastos Variáveis
        const variaveis = await getVariableExpenses(currentUserId);
        let totalVariableMonth = 0;
        let totalVariableWeek = 0;
        
        // Descobre semana atual grossa (para o MVP, lógica simplificada no firebase-services)
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
        const currentWeekNumber = Math.ceil((now.getDate() + firstDay) / 7);

        const listContainer = document.getElementById('variable-expense-list');
        listContainer.innerHTML = '';

        variaveis.forEach(v => {
            const amount = Number(v.amount);
            totalVariableMonth += amount;
            
            // Soma gastos da semana e adiciona na lista UI
            if (v.weekNumber === currentWeekNumber) {
                totalVariableWeek += amount;
                
                const li = document.createElement('li');
                li.innerHTML = `
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 0.5rem 0;">
                        <span><strong>${v.description}</strong> <span class="text-muted">(${v.category})</span></span>
                        <strong class="text-danger">${formatCurrency(amount)}</strong>
                    </div>
                `;
                listContainer.appendChild(li);
            }
        });

        if (listContainer.children.length === 0) {
            listContainer.innerHTML = '<li class="empty-state text-muted">Nenhum gasto esta semana.</li>';
        }

        // 4. Cálculos Financeiros Core do Sistema
        const income = Number(monthData.income || 0);
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
        document.getElementById('total-income').textContent = formatCurrency(income);
        document.getElementById('savings-goal').textContent = formatCurrency(savings);
        document.getElementById('project-contribution').textContent = formatCurrency(project);
        document.getElementById('committed-total').textContent = formatCurrency(totalCommitted);
        document.getElementById('week-spent').textContent = formatCurrency(totalVariableWeek);
        
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

        // Preenche campos do modal de Configurações para facilitar próxima edição
        document.getElementById('setting-income').value = income;
        document.getElementById('setting-savings').value = savings;
        document.getElementById('setting-project').value = project;

        // Renderiza Gráficos Nativamente no Dashboard
        renderBudgetChart(totalVariableMonth, availableBalance > 0 ? availableBalance : 0);
        
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
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// ==========================================
// 3. LÓGICA DE MODAIS E FAB (AÇÃO)
// ==========================================

// Configurações
document.getElementById('btn-settings').addEventListener('click', () => {
    document.getElementById('modal-settings').classList.remove('hidden');
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

        await addVariableExpense(currentUserId, {
            description: document.getElementById('expense-desc').value,
            amount: Number(document.getElementById('expense-amount').value),
            category: document.getElementById('expense-category').value,
            sourceId: sel.value,
            sourceName: sourceName
        });
        formExpense.reset();
        document.getElementById('modal-add-expense').classList.add('hidden');
        await loadDashboardData();
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
        await loadDashboardData(); 
        await loadInstallmentsScreen();
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
            await loadDashboardData();
        } catch(err) {
            console.error(err);
            alert("Erro ao registrar Fixa");
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
            await loadDashboardData();
        } catch(err) {
            console.error(err);
            alert("Erro ao registrar Assinatura");
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
        await loadDashboardData();
    } catch(err) {
        console.error(err);
        alert("Erro ao registrar");
    } finally { btn.disabled = false; }
});

// Configuração de Mês
const formSettings = document.getElementById('form-settings');
formSettings.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formSettings.querySelector('button');
    btn.disabled = true;

    try {
        await updateMonthGoals(currentUserId, {
            income: Number(document.getElementById('setting-income').value),
            savingsGoal: Number(document.getElementById('setting-savings').value),
            projectContribution: Number(document.getElementById('setting-project').value)
        });
        document.getElementById('modal-settings').classList.add('hidden');
        await loadDashboardData();
    } catch(err) {
        console.error(err);
        alert("Erro ao salvar config");
    } finally { btn.disabled = false; }
});

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

        // Mostra a selecionada
        if(appContents[target]) {
            appContents[target].classList.remove('hidden');
            
            // Carrega dados específicos baseados na aba
            if(target === 'dashboard') {
                const name = currentProfile ? currentProfile.name.split(' ')[0] : 'Usuário';
                headerTitle.innerHTML = `Olá, <span id="user-name-display">${name}</span>`;
            } else if(target === 'auditoria') {
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
    });
});

async function loadAuditData() {
    if(!currentProfile || !currentProfile.partnerId) {
        document.getElementById('audit-expense-list').innerHTML = '<li class="empty-state text-muted">Parceiro não configurado no perfil.</li>';
        return;
    }

    try {
        document.getElementById('audit-partner-name').textContent = "Parceiro(a)"; // Ideal seria buscar o nome

        const currentWeek = getWeekNumber();
        const expenses = await getPartnerVariableExpenses(currentProfile.partnerId, currentWeek);
        
        const listContainer = document.getElementById('audit-expense-list');
        listContainer.innerHTML = '';

        if(expenses.length === 0) {
            listContainer.innerHTML = '<li class="empty-state text-muted">Nenhum gasto do parceiro nesta semana.</li>';
            return;
        }

        expenses.forEach(v => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 0.5rem 0; align-items:center;">
                    <div>
                        <strong>${v.description}</strong> <span class="text-muted">(${v.category})</span>
                        <br><small class="text-muted">${v.approved ? '✅ Auditado' : '⏳ Pendente'}</small>
                    </div>
                    <div style="text-align: right;">
                        <strong class="text-danger" style="display:block;">${formatCurrency(v.amount)}</strong>
                        ${!v.approved ? `<button class="btn-secondary btn-audit" data-id="${v.id}" style="font-size:0.7rem; padding: 0.2rem 0.5rem; margin-top:0.2rem;">Auditar</button>` : ''}
                    </div>
                </div>
            `;
            listContainer.appendChild(li);
        });

        // Adicionar eventos dinâmicos aos botões de auditar (Mock para futuro Modal)
        document.querySelectorAll('.btn-audit').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const note = prompt("Insira uma observação para este gasto (Auditoria):");
                if (note !== null) {
                    await addAuditLog(currentProfile.partnerId, note);
                    alert("Nota de auditoria salva!");
                    // Nota: para aprovar o gasto precisa atualizar o doc de despesa do parceiro, 
                    // Mas as regras de segurança impedem written cross-user nativamente.
                    // Para o MVP: A nota de auditoria fica salva na coleção e isso cumpre o MVP.
                }
            });
        });

    } catch (err) {
        console.error("Erro ao carregar auditoria", err);
    }
}

async function loadCoupleData() {
    if(!currentProfile || !currentProfile.partnerId) {
        document.getElementById('couple-total-income').textContent = "Parceiro n/a";
        return;
    }

    try {
        const myData = await getOrCreateCurrentMonth(currentUserId);
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
        <div class="credit-card" style="background: linear-gradient(135deg, #333, #000);" onclick="selectSource('all')">
            <div class="card-name">Visão Geral</div>
            <div class="card-chip"></div>
            <div class="card-balance">Resumo</div>
            <div class="card-footer">Todas as Fontes</div>
        </div>
    `;

    cacheSources.forEach(source => {
        // Calcula quanto esse cartão acumula neste mês
        let monthTotal = 0;
        cacheInstallments.forEach(p => {
            if(p.sourceId === source.id && p.remainingInstallments > 0) monthTotal += Number(p.installmentAmount);
        });
        cacheFixed.forEach(f => {
            if(f.sourceId === source.id) monthTotal += Number(f.amount);
        });

        html += `
            <div class="credit-card" style="background: linear-gradient(135deg, ${source.color}, #555);" onclick="selectSource('${source.id}')">
                <div class="card-name">${source.name}</div>
                <div class="card-chip"></div>
                <div class="card-balance">${formatCurrency(monthTotal)}</div>
                <div class="card-footer">Fatura Prevista</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// O HTML usa onclick="selectSource(...)", por isso precisamos expor no window
window.selectSource = function(sourceId) {
    const titleEl = document.getElementById('inst-table-title');
    const thead = document.getElementById('matrix-head');
    const tbody = document.getElementById('matrix-body');
    
    let sourceName = "Todas as Fontes";
    if (sourceId !== 'all') {
        const found = cacheSources.find(s => s.id === sourceId);
        if (found) sourceName = found.name;
    }
    titleEl.textContent = `Matriz de Faturas (${sourceName})`;

    // Filtrar dados da fonte selecionada
    const filteredInst = sourceId === 'all' 
        ? cacheInstallments 
        : cacheInstallments.filter(p => p.sourceId === sourceId);
    
    const filteredFixed = sourceId === 'all'
        ? cacheFixed
        : cacheFixed.filter(f => f.sourceId === sourceId);

    // Junta tudo numa lista só
    const allItems = [];
    filteredInst.forEach(p => allItems.push({ type: 'Parcela', ...p }));
    filteredFixed.forEach(f => {
        // Na tela de Cartões, mostramos só as despesas "Assinaturas" atreladas a cartões (têm sourceId).
        // Se formos exibir Despesas Fixas sem cartão (ex: Conta de Luz), ignorar se sourceId === 'all'.
        if(f.sourceId || sourceId === 'all') {
            if(sourceId === 'all' && !f.sourceId) return; // Oculta contas sem cartão da visão de faturas
            allItems.push({ type: 'Assinatura', ...f });
        }
    });

    const now = new Date();
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    // Configurar Cabeçalho (Meses)
    let headHtml = '<tr><th>Despesa / Fonte</th>';
    for (let i = 0; i < 6; i++) {
        const projDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        headHtml += `<th>${monthNames[projDate.getMonth()]} ${projDate.getFullYear()}</th>`;
    }
    headHtml += '</tr>';
    if(thead) thead.innerHTML = headHtml;

    // Configurar Corpo (Linhas por Despesa)
    let bodyHtml = '';
    const colTotals = [0, 0, 0, 0, 0, 0];

    // Ordenar itens por Nome da Fonte e depois Descrição
    allItems.sort((a, b) => {
        const sourceA = a.sourceName || '';
        const sourceB = b.sourceName || '';
        if(sourceA < sourceB) return -1;
        if(sourceA > sourceB) return 1;
        const nameA = a.description || a.name || '';
        const nameB = b.description || b.name || '';
        return nameA.localeCompare(nameB);
    });

    if(allItems.length === 0) {
        bodyHtml = '<tr><td colspan="7" class="text-center text-muted">Nenhuma fatura encontrada.</td></tr>';
    } else {
        allItems.forEach(item => {
            const name = item.description || item.name;
            const source = item.sourceName || 'Sem Fonte';
            const isInst = item.type === 'Parcela';
            const val = Number(item.installmentAmount || item.amount);

            bodyHtml += `<tr><td><strong>${name}</strong><br><small class="text-muted">${source}</small></td>`;

            for (let i = 0; i < 6; i++) {
                // Checar se a dívida atinge esse mês 'i'
                let isActive = false;
                if (isInst) {
                    if (i < item.remainingInstallments) isActive = true;
                } else {
                    isActive = true; // Assinaturas são contínuas
                }

                if (isActive) {
                    bodyHtml += `<td>${formatCurrency(val)}</td>`;
                    colTotals[i] += val;
                } else {
                    bodyHtml += `<td class="text-muted" style="opacity: 0.5;">-</td>`;
                }
            }
            bodyHtml += '</tr>';
        });

        // Footers Totais Columns
        bodyHtml += `<tr class="matrix-footer"><td>Total do Mês</td>`;
        for (let i = 0; i < 6; i++) {
            bodyHtml += `<td>${formatCurrency(colTotals[i])}</td>`;
        }
        bodyHtml += `</tr>`;
    }

    if(tbody) tbody.innerHTML = bodyHtml;
}

// ==========================================
// 7. RELATÓRIOS E GRÁFICOS (FASE 3)
// ==========================================

async function loadReportsScreen() {
    if(!currentUserId) return;

    try {
        const monthData = await getOrCreateCurrentMonth(currentUserId);
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

        renderBudgetChart(totalVariable, availableLabel);
        renderCategoryChart(categoryMap);

    } catch(err) {
        console.error("Erro ao carregar relatórios:", err);
    }
}

function renderBudgetChart(spent, available) {
    const ctx = document.getElementById('budgetChart').getContext('2d');
    
    if(budgetChartInstance) {
        budgetChartInstance.destroy();
    }

    // Cores baseadas no tema dinâmico atual
    const isLarissa = currentProfile?.name?.toLowerCase().includes('larissa') || false;
    const mainColor = isLarissa ? '#CCA9DD' : '#2ecc71';
    const mainHover = isLarissa ? '#b894c8' : '#27ae60';

    budgetChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Gasto Relizado', 'Saldo Restante'],
            datasets: [{
                data: [spent, available],
                backgroundColor: [mainColor, '#e0e0e0'],
                hoverBackgroundColor: [mainHover, '#d0d0d0'],
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

    categoryChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Gastos por Categoria (R$)',
                data: data,
                backgroundColor: colors.slice(0, labels.length),
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
