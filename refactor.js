const fs = require('fs');
let code = fs.readFileSync('public/js/firebase-services.js', 'utf8');

// 1. Imports
code = code.replace(
  'orderBy, serverTimestamp } from',
  'orderBy, serverTimestamp, where, limit } from'
);

// 2. Remove getCurrentMonthString + getOrCreateCurrentMonth and replace with getActiveMonthId + getActiveMonthData + startMonth + closeMonth
const oldFuncsRegex = /\/\/ Função utilitária para obter a string 'YYYY-MM' do mês atual[\s\S]*?return monthSnap\.data\(\);\r?\n}/;
const newFuncs = `// Obtem o ID do mês ativo do usuário
export async function getActiveMonthId(userId) {
    const collRef = collection(db, "users", userId, "months");
    const q = query(collRef, where("status", "==", "active"), limit(1));
    const qs = await getDocs(q);
    if (!qs.empty) {
        return qs.docs[0].id; // Retorna o ID do documento do mês ativo
    }
    return null;
}

// Obtem os dados do mês ativo
export async function getActiveMonthData(userId) {
    const activeId = await getActiveMonthId(userId);
    if (!activeId) return null;
    const monthRef = doc(db, "users", userId, "months", activeId);
    const monthSnap = await getDoc(monthRef);
    return monthSnap.exists() ? monthSnap.data() : null;
}

// Inicia um novo mês manualmente
export async function startMonth(userId, data) {
    const collRef = collection(db, "users", userId, "months");
    // status: "active", startDate: serverTimestamp() etc
    await addDoc(collRef, {
        ...data,
        status: "active",
        createdAt: serverTimestamp()
    });
}

// Encerra o mês ativo
export async function closeMonth(userId, data) {
    const activeId = await getActiveMonthId(userId);
    if (!activeId) throw new Error("Sem mês ativo para encerrar");
    const monthRef = doc(db, "users", userId, "months", activeId);
    await setDoc(monthRef, {
        ...data,
        status: "archived",
        closedAt: serverTimestamp()
    }, { merge: true });
}`;

code = code.replace(oldFuncsRegex, newFuncs);

// 3. Replace getCurrentMonthString in partner functions
code = code.replace(
  /export async function getPartnerVariableExpenses.*?const yyyyMm = getCurrentMonthString\(\);/s,
  `export async function getPartnerVariableExpenses(partnerId, targetWeek) {
    if (!partnerId) return [];
    const yyyyMm = await getActiveMonthId(partnerId);
    if (!yyyyMm) return [];`
);

code = code.replace(
  /export async function getPartnerMonthSummary.*?const yyyyMm = getCurrentMonthString\(\);\n\s*const monthRef = doc\(db, "users", partnerId, "months", yyyyMm\);/s,
  `export async function getPartnerMonthSummary(partnerId) {
    if (!partnerId) return null;
    const activeId = await getActiveMonthId(partnerId);
    if (!activeId) return null;
    const monthRef = doc(db, "users", partnerId, "months", activeId);`
);

code = code.replace(
  /export async function addAuditLog.*?const yyyyMm = getCurrentMonthString\(\);/s,
  `export async function addAuditLog(partnerId, notes) {
    const yyyyMm = await getActiveMonthId(partnerId);
    if (!yyyyMm) throw new Error("Parceiro sem mês ativo.");`
);

code = code.replace(
  /export async function getPartnerFixedExpenses.*?const yyyyMm = getCurrentMonthString\(\);/s,
  `export async function getPartnerFixedExpenses(partnerId) {
    const yyyyMm = await getActiveMonthId(partnerId);
    if (!yyyyMm) return [];`
);

code = code.replace(
  /export async function getPartnerInstallments.*?const yyyyMm = getCurrentMonthString\(\);/s,
  `export async function getPartnerInstallments(partnerId) {
    const yyyyMm = await getActiveMonthId(partnerId);
    if (!yyyyMm) return [];`
);

code = code.replace(
  /export async function getPartnerAllVariableExpenses.*?const yyyyMm = getCurrentMonthString\(\);/s,
  `export async function getPartnerAllVariableExpenses(partnerId) {
    const yyyyMm = await getActiveMonthId(partnerId);
    if (!yyyyMm) return [];`
);

// 4. Replace getCurrentMonthString() with await getActiveMonthId(userId) in all others
code = code.replace(/const yyyyMm = getCurrentMonthString\(\);/g, 'const yyyyMm = await getActiveMonthId(userId);\n    if(!yyyyMm) throw new Error("Sem mês ativo");');

fs.writeFileSync('public/js/firebase-services.js', code);
console.log('Refatoramento de firebase-services.js concluído!');
