import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Função utilitária para obter a string 'YYYY-MM' do mês atual
export function getCurrentMonthString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Verifica se existe o mês, senao cria baseado no mês anterior (ou zerado).
export async function getOrCreateCurrentMonth(userId) {
    const yyyyMm = getCurrentMonthString();
    const monthRef = doc(db, "users", userId, "months", yyyyMm);
    const monthSnap = await getDoc(monthRef);

    if (!monthSnap.exists()) {
        // Se não existir, tenta criar com valores básicos (ou copiando do mês anterior no futuro)
        const initialData = {
            income: 0,
            savingsGoal: 0,
            projectContribution: 0,
            closed: false,
            createdAt: serverTimestamp()
        };
        await setDoc(monthRef, initialData);
        return initialData;
    }
    
    return monthSnap.data();
}

// ==========================================
// FUNÇÕES DE GOVERNANÇA E AUDITORIA (FASE 2)
// ==========================================

export async function getUserProfile(userId) {
    // Usaremos doc root ou sub doc para a claim do partnerId dependendo do seu formato final
    // Aqui assumimos que no ROOT DOC `users/{userId}` tem o partnerId ou sub doc admin
    // Para simplificar, vamos ler o doc root:
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if(snap.exists()) {
        return snap.data();
    }
    return null; // Caso não tenha profile definido nativamente ainda
}

export async function getPartnerVariableExpenses(partnerId, targetWeek) {
    if (!partnerId) return [];
    const yyyyMm = getCurrentMonthString();
    const collRef = collection(db, "users", partnerId, "months", yyyyMm, "variableExpenses");
    // Aqui filtramos pelo targetWeek usando query
    // E evitamos retornar todos
    const q = query(collRef, orderBy("createdAt", "desc")); 
    // Como o plano spark pode não ter index por week ainda configurado, filtramos no frontend:
    const snapshot = await getDocs(q);
    return snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(e => targetWeek ? e.weekNumber === targetWeek : true);
}

export async function getPartnerMonthSummary(partnerId) {
    if (!partnerId) return null;
    const yyyyMm = getCurrentMonthString();
    const monthRef = doc(db, "users", partnerId, "months", yyyyMm);
    const monthSnap = await getDoc(monthRef);
    return monthSnap.exists() ? monthSnap.data() : null;
}

export async function addAuditLog(partnerId, notes) {
    const yyyyMm = getCurrentMonthString();
    const collRef = collection(db, "users", partnerId, "months", yyyyMm, "auditLogs");
    await addDoc(collRef, {
        weekNumber: getWeekNumber(), // Auditoria é sempre sobre a semana atual (ou você pode passar parametro)
        notes: notes,
        createdAt: serverTimestamp()
    });
}

// Atualizar Renda e Metas do Mês
export async function updateMonthGoals(userId, data) {
    const yyyyMm = getCurrentMonthString();
    const monthRef = doc(db, "users", userId, "months", yyyyMm);
    await setDoc(monthRef, data, { merge: true });
}

// Adicionar Despesa Fixa
export async function addFixedExpense(userId, data) {
    const yyyyMm = getCurrentMonthString();
    const collRef = collection(db, "users", userId, "months", yyyyMm, "fixedExpenses");
    await addDoc(collRef, {
        ...data,
        createdAt: serverTimestamp()
    });
}

// Obter Despesas Fixas
export async function getFixedExpenses(userId) {
    const yyyyMm = getCurrentMonthString();
    const collRef = collection(db, "users", userId, "months", yyyyMm, "fixedExpenses");
    const q = query(collRef, orderBy("dueDate", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Adicionar Parcela
export async function addInstallment(userId, data) {
    const yyyyMm = getCurrentMonthString();
    const collRef = collection(db, "users", userId, "months", yyyyMm, "installments");
    await addDoc(collRef, {
        ...data,
        createdAt: serverTimestamp()
    });
}

// Obter Parcelas
export async function getInstallments(userId) {
    const yyyyMm = getCurrentMonthString();
    const collRef = collection(db, "users", userId, "months", yyyyMm, "installments");
    const snapshot = await getDocs(collRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Função utilitária exportável para a semana
export function getWeekNumber() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    return Math.ceil((now.getDate() + firstDay) / 7);
}

// Adicionar Gasto Variável
export async function addVariableExpense(userId, data) {
    const yyyyMm = getCurrentMonthString();
    const collRef = collection(db, "users", userId, "months", yyyyMm, "variableExpenses");
    await addDoc(collRef, {
        ...data,
        weekNumber: getWeekNumber(),
        approved: false, // precisa de auditoria
        createdAt: serverTimestamp()
    });
}

// Obter Gastos Variáveis
export async function getVariableExpenses(userId) {
    const yyyyMm = getCurrentMonthString();
    const collRef = collection(db, "users", userId, "months", yyyyMm, "variableExpenses");
    const q = query(collRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ==========================================
// FASE 3: FONTES DE RECEITA / CARTÕES (SOURCES)
// ==========================================

export async function addSource(userId, data) {
    const collRef = collection(db, "users", userId, "sources");
    await addDoc(collRef, {
        ...data,
        createdAt: serverTimestamp()
    });
}

export async function getSources(userId) {
    const collRef = collection(db, "users", userId, "sources");
    // Ordena alfabeticamente pelo nome do cartão
    const q = query(collRef, orderBy("name", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ==========================================
// MÉTODOS DE LEITURA DO PARCEIRO (TELA CASAL)
// ==========================================

export async function getPartnerFixedExpenses(partnerId) {
    const yyyyMm = getCurrentMonthString();
    const collRef = collection(db, "users", partnerId, "months", yyyyMm, "fixedExpenses");
    const snapshot = await getDocs(collRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getPartnerInstallments(partnerId) {
    const yyyyMm = getCurrentMonthString();
    const collRef = collection(db, "users", partnerId, "months", yyyyMm, "installments");
    const snapshot = await getDocs(collRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getPartnerAllVariableExpenses(partnerId) {
    const yyyyMm = getCurrentMonthString();
    const collRef = collection(db, "users", partnerId, "months", yyyyMm, "variableExpenses");
    const snapshot = await getDocs(collRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
