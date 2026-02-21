Nome do projeto: Projeto A2

Stack obrigatória:

Frontend: HTML + CSS + JavaScript puro

Backend: Firebase

Firebase Authentication

Cloud Firestore

(Opcional) Firebase Hosting

Plano gratuito (Spark)

Mobile-first obrigatório.

🎯 OBJETIVO DO SISTEMA

Controle individual de caixa

Controle de parcelas

Controle de despesas fixas

Controle de gastos variáveis semanais

Meta individual mensal

Meta conjunta mensal

Auditoria semanal

Histórico mensal

Visão consolidada do casal

Indicadores automáticos

👤 ARQUITETURA DE USUÁRIOS

Dois usuários:

Wesley

Larissa

Cada um tem:

Conta individual

Visualização dos próprios dados

Visualização dos dados do parceiro (somente leitura)

Permissão para comentar/auditar gastos do parceiro

Controle via Firebase Auth com email e senha.

🔥 ESTRUTURA DO FIRESTORE

Coleção principal:

users/
  {userId}
    profile
    months/
      {YYYY-MM}
        income
        fixedExpenses[]
        installments[]
        variableExpenses[]
        goals
        auditLogs[]
📦 ESTRUTURA DETALHADA DOS DADOS
profile
{
  name: "Wesley",
  partnerId: "larissa_uid",
  createdAt: timestamp
}
months/{YYYY-MM}
{
  income: 3300,
  savingsGoal: 800,
  projectContribution: 700,
  createdAt: timestamp
}
fixedExpenses[]
{
  id: auto,
  name: "Aluguel",
  amount: 380,
  dueDate: 5,
  paid: true
}
installments[]

Estrutura inteligente:

{
  id: auto,
  name: "Tablet",
  totalAmount: 800,
  installmentAmount: 80,
  totalInstallments: 10,
  remainingInstallments: 4,
  nextDueDate: timestamp,
  active: true
}

O sistema calcula automaticamente:

Total mensal de parcelas ativas

Total restante da dívida

variableExpenses[]
{
  id: auto,
  description: "Lanche",
  amount: 45,
  category: "Lazer",
  createdAt: timestamp,
  weekNumber: 2,
  approved: false
}
auditLogs[]
{
  id: auto,
  weekNumber: 2,
  auditorId: "partner_uid",
  notes: "Gasto elevado em lazer",
  createdAt: timestamp
}
🧠 REGRAS DE NEGÓCIO (CORE)

Para cada mês:

Saldo Disponível =
Income
- Fixed Expenses
- Installments
- Project Contribution
- Savings Goal

O que sobra = Limite máximo de gasto variável.

Sistema deve:

Mostrar barra de progresso

Alertar se ultrapassar 70%

Bloquear visualmente acima de 100%

📊 DASHBOARD INDIVIDUAL

Mobile-first.

Topo:

Salário do mês

Meta de poupança

Valor comprometido

Valor restante disponível

Seções:

Despesas Fixas (editáveis)

Parcelas Ativas

Gastos da Semana

Limite restante

Barra de progresso

Status do mês:

🟢 Saudável

🟡 Atenção

🔴 Ultrapassado

👥 DASHBOARD DO CASAL

Visão consolidada:

Total guardado no mês

Total projetado

% atingido

Soma das rendas

Soma das despesas

Caixa acumulado do projeto

Gráfico de evolução

🧾 TELA DE AUDITORIA SEMANAL

Lista da semana:

Cada gasto listado

Botão “Justificar”

Campo de comentário

Marcar como “Auditado”

Histórico de auditorias visível por mês.

📅 CONTROLE SEMANAL

Sistema deve:

Detectar semana do mês automaticamente

Agrupar gastos por semana

Mostrar gasto da semana atual

Comparar com média ideal semanal

📈 RELATÓRIOS

Relatório mensal individual:

Receita

Total fixo

Total parcelas

Total variável

Total poupado

% taxa de poupança

Relatório histórico:

Gráfico de 6 meses

Crescimento do caixa

Evolução da disciplina

