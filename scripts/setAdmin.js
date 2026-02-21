/**
 * SCRIPT: Set Admin Role
 * Objetivo: Conceder papel de administrador a um usuário específico no Firestore.
 * 
 * Uso: 
 * 1. Obtenha a Chave Privada do Firebase (Service Account) no Console do Firebase em:
 *    Project Settings -> Service Accounts -> Generate new private key
 * 2. Salve o arquivo .json baixado na pasta `scripts/` como `serviceAccountKey.json`
 * 3. Rode no terminal: `node scripts/setAdmin.js <USER_UID_AQUI>`
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const keyPath = path.join(__dirname, "serviceAccountKey.json");

if (!fs.existsSync(keyPath)) {
    console.error("❌ ERRO: Arquivo serviceAccountKey.json não encontrado.");
    console.log("👉 Gere uma chave privada em: Firebase Console > Project Settings > Service Accounts.");
    process.exit(1);
}

const serviceAccount = require(keyPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const uidTarget = process.argv[2];

if (!uidTarget) {
    console.error("❌ ERRO: Você precisa informar o UID do usuário.");
    console.log("👉 Uso: node scripts/setAdmin.js SEU_UID_AQUI");
    process.exit(1);
}

async function setAdmin() {
    try {
        const userRef = db.collection("users").doc(uidTarget);
        const doc = await userRef.get();

        if (!doc.exists) {
            console.log(`⚠️ Documento de usuário não criado no banco ainda. Criando perfil Admin básico...`);
        }

        await userRef.set({ role: 'admin' }, { merge: true });
        
        console.log(`✅ Sucesso! O usuário '${uidTarget}' agora é um Administrador do sistema.`);
        console.log(`Ele poderá visualizar e deletar dados restritos quando as Regras (Rules) exigirem role == 'admin'.`);
    } catch (error) {
        console.error("❌ Falha ao atualizar o usuário:", error);
    } finally {
        process.exit(0);
    }
}

setAdmin();
