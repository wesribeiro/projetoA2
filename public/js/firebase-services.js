import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, query, orderBy, serverTimestamp, where, limit } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Obtem o ID do mês ativo do usuário (Cria um novo se não houver)
export async function getActiveMonthId(userId) {
    const collRef = collection(db, "users", userId, "months");
    const q = query(collRef, where("status", "==", "active"), limit(1));
    const qs = await getDocs(q);
    if (!qs.empty) {
        return qs.docs[0].id;
    }
    
    // Se não tem mês ativo, AUTO CRIA UM DE IMEDIATO (Background)
    const newMonthData = {
        status: "active",
        createdAt: serverTimestamp(),
        income: 0,
        savingsGoal: 0,
        projectContribution: 0,
        actualIncome: 0,
        actualSavings: 0,
        actualProject: 0,
        closed: false
    };
    const docRef = await addDoc(collRef, newMonthData);
    return docRef.id;
}

// Obtem os dados do mês ativo
export async function getActiveMonthData(userId) {
    const activeId = await getActiveMonthId(userId);
    if (!activeId) return null;
    const monthRef = doc(db, "users", userId, "months", activeId);
    const monthSnap = await getDoc(monthRef);
    return monthSnap.exists() ? monthSnap.data() : null;
}

// Inicia ou Edita as Metas do mês ativo
export async function startMonth(userId, data) {
    const activeId = await getActiveMonthId(userId);
    
    if (activeId) {
        // Se já existe mês, apenas edita as metas
        const monthRef = doc(db, "users", userId, "months", activeId);
        await setDoc(monthRef, {
            ...data,
            closed: false
        }, { merge: true });
    } else {
        // Fallback: cria um novo
        const collRef = collection(db, "users", userId, "months");
        await addDoc(collRef, {
            ...data,
            status: "active",
            createdAt: serverTimestamp(),
            closed: false
        });
    }
}

// Encerra o mês ativo
export async function closeMonth(userId, data, partnerId) {
    const activeId = await getActiveMonthId(userId);
    if (!activeId) throw new Error("Sem mês ativo para encerrar");
    const monthRef = doc(db, "users", userId, "months", activeId);
    await setDoc(monthRef, {
        ...data,
        status: "archived",
        closedAt: serverTimestamp()
    }, { merge: true });

    // Diminuir parcelas ativas (decremento global)
    const instRef = collection(db, "users", userId, "installments");
    const instQs = await getDocs(instRef);
    const batch = [];
    instQs.forEach(docSnap => {
        const docData = docSnap.data();
        if(docData.remainingInstallments > 0) {
            batch.push(updateDoc(doc(db, "users", userId, "installments", docSnap.id), {
                remainingInstallments: docData.remainingInstallments - 1
            }));
        }
    });
    if(batch.length > 0) await Promise.all(batch);

    // Enviar alerta para auditoria do parceiro
    if(partnerId) {
        const pActiveId = await getActiveMonthId(partnerId);
        if(pActiveId) {
             const auditRef = collection(db, "users", partnerId, "months", pActiveId, "auditLogs");
             await addDoc(auditRef, {
                 weekNumber: 99, // Flag especial para mensagens de relatório Mês
                 notes: `Mês Fechado! Guardado: R$ ${data.actualSavings} | Casamento: R$ ${data.actualProject} | Renda T.: R$ ${data.actualIncome}`,
                 type: 'month_closure',
                 createdAt: serverTimestamp()
             });
        }
    }
}

// Obtem todos os meses arquivados (Estimado vs Realizado)
export async function getArchivedMonths(userId) {
    const collRef = collection(db, "users", userId, "months");
    const snapshot = await getDocs(collRef);
    let archived = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        if(data.status === 'archived') {
            archived.push({ id: doc.id, ...data });
        }
    });
    // Ordenar do mais recente para o mais antigo
    archived.sort((a,b) => (b.closedAt?.seconds || 0) - (a.closedAt?.seconds || 0));
    return archived;
}