🔐 SEGURANÇA FIRESTORE RULES

Regra essencial:

Usuário só pode editar seus próprios dados.
Pode ler dados do parceiro.

Exemplo lógico:

allow read: if request.auth.uid == userId 
   || request.auth.uid == resource.data.partnerId;

allow write: if request.auth.uid == userId;
📱 MOBILE-FIRST UI ESTRUTURA

Layout:

1 coluna

Cards empilhados

Botão flutuante "+"

Navegação inferior:

Dashboard

Parcelas

Auditoria

Relatórios

Casal

⚙️ OTIMIZAÇÃO PARA PLANO GRATUITO

Evitar listeners em tempo real desnecessários

Buscar dados por mês específico

Não carregar histórico completo sempre

Indexação simples

Uso estimado:
Muito abaixo do limite do Spark.

📍 FLUXO DE USO SEMANAL

Segunda-feira:

Abrir app

Ver saldo restante

Lançar gastos da semana

Conferir parceiro

Registrar auditoria

Ajustar comportamento

🧩 MVP PRIORIDADE

Fase 1 (essencial):

Login

CRUD fixos

CRUD parcelas

CRUD variáveis

Cálculo automático

Dashboard individual

Fase 2:

Auditoria semanal

Dashboard casal

Relatórios

Fase 3:

Gráficos

Histórico avançado

Exportação

🧠 INDICADORES ESTRATÉGICOS QUE DEVEM EXISTIR

Taxa de comprometimento de renda

Taxa de poupança mensal

Dívida restante total

Projeção de quitação

% meta projeto atingida

🏛 FILOSOFIA DO SISTEMA

Isso não é app de controle de gasto.

É:

Sistema de disciplina bilateral

Instrumento de transparência

Ferramenta de governança conjugal

ERP financeiro doméstico

🚨 PONTO CRÍTICO

Se o sistema não mostrar:

“Quanto ainda posso gastar?”

Ele falha.

Se não mostrar:

“Quanto eu deveria já ter guardado até hoje?”

Ele falha.

Se não mostrar:

“Você está fora do planejado”

Ele falha.

Se você quiser, posso agora:

Escrever a documentação técnica no formato formal de especificação (estilo RFC)

Gerar o schema final do Firestore com validações

Escrever as regras completas de segurança

Escrever o esqueleto do projeto JS pronto para iniciar

Agora você está construindo a ferramenta que vai garantir que novembro aconteça.


📘 DOCUMENTAÇÃO TÉCNICA
Projeto A2

Sistema de Governança Financeira do Casal

Versão: 1.0
Arquitetura: Web App Mobile-First
Stack: JavaScript puro + Firebase (Spark Plan)

1. VISÃO GERAL DO SISTEMA
1.1 Objetivo

Desenvolver uma aplicação web mobile-first para:

Controle financeiro individual

Auditoria bilateral semanal

Controle de metas mensais

Monitoramento de parcelas

Projeção de caixa

Consolidação financeira do casal

O sistema funcionará como o ERP financeiro oficial do projeto de casamento e estruturação patrimonial.

2. REQUISITOS FUNCIONAIS
2.1 Autenticação

RF-01: O sistema deve permitir login via email e senha usando Firebase Authentication.
RF-02: Cada usuário deve ter perfil individual.
RF-03: Usuários devem visualizar seus próprios dados com permissão total de edição.
RF-04: Usuários devem visualizar dados do parceiro em modo leitura.

2.2 Gestão de Mês

RF-05: O sistema deve permitir criação de mês no formato YYYY-MM.
RF-06: Cada mês deve conter:

income (renda)

savingsGoal (meta de poupança)

projectContribution (valor destinado ao projeto)

createdAt

RF-07: O sistema deve impedir duplicação de mês.

2.3 Despesas Fixas

RF-08: CRUD completo de despesas fixas.
RF-09: Cada despesa fixa deve conter:

name

amount

dueDate

paid (boolean)

RF-10: O sistema deve calcular automaticamente o total de despesas fixas do mês.

2.4 Parcelas

