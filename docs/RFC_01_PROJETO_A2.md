# RFC 01 - Projeto A2 (Sistema de Governança Financeira)

- **Autor:** Antigravity (IA) / Wesley
- **Status:** Aprovado
- **Criado em:** 2026-02-20

## 1. Visão Geral do Sistema

O **Projeto A2** é uma aplicação web mobile-first voltada para o controle financeiro individual e auditoria bilateral (Wesley e Larissa). O sistema funciona como um ERP financeiro doméstico focado em transparência, projeção de caixa e governança conjugal.

Diferente de aplicativos comuns de finanças, o foco do Projeto A2 não é apenas o registro, mas responder perguntas como:
- *Quanto ainda posso gastar?*
- *Estou dentro da meta?*
- *Meu parceiro está dentro da meta?*
- *Quanto já foi guardado?*
- *Quanto falta para bater a meta do mês?*

## 2. Escopo e Arquitetura

O sistema é construído sobre:
- **Frontend:** HTML, CSS, e JavaScript Vanilla (Sem frameworks pesados para garantir performance e simplicidade).
- **Backend:** Firebase (Authentication, Cloud Firestore, Hosting).
- **Plano:** Spark (Totalmente gratuito).

O sistema suporta três tipos de papéis via *Authentication Custom Claims* (embora para MVP utilizemos regras de Firestore baseadas em UID):
1. **Admin:** Controle total (criação de usuários, definição de papéis).
2. **Usuário:** Wesley / Larissa. Acesso de leitura e escrita aos próprios dados, e leitura aos dados do parceiro.

## 3. Requisitos Funcionais Principais

### 3.1 Autenticação e Autorização
- Login exclusivo com Email/Senha via Firebase Auth.
- Cada usuário visualiza seus dados com permissão total.
- Leitura em modo *read-only* dos dados do parceiro.

### 3.2 Gestão de Meses e Dashboard Individual
- O cálculo base de saldo disponível por mês é: `Renda - Fixos - Parcelas - Meta Poupança - Contribuição Projeto`.
- O saldo resultante é o **Limite Máximo de Gasto Variável**.
- Exibição de barra de progresso (Cores: Verde < 70%, Amarelo 70%-100%, Vermelho > 100%).

### 3.3 Auditoria Semanal
- Permitir visualizar os gastos variáveis da semana do parceiro.
- Adicionar notas de auditoria a esses gastos.
- Manter o histórico de auditoria seguro e atrelado ao usuário auditor.

### 3.4 Despesas, Parcelas e Variáveis
- **Despesas Fixas:** Custos mensais recorrentes (ex: Aluguel).
- **Parcelas:** Controle de dívidas parceladas e atualização automática de "parcelas restantes".
- **Gastos Variáveis:** Agrupados por semana, debitados do "Limite de Gasto Variável".

## 4. Requisitos Não Funcionais
- **Mobile-first:** Interface projetada primariamente para telas de smartphone (1 coluna, cards empilhados).
- **Tempo de carregamento:** < 2 segundos.
- **Eficiência Firestore:** Leituras otimizadas. Carregar apenas o mês atual no dashboard. Histórico carregado sob demanda.
- **Segurança Restrita:** Validação de acesso a nível de backend (Firestore Rules). Nenhum dado do parceiro pode ser manipulado.

## 5. Fases de Implementação (MVP)

1. **Fase 1 (Atual - Essencial):**
   - Esqueleto Frontend, Firebase Config, Login.
   - CRUD de Mês, Fixos, Parcelas, Variáveis.
   - Dashboard individual e cálculo automático do limite.
2. **Fase 2:**
   - Tela e lógica de Auditoria Semanal.
   - Dashboard do casal consolidado.
3. **Fase 3:**
   - Relatórios e gráficos. Exportação de dados.

## 6. Limitações de Design e Estratégias
- **Leituras Firestore:** Evitar `onSnapshot` global. Utilizar `onSnapshot` apenas para métricas críticas do mês atual se estritamente necessário; preferencialmente usar `getDocs` para listas sob demanda, e query limitadas para otimização de custo.
- **Fechamento de Mês:** Adição do flag `closed: true` ao documento do mês no último dia, bloqueando edições posteriores via regras de segurança.