// ==========================================
// FUNÇÕES DE CATEGORIAS
// ==========================================
export async function getCategories(userId) {
    const collRef = collection(db, "users", userId, "categories");
    const q = query(collRef, orderBy("name", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addCategory(userId, name) {
    const collRef = collection(db, "users", userId, "categories");
    const docRef = await addDoc(collRef, { name, createdAt: serverTimestamp() });
    return docRef.id;
}

export async function deleteCategory(userId, categoryId) {
    const docRef = doc(db, "users", userId, "categories", categoryId);
    await deleteDoc(docRef);
}

// ==========================================
// FUNÇÕES DE FONTES / CARTÕES (CRUD Extra)
// ==========================================
export async function updateSource(userId, sourceId, data) {
    const docRef = doc(db, "users", userId, "sources", sourceId);
    await updateDoc(docRef, data);
}

export async function deleteSource(userId, sourceId) {
    const docRef = doc(db, "users", userId, "sources", sourceId);
    await deleteDoc(docRef);
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
    if (!snap.exists()) return null;
    return snap.data();
}

export async function updateUserProfile(userId, data) {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, data, { merge: true });
}

export async function getPartnerVariableExpenses(partnerId, targetWeek) {
    if (!partnerId) return [];
    const yyyyMm = await getActiveMonthId(partnerId);
    if (!yyyyMm) return [];
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
    const yyyyMm = await getActiveMonthId(partnerId);
    if(!yyyyMm) throw new Error("Sem mês ativo");
    const monthRef = doc(db, "users", partnerId, "months", yyyyMm);
    const monthSnap = await getDoc(monthRef);
    return monthSnap.exists() ? monthSnap.data() : null;
}

export async function addAuditLog(partnerId, notes) {
    const yyyyMm = await getActiveMonthId(partnerId);
    if (!yyyyMm) throw new Error("Parceiro sem mês ativo.");
    const collRef = collection(db, "users", partnerId, "months", yyyyMm, "auditLogs");
    await addDoc(collRef, {
        weekNumber: getWeekNumber(), // Auditoria é sempre sobre a semana atual (ou você pode passar parametro)
        notes: notes,
        createdAt: serverTimestamp()
    });
}

export async function getPartnerAuditLogs(partnerId) {
    const yyyyMm = await getActiveMonthId(partnerId);
    if (!yyyyMm) return [];
    const collRef = collection(db, "users", partnerId, "months", yyyyMm, "auditLogs");
    const q = query(collRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Atualizar Renda e Metas do Mês
export async function updateMonthGoals(userId, data) {
    const yyyyMm = await getActiveMonthId(userId);
    if(!yyyyMm) throw new Error("Sem mês ativo");
    const monthRef = doc(db, "users", userId, "months", yyyyMm);
    await setDoc(monthRef, data, { merge: true });
}

// Adicionar Despesa Fixa (Escopo Global)
export async function addFixedExpense(userId, data) {
    const collRef = collection(db, "users", userId, "fixedExpenses");
    await addDoc(collRef, {
        ...data,
        createdAt: serverTimestamp()
    });
}

// Obter Despesas Fixas (Escopo Global)
export async function getFixedExpenses(userId) {
    const collRef = collection(db, "users", userId, "fixedExpenses");
    const q = query(collRef, orderBy("dueDate", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Adicionar Parcela (Escopo Global)
export async function addInstallment(userId, data) {
    const collRef = collection(db, "users", userId, "installments");
    await addDoc(collRef, {
        ...data,
        createdAt: serverTimestamp()
    });
}

// Obter Parcelas (Escopo Global)
export async function getInstallments(userId) {
    const collRef = collection(db, "users", userId, "installments");
    const snapshot = await getDocs(collRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ==========================================
// ADMIN: Listar todos os usuários
// ==========================================
export async function getAllUsersForAdmin() {
    const collRef = collection(db, "users");
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
    const yyyyMm = await getActiveMonthId(userId);
    if(!yyyyMm) throw new Error("Sem mês ativo");
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
    const yyyyMm = await getActiveMonthId(userId);
    if(!yyyyMm) throw new Error("Sem mês ativo");
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
    const collRef = collection(db, "users", partnerId, "fixedExpenses");
    const snapshot = await getDocs(collRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getPartnerInstallments(partnerId) {
    const collRef = collection(db, "users", partnerId, "installments");
    const snapshot = await getDocs(collRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getPartnerAllVariableExpenses(partnerId) {
    const yyyyMm = await getActiveMonthId(partnerId);
    if (!yyyyMm) return [];
    const collRef = collection(db, "users", partnerId, "months", yyyyMm, "variableExpenses");
    const snapshot = await getDocs(collRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ==========================================
// MÉTODOS DE MANIPULAÇÃO GENÉRICA (CRUD)
// ==========================================

export async function updateExpense(userId, expenseId, collectionName, newData) {
    // Se a coleção for fixa ou parcela, manipulamos no root. Caso contrário, no mês.
    let docRef;
    if(collectionName === 'fixedExpenses' || collectionName === 'installments') {
        docRef = doc(db, "users", userId, collectionName, expenseId);
    } else {
        const yyyyMm = await getActiveMonthId(userId);
        if(!yyyyMm) throw new Error("Sem mês ativo");
        docRef = doc(db, "users", userId, "months", yyyyMm, collectionName, expenseId);
    }
    await updateDoc(docRef, newData);
}

export async function deleteExpense(userId, expenseId, collectionName) {
   let docRef;
   if(collectionName === 'fixedExpenses' || collectionName === 'installments') {
       docRef = doc(db, "users", userId, collectionName, expenseId);
   } else {
       const yyyyMm = await getActiveMonthId(userId);
       if(!yyyyMm) throw new Error("Sem mês ativo");
       docRef = doc(db, "users", userId, "months", yyyyMm, collectionName, expenseId);
   }
   await deleteDoc(docRef);
}