RF-11: Permitir criação de parcelamento com:

name

totalAmount

installmentAmount

totalInstallments

remainingInstallments

nextDueDate

active (boolean)

RF-12: O sistema deve:

Calcular total mensal de parcelas ativas

Atualizar remainingInstallments automaticamente

Marcar parcela como inativa quando zerada

Calcular dívida restante total

2.5 Gastos Variáveis

RF-13: Permitir registro de gasto variável com:

description

amount

category

createdAt

weekNumber

approved (boolean)

RF-14: O sistema deve agrupar gastos por semana automaticamente.

2.6 Auditoria

RF-15: Usuário deve poder auditar gastos do parceiro.
RF-16: Auditoria deve conter:

weekNumber

auditorId

notes

createdAt

RF-17: Gastos podem ser marcados como “auditados”.

2.7 Dashboard Individual

RF-18: O sistema deve exibir:

Receita

Total fixos

Total parcelas

Total variáveis

Meta

Contribuição projeto

Saldo disponível

RF-19: Deve exibir:

Saldo Disponível =
Income
– Fixos
– Parcelas
– SavingsGoal
– ProjectContribution
– Variáveis

RF-20: Deve mostrar barra de progresso do limite variável.

2.8 Dashboard do Casal

RF-21: Exibir:

Soma das rendas

Soma das despesas

Total guardado no mês

Percentual da meta atingido

Evolução acumulada do projeto

2.9 Relatórios

RF-22: Exibir relatório mensal individual.
RF-23: Exibir histórico de 6 meses.
RF-24: Calcular indicadores:

Taxa de poupança (%)

Taxa de comprometimento da renda

Dívida total ativa

3. REQUISITOS NÃO FUNCIONAIS

RNF-01: Mobile-first obrigatório.
RNF-02: Layout 1 coluna.
RNF-03: Tempo de carregamento inferior a 2 segundos.
RNF-04: Baixo consumo de leituras Firestore.
RNF-05: Código modular e organizado.
RNF-06: Compatível com plano Spark (gratuito).

4. ARQUITETURA DO FIRESTORE

Estrutura:

users/{userId}
  profile
  months/{YYYY-MM}
    income
    savingsGoal
    projectContribution
    fixedExpenses[]
    installments[]
    variableExpenses[]
    auditLogs[]
5. MODELAGEM DE DADOS
5.1 Profile
{
  name: string,
  partnerId: string,
  createdAt: timestamp
}
5.2 Month Document
{
  income: number,
  savingsGoal: number,
  projectContribution: number,
  createdAt: timestamp
}
5.3 FixedExpense
{
  id: string,
  name: string,
  amount: number,
  dueDate: number,
  paid: boolean
}
5.4 Installment
{
  id: string,
  name: string,
  totalAmount: number,
  installmentAmount: number,
  totalInstallments: number,
  remainingInstallments: number,
  nextDueDate: timestamp,
  active: boolean
}
5.5 VariableExpense
{
  id: string,
  description: string,
  amount: number,
  category: string,
  createdAt: timestamp,
  weekNumber: number,
  approved: boolean
}
5.6 AuditLog
{
  id: string,
  weekNumber: number,
  auditorId: string,
  notes: string,
  createdAt: timestamp
}
6. REGRAS DE NEGÓCIO

RB-01: Não permitir edição de mês anterior fechado.
RB-02: Semana calculada automaticamente pelo dia do mês.
RB-03: Limite variável não pode ser negativo.
RB-04: Exibir alerta visual se variável > 70%.
RB-05: Exibir alerta crítico se > 100%.
RB-06: Impedir exclusão de parcela ativa sem confirmação dupla.

7. CÁLCULOS E INDICADORES
7.1 Taxa de Poupança
SavingsRate = (SavingsGoal + ProjectContribution) / Income
7.2 Comprometimento de Renda
CommitmentRate = (Fixos + Parcelas) / Income
7.3 Dívida Restante
DebtRemaining = Σ (remainingInstallments × installmentAmount)
8. SEGURANÇA FIRESTORE

Regras conceituais:

Usuário só pode escrever em seu próprio nó.

Pode ler dados do parceiro.

Não pode deletar mês de outro usuário.

Não pode modificar auditoria criada pelo parceiro.

9. FLUXO DE USO SEMANAL

Segunda-feira: abrir dashboard.

Conferir saldo restante.

Lançar gastos da semana.

Auditar parceiro.

Registrar observações.

Ajustar comportamento.

10. MVP
Prioridade 1

Login

CRUD mês

CRUD fixos

CRUD parcelas

CRUD variáveis

Dashboard individual

Prioridade 2

Auditoria

Dashboard casal

Prioridade 3

Relatórios avançados

Gráficos

Exportação

11. LIMITAÇÕES DO PLANO GRATUITO

50.000 leituras/dia

20.000 gravações/dia

Estratégia:

Carregar apenas mês atual

Buscar histórico sob demanda

Evitar listeners globais

Evitar re-renderizações desnecessárias

12. CRITÉRIO DE SUCESSO DO SISTEMA

O sistema deve responder, em menos de 5 segundos:

Quanto ainda posso gastar?

Estou dentro da meta?

Meu parceiro está dentro da meta?

Quanto já foi guardado?

Quanto falta para bater a meta do mês?

Se não responder isso claramente, o sistema falhou.



1️⃣ CRIAÇÃO DO PROJETO FIREBASE

Acessar: https://console.firebase.google.com

Criar novo projeto

Nome sugerido: project-union-erp

Desativar Google Analytics (não é necessário)

Plano: Spark (gratuito)

Após criar:

Ir em ⚙️ Project Settings

Registrar app Web

Nome do app: union-web

NÃO marcar Firebase Hosting ainda (configuramos depois)

Copiar o objeto firebaseConfig.

2️⃣ CONFIGURAÇÃO DO AUTHENTICATION

Ir em:

Authentication → Get Started

2.1 Método de login

Habilitar:

✔ Email/Password

Desabilitar todos os outros.

2.2 Configurações adicionais

Em Authentication → Settings:

Habilitar proteção contra enumeração

Habilitar verificação básica de email (opcional, mas recomendado)

Desativar login anônimo

3️⃣ CONFIGURAÇÃO DO FIRESTORE

Ir em:

Firestore Database → Create Database

Selecionar:

✔ Production Mode
✔ Região: southamerica-east1 (Brasil)

Isso reduz latência.

4️⃣ ESTRUTURA INICIAL DO BANCO

Você NÃO deve criar tudo manualmente.

Crie apenas:

users

Depois:

Crie manualmente 2 documentos (temporários):

users/{wesleyUid}
users/{larissaUid}

Adicione dentro:

profile: {
  name: "Wesley",
  partnerId: "larissaUid"
}

E vice-versa.

Depois o sistema cria os meses automaticamente.

5️⃣ REGRAS DE SEGURANÇA FIRESTORE (OBRIGATÓRIO)

Substitua as regras padrão por:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    function isPartner(userId) {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/users/$(userId)).data.profile.partnerId == request.auth.uid;
    }

    match /users/{userId} {

      // Perfil
      match /profile {
        allow read: if isOwner(userId) || isPartner(userId);
        allow write: if isOwner(userId);
      }

      // Meses
      match /months/{monthId} {
        allow read: if isOwner(userId) || isPartner(userId);
        allow write: if isOwner(userId);

        // Subcoleções
        match /{document=**} {
          allow read: if isOwner(userId) || isPartner(userId);
          allow write: if isOwner(userId);
        }
      }
    }
  }
}

Isso garante:

✔ Você só edita seus dados
✔ Pode ler dados do parceiro
✔ Não pode alterar dados do parceiro

6️⃣ ÍNDICES NECESSÁRIOS

Firestore → Indexes → Composite Index

Criar apenas se necessário.

Provavelmente você precisará:

Collection: variableExpenses
Fields:

createdAt (desc)

weekNumber (asc)

Collection: months

createdAt (desc)

Mas crie somente quando Firestore solicitar.

