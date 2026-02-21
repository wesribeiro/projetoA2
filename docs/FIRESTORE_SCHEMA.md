# Schema do Firestore - Projeto A2

A estrutura do banco de dados Cloud Firestore foi desenhada para otimizar leituras (respeitando limites do plano Spark) e facilitar o isolamento de dados via regras de segurança.

## Coleção Raiz: `users`

A coleção de entrada é `users`. Cada documento representa um usuário autenticado.

### `users/{userId}`

```json
// Documento vazio ou com metadados básicos. Suas informações vitais estão em subcoleções e no documento 'profile'.
```

#### Subcoleção: `profile`

Contém exatamente UM documento com ID Fixo, ex: `users/{userId}/profile/data` ou o próprio documento `users/{userId}` servir para guardar o `profile` no root do doc (preferível para economizar queries). Assumiremos campos na raiz ou nó estático.

Se usarmos nó raiz para facilitar a visualização no Firebase:
```json
{
  "name": "Wesley",
  "email": "wesley@email.com",
  "partnerId": "larissa_uid",
  "role": "user",
  "isActive": true,
  "createdAt": "timestamp"
}
```

#### Subcoleção: `months`

Armazena o estado financeiro mês a mês. O ID do documento deve ser da forma `YYYY-MM` (ex: `2026-02`).

**Documento `users/{userId}/months/{YYYY-MM}`**:
```json
{
  "income": 3300,
  "savingsGoal": 800,
  "projectContribution": 700,
  "closed": false,
  "createdAt": "timestamp"
}
```

##### Sub-subcoleção: `fixedExpenses` (dentro do mês)
Lista de despesas fixas para aquele mês.
```json
{
  "id": "auto_id",
  "name": "Aluguel",
  "amount": 380,
  "dueDate": 5, // dia do vencimento
  "paid": true
}
```

##### Sub-subcoleção: `installments` (dentro do mês)
Dotação de parcelas pagas no mês. (Ou mantidas globais e copiadas, mas no modelo sugerido ficam dentro do mês para isolamento histórico).
```json
{
  "id": "auto_id",
  "name": "Tablet",
  "totalAmount": 800,
  "installmentAmount": 80,
  "totalInstallments": 10,
  "remainingInstallments": 4,
  "nextDueDate": "timestamp",
  "active": true
}
```

##### Sub-subcoleção: `variableExpenses` (dentro do mês)
Gastos lançados durante a semana atual/mês.
```json
{
  "id": "auto_id",
  "description": "Lanche",
  "amount": 45,
  "category": "Lazer",
  "createdAt": "timestamp",
  "weekNumber": 2, // 1 a 5
  "approved": false
}
```

##### Sub-subcoleção: `auditLogs` (dentro do mês)
Notas do parceiro.
```json
{
  "id": "auto_id",
  "weekNumber": 2,
  "auditorId": "partner_uid",
  "notes": "Gasto elevado em lazer esta semana.",
  "createdAt": "timestamp"
}
```

## Índices Compostos (Composite Indexes) Previstos

Você precisará criar os seguintes índices no painel do Firebase quando o console solicitar (erro no console.log do navegador):

1. **Coleção:** `variableExpenses`
   - Campo: `createdAt` (Descendente)
   - Campo: `weekNumber` (Ascendente)

2. **Coleção:** `months`
   - Campo: `createdAt` (Descendente)
