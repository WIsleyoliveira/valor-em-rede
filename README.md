# 🌿 Valor em Rede

Plataforma completa de gestão financeira comunitária com IA real (Ollama), sistema de pagamentos, doações e integração Amazon People. Desenvolvida em React + Vite.

## 🚀 Iniciar

```bash
npm install
npm run dev
```

Acesse: `http://localhost:5173`

## 🔄 Fluxo do sistema

| Quem | Ação | O que acontece |
|------|------|----------------|
| **Membro** | Envia contribuição | Saldo atualizado + recibo gerado automaticamente |
| **Gestor** | Registra gasto | IA sugere categoria, saldo decrementado, histórico atualizado |
| **Todos** | Visualizam painel | Transparência total: entrou → para onde foi |
| **Gestor** | Exporta relatório | Envio automático para Amazon People |

## ✨ Funcionalidades

- **Offline-first** — dados salvos no `localStorage`, sincronizados quando a conexão retornar
- **Recibo automático** — gerado no ato da contribuição, sem intervenção manual
- **IA leve** — sugere categorias de gasto com base na descrição
- **Transparência total** — membros veem breakdowns com barras de progresso
- **Integração Amazon People** — exportação de relatórios com log de confirmação
- **Filtros** — histórico filtrável por entradas/saídas
- **Breakdowns por categoria** — gastos organizados automaticamente

## 🛠️ Tecnologias

- React 18
- Vite 6
- JavaScript (sem TypeScript)
- localStorage (offline-first)