7️⃣ CONFIGURAÇÃO DO HOSTING

Instalar CLI:

npm install -g firebase-tools

Login:

firebase login

Inicializar no projeto:

firebase init

Selecionar:

✔ Hosting
✔ Firestore

Configurações:

Public directory: public

Single-page app? → Yes

Overwrite index.html? → No

Deploy:

firebase deploy
8️⃣ CONFIGURAÇÃO NO FRONTEND

Arquivo: firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "XXX",
  authDomain: "XXX",
  projectId: "XXX",
  storageBucket: "XXX",
  messagingSenderId: "XXX",
  appId: "XXX"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

Sempre usar versão modular v9+.

9️⃣ ESTRATÉGIA DE SINCRONIZAÇÃO EFICIENTE

Erro comum: usar onSnapshot() em tudo.

Você NÃO deve fazer isso.

Estratégia correta:

Para mês atual:

Pode usar onSnapshot() apenas no documento do mês atual.

Para histórico:

Usar getDocs() sob demanda.

Para dashboard:

Carregar apenas:

fixedExpenses

installments

variableExpenses

goals

Nunca carregar meses antigos automaticamente.

10️⃣ OTIMIZAÇÃO PARA SPARK

Evitar:

Listeners globais

Queries sem filtro

Buscas em coleção inteira

Sempre usar:

query(
  collection(db, "users", userId, "months", currentMonth, "variableExpenses"),
  orderBy("createdAt", "desc")
);
11️⃣ ESTRATÉGIA DE FECHAMENTO DE MÊS

No último dia:

Adicionar campo:
closed: true

Regras devem impedir edição após fechado.

Adicionar regra extra:

allow write: if isOwner(userId) &&
  !resource.data.closed;
12️⃣ CHECKLIST FINAL

Antes de usar oficialmente:

☐ Login funcionando
☐ Parceiro consegue visualizar
☐ Não consegue editar dados do outro
☐ Mês não duplica
☐ Cálculo automático correto
☐ Deploy funcionando
☐ Teste no mobile real
☐ Teste de carga manual (vários gastos)

🔒 RISCO CRÍTICO

Se você errar as regras de segurança:

Um pode alterar dados do outro

Pode excluir meses

Pode comprometer auditoria

Essa parte não pode ser negligenciada.

O nome do projeto mudou durante o processo, o nome atual é Projeto A2, ignore qualquer outro nome mencionado e adapte para o novo nome.

🔐 Arquitetura de Segurança
1️⃣ Modelo de Autenticação

Você quer:

1 usuário Admin (você)

2 usuários comuns (Wesley e Larissa)

Área administrativa invisível para usuários comuns

Controle total de criação de usuários

JWT para autenticação

Perfeito.

Decisão estratégica:

Use:

Firebase Authentication (Email/Senha)

Firestore

Custom Claims para controle de papel (role)

JWT emitido automaticamente pelo Firebase

Importante:
O Firebase já trabalha com JWT internamente. Você não precisa implementar um emissor manual, a menos que vá criar backend próprio.

🧠 Estrutura de Usuários (Modelo de Dados)

Coleção: users

users (collection)
   └── uid (document)
         - name: string
         - email: string
         - role: "admin" | "user"
         - isActive: boolean
         - createdAt: timestamp
🏛 Estrutura de Papéis

admin → acesso total

user → acesso apenas aos próprios dados

Nunca confie só no front-end.
As regras devem estar no Firestore Rules.

🔒 Firestore Security Rules (Base Segura)

Exemplo de regra estratégica:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth.token.role == "admin";
    }

    function isUser() {
      return request.auth != null;
    }

    match /users/{userId} {
      allow read: if isAdmin() || request.auth.uid == userId;
      allow write: if isAdmin();
    }

    match /financial/{docId} {
      allow read, write: if request.auth.uid == resource.data.ownerId;
    }
  }
}

Aqui está o ponto crucial:
role precisa estar dentro do JWT.

🎯 Custom Claims (A Parte Profissional)

Depois que você criar seu usuário admin no Firebase Auth, você precisa definir a claim:

