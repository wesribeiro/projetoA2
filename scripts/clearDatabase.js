/**
 * SCRIPT: Clear Test Database
 * Objetivo: Apagar em massa (Hard Reset) meses financeiros e fontes de usuários para homologação.
 * ATENÇÃO: Nunca rode este script num banco de Produção verdadeiro.
 * 
 * Requisito: `serviceAccountKey.json` salvo na pasta scripts (mesmo do setAdmin).
 * Uso: node scripts/clearDatabase.js --confirm
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const param = process.argv[2];
if (param !== '--confirm') {
    console.error("⚠️ Você está prestes a limpar o banco de dados. Isso APAGARÁ coleções financeiras.");
    console.log("👉 Se tem certeza absoluta, rode: node scripts/clearDatabase.js --confirm");
    process.exit(1);
}

const keyPath = path.join(__dirname, "serviceAccountKey.json");
if (!fs.existsSync(keyPath)) {
    console.error("❌ ERRO: Arquivo serviceAccountKey.json não encontrado.");
    process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(keyPath))
});

const db = admin.firestore();

// Função recursiva recomendada pelo Firebase para apagar coleções maiores
async function deleteQueryBatch(db, query, resolve) {
  const snapshot = await query.get();
  const batchSize = snapshot.size;
  if (batchSize === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

async function clearDatabase() {
    console.log("🔥 Iniciando limpeza da base de testes...");
    try {
        const usersSnapshot = await db.collection("users").get();
        for (let userDoc of usersSnapshot.docs) {
            console.log(`Limpando histórico do usuário: ${userDoc.id}...`);
            
            // 1. Puxa os Meses
            const monthsSnapshot = await userDoc.ref.collection("months").get();
            for (let monthDoc of monthsSnapshot.docs) {
                // Deletar Sub-Coleções Fixas do mês
                for(let subColl of ['fixedExpenses', 'installments', 'variableExpenses', 'auditLogs']) {
                   const subQ = monthDoc.ref.collection(subColl).limit(100);
                   await new Promise((resolve, reject) => deleteQueryBatch(db, subQ, resolve).catch(reject));
                }
                // Deleta o mês em si
                await monthDoc.ref.delete();
            }

            // 2. Apaga as Fontes/Cartões recém criadas (Fase 3)
            const sourcesQ = userDoc.ref.collection("sources").limit(100);
            await new Promise((resolve, reject) => deleteQueryBatch(db, sourcesQ, resolve).catch(reject));
        }

        console.log("✅ Limpeza Concluída! Perfis mestres preservados, histórico financeiro apagado.");
    } catch(err) {
        console.error("❌ Erro durante o reset:", err);
    } finally {
        process.exit(0);
    }
}

clearDatabase();
