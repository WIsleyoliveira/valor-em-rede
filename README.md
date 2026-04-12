<div align="center">

# 🌿 Valor em Rede

**Plataforma de gestão financeira para associações comunitárias**

![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-6-646cff?style=flat-square&logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&logo=supabase)
![PWA](https://img.shields.io/badge/PWA-Instalável-5a0fc8?style=flat-square&logo=googlechrome)
![Groq](https://img.shields.io/badge/IA-Groq%20LLaMA%203-f55036?style=flat-square)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)

</div>

---

## 📋 Sobre o projeto

O **Valor em Rede** é uma plataforma web progressiva (PWA) criada para associações comunitárias gerenciarem suas finanças com transparência, simplicidade e inteligência artificial. Permite registrar contribuições de membros, gastos administrativos, doações e gerar relatórios — tudo em tempo real e com suporte offline.

---

## ✨ Funcionalidades

### 👥 Membros
- Registro de contribuições mensais (PIX, boleto, cartão, dinheiro)
- Acompanhamento do próprio histórico de pagamentos
- Acesso à visão de transparência financeira da associação
- Recibo em PDF gerado automaticamente após cada pagamento

### 🏛️ Gestor (único, fixo)
- Dashboard com saldo, entradas, saídas e gráficos
- Registro de gastos com **sugestão automática de categoria por IA**
- Histórico completo com filtros por tipo e período
- Exportação de relatório para Amazon People
- Recomendações financeiras geradas por IA com base no histórico
- Relatório executivo narrativo gerado por IA

### �� Inteligência Artificial (Groq — LLaMA 3)
- Sugestão de categoria ao registrar um gasto
- Análise de saúde financeira da associação
- Recomendações práticas e priorizadas
- Relatório narrativo executivo para exportação
- Roda no servidor (chave nunca exposta no browser)

### 🔐 Segurança
- Autenticação real via **Supabase Auth**
- Apenas 1 gestor fixo — novos cadastros são sempre membros
- RLS (Row Level Security) no banco impede auto-promoção a gestor
- Validação de e-mail em tempo real com verificação de duplicidade
- Indicador de força de senha
- Bloqueio após 5 tentativas incorretas (2 minutos)

### 📱 PWA — Instalável como app
- Funciona offline com sincronização automática ao reconectar
- Instalável no celular (Android/iPhone) e no computador
- Service Worker com cache de assets

### 🔄 Tempo real
- Atualizações instantâneas entre usuários via **Supabase Realtime**
- Toast de sincronização com indicador de pendências offline

---

## 🛠️ Stack técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite 6 |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth |
| Tempo real | Supabase Realtime |
| IA | Groq API — modelo `llama3-8b-8192` |
| PDF | jsPDF |
| Ícones | Lucide React |
| PWA | vite-plugin-pwa (Workbox) |
| Deploy | Vercel (com Vercel Functions) |
| Offline | localStorage como fallback |

---

## 🚀 Rodando localmente

```bash
# 1. Clone o repositório
git clone https://github.com/WIsleyoliveira/valor-em-rede.git
cd valor-em-rede

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse: `http://localhost:5173`

---

## ⚙️ Variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Supabase — https://app.supabase.com → Settings → API
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui

# Groq — https://console.groq.com/keys (gratuito)
# ⚠️ No Vercel, adicione como GROQ_API_KEY (sem VITE_) para não expor no browser
GROQ_API_KEY=sua_groq_key_aqui
```

---

## 🗄️ Banco de dados

O schema completo está em [`supabase_schema.sql`](./supabase_schema.sql).

Execute no **Supabase → SQL Editor** para criar todas as tabelas, índices, triggers e políticas RLS.

### Tabelas
- `members` — perfis dos usuários (membros e gestor)
- `transactions` — todas as movimentações financeiras
- `amazon_people_log` — histórico de exportações

### Criar o gestor fixo

Após criar a conta do gestor em **Supabase → Authentication → Users**, execute:

```sql
insert into public.members (auth_id, name, email, role, status)
values (
  'UUID_DO_USUARIO_NO_AUTH',
  'Nome do Gestor',
  'email@dogestor.com',
  'manager',
  'active'
);
```

---

## 📦 Deploy na Vercel

1. Importe o repositório em [vercel.com](https://vercel.com)
2. Adicione as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `GROQ_API_KEY` ← **sem prefixo VITE_** (fica só no servidor)
3. Deploy automático a cada `git push` na branch `main`

---

## 📁 Estrutura do projeto

```
src/
├── components/         # Telas e componentes visuais
│   ├── Dashboard.jsx       # Painel principal com totais e gráficos
│   ├── PaymentForm.jsx     # Formulário de contribuição (3 etapas)
│   ├── DonationForm.jsx    # Formulário de doação
│   ├── ExpenseForm.jsx     # Registro de gastos com sugestão IA
│   ├── History.jsx         # Histórico com filtros
│   ├── TransparencyView.jsx # Visão pública de transparência
│   ├── AIRecommendations.jsx # Painel de recomendações da IA
│   ├── AmazonPeopleExport.jsx # Exportação de relatório
│   ├── LoginScreen.jsx     # Autenticação com validações
│   ├── Header.jsx          # Cabeçalho com status offline/sync
│   ├── ReceiptModal.jsx    # Recibo em PDF
│   └── SyncToast.jsx       # Notificação de sincronização
├── hooks/
│   ├── useStore.js         # Estado global + persistência
│   ├── useOllama.js        # Hook de IA
│   └── useSync.js          # Sincronização offline/online
├── services/
│   ├── supabase.js         # Cliente Supabase + keep-alive
│   ├── dbService.js        # Camada de acesso ao banco
│   ├── ollamaService.js    # Integração IA (Groq + fallback Ollama)
│   ├── storageService.js   # Cache localStorage
│   ├── emailService.js     # Envio de e-mails
│   └── amazonPeopleService.js
├── utils/
│   └── format.js           # Formatação de moeda, datas, etc.
└── pages/
api/
└── ai.js                   # Vercel Function — proxy seguro para o Groq
```

---

## 🔄 Fluxo do sistema

```
Membro registra pagamento
    → Salvo no Supabase (ou localStorage se offline)
    → Recibo PDF gerado automaticamente
    → Saldo do Dashboard atualizado em tempo real

Gestor registra gasto
    → IA sugere categoria automaticamente
    → Salvo no banco
    → Histórico e Dashboard atualizados

Dispositivo fica offline
    → Dados salvos no localStorage
    → Fila de pendências criada
    → Ao reconectar: sincronização automática com toast visual
```

---

## 📄 Licença

Este projeto foi desenvolvido para uso interno de associação comunitária. Todos os direitos reservados.