Exemplo via Admin SDK (Node backend):

admin.auth().setCustomUserClaims(uid, { role: 'admin' })

Sem isso, você não tem controle real de papel.

🛡 Fluxo de Autenticação

Usuário faz login com email/senha

Firebase retorna JWT

JWT contém:

uid

email

role (via custom claim)

Front-end valida:

Se role === admin → libera rota /admin

Se role === user → libera dashboard comum

🚫 Sobre expor senha aqui

Você colocou:
admin senha: wess@@1254

Nunca deixe senha fixa no código.
Nunca documente senha em repositório.
Nunca versionar isso.

Senha deve ser criada manualmente no Firebase Console.

E melhor ainda:
Ative verificação em duas etapas no seu usuário admin.

🖥 Área Admin (Wireframe Conceitual)
4

Seções:

Dashboard Admin

Gerenciar Usuários

Criar Usuário

Desativar Usuário

Logs de atividade (ideal no futuro)

Tabela:

Nome	Email	Role	Status	Ações
Wesley	...	user	ativo	editar
Larissa	...	user	ativo	editar

Somente admin vê essa rota.

🧩 Personalização por Usuário

Estratégia correta:

Coleção financial

financial
   └── docId
         - ownerId: uid
         - type: "income" | "expense"
         - value
         - date

Consulta sempre filtrada por:

where("ownerId", "==", currentUser.uid)

Isso garante isolamento lógico.

⚠️ Falhas que precisamos evitar

❌ Controle de permissão apenas no front-end

❌ Não usar custom claims

❌ Permitir leitura geral da coleção

❌ Não invalidar token após mudança de role

❌ Não configurar regras antes de produção

🧠 Camada Extra (Nível Profissional)

Se quiser elevar o nível:

Cloud Functions para:

Criar usuário via admin

Definir role automaticamente

Logar criação de usuário

Rotas protegidas no React:

PrivateRoute

AdminRoute

📌 Arquitetura Ideal Final

Auth:
Firebase Email/Senha + Custom Claims

Autorização:
Firestore Rules

Dados:
Separação por ownerId

Admin:
Área exclusiva protegida por role

Escalabilidade futura:
Permitir multiempresa com campo companyId

📘 DOCUMENTAÇÃO CONCEITUAL E DE REQUISITOS
Sistema de Gestão Financeira com Controle de Acesso
1. VISÃO GERAL DO PRODUTO
1.1 Objetivo

Sistema web e mobile para gestão financeira individual/familiar com:

Controle de entradas e saídas

Geração de DRE

Controle de acesso por usuário

Área administrativa restrita

Segurança baseada em autenticação JWT

Isolamento completo de dados por usuário

O sistema deve priorizar:

Segurança

Clareza

Escalabilidade futura

Arquitetura modular

2. ESCOPO FUNCIONAL
2.1 Perfis de Usuário
2.1.1 Admin

Usuário com controle total do sistema.

Permissões:

Criar usuários

Definir papel (role)

Ativar/desativar usuários

Visualizar todos os dados

Acessar área administrativa

Alterar configurações globais

2.1.2 Usuário Comum

Usuário restrito ao próprio ambiente.

Permissões:

Registrar entradas

Registrar saídas

Visualizar relatórios próprios

Visualizar DRE próprio

Editar apenas seus próprios registros

3. REQUISITOS FUNCIONAIS
3.1 Autenticação

RF-01: O sistema deve permitir login via email e senha.
RF-02: Não deve permitir login social.
RF-03: Deve utilizar Firebase Authentication.
RF-04: Deve utilizar JWT emitido automaticamente pelo Firebase.
RF-05: Deve utilizar Custom Claims para controle de papel (role).
RF-06: Deve invalidar sessão ao alterar role do usuário.

3.2 Controle de Acesso

RF-07: O sistema deve restringir acesso à área admin apenas para usuários com role = "admin".
RF-08: Usuários comuns não devem visualizar rotas administrativas.
RF-09: Regras de segurança devem ser aplicadas no Firestore, não apenas no frontend.
RF-10: Todo registro financeiro deve conter ownerId vinculado ao uid do usuário autenticado.

3.3 Gestão de Usuários (Admin)

RF-11: Admin pode criar usuários.
RF-12: Admin pode definir role (admin ou user).
RF-13: Admin pode ativar/desativar usuários.
RF-14: Admin pode visualizar lista completa de usuários.

3.4 Gestão Financeira

RF-15: Usuário pode cadastrar entrada financeira.
RF-16: Usuário pode cadastrar saída financeira.
RF-17: Cada registro deve conter:

Tipo (income | expense)

Valor

Data

Categoria

Descrição

ownerId

RF-18: Usuário só pode visualizar seus próprios registros.

3.5 DRE (Demonstrativo de Resultado)

RF-19: O sistema deve gerar DRE com base nos dados filtrados por período.
RF-20: A estrutura da DRE deve conter:

Receita Bruta

(-) Custos

= Lucro Bruto

(-) Despesas Operacionais

= Resultado Operacional

(-) Impostos

= Lucro Líquido

RF-21: Deve permitir exportação futura para PDF ou Excel.

4. REQUISITOS NÃO FUNCIONAIS

RNF-01: Sistema deve utilizar HTTPS.
RNF-02: Regras de segurança devem ser configuradas antes da publicação.
RNF-03: O frontend não deve conter lógica de autorização sensível isoladamente.
RNF-04: O tempo de resposta das consultas deve ser inferior a 2 segundos.
RNF-05: Dados devem ser isolados por usuário via ownerId.
RNF-06: O sistema deve ser preparado para futura implementação multiempresa (companyId).

5. ARQUITETURA TÉCNICA
5.1 Stack

Frontend:

React (Web)

React Native (Mobile)

Backend:

Firebase Authentication

Firestore

Firebase Admin SDK (para gestão de usuários)

Autorização:

JWT

Custom Claims

6. MODELO DE DADOS
6.1 Coleção users
users
  └── uid
        - name
        - email
        - role ("admin" | "user")
        - isActive (boolean)
        - createdAt
6.2 Coleção financial
financial
  └── docId
        - ownerId
        - type ("income" | "expense")
        - value
        - category
        - description
        - date
        - createdAt
7. REGRAS DE SEGURANÇA (CONCEITO)

Apenas admin pode escrever na coleção users.

Usuário pode ler apenas seu próprio documento.

Registros financeiros só podem ser lidos e escritos se ownerId == request.auth.uid.

Role deve ser validado via request.auth.token.role.

8. ESTRUTURA DE ROTAS

Web:

/login
/dashboard
/financeiro
/relatorios
/dre
/admin (somente admin)
/admin/usuarios

Mobile:

/login
/home
/financeiro
/relatorios

9. FLUXO DE AUTENTICAÇÃO

Usuário insere email e senha.

Firebase valida credenciais.

Firebase retorna JWT.

Frontend verifica custom claim "role".

Sistema redireciona conforme papel.

Firestore Rules validam acesso aos dados.

10. REGRAS DE NEGÓCIO CRÍTICAS

RN-01: Nenhum usuário pode visualizar dados de outro usuário.
RN-02: Admin pode visualizar dados globais.
RN-03: Usuário desativado não pode autenticar.
RN-04: Role só pode ser alterado por admin.

11. PREPARAÇÃO PARA ESCALABILIDADE

O modelo deve permitir expansão futura para:

Multiempresa (companyId)

Logs de auditoria

Permissões granulares

Sistema SaaS

12. RISCOS IDENTIFICADOS

Configuração incorreta de Firestore Rules

Não uso correto de Custom Claims

Dependência excessiva de validação frontend

Falta de auditoria de ações administrativas

13. DIRETRIZES PARA IA DESENVOLVEDORA

A IA deve:

Priorizar segurança antes de interface.

Implementar regras no backend antes do frontend.

Garantir isolamento de dados.

Criar estrutura modular e escalável.

Evitar hardcode de credenciais.

Não confiar em variáveis de estado para controle de acesso.