- [x] Revisar integração atual do PIX no frontend e contratos das APIs `api/pix.js` e `api/pix-status.js`
- [x] Refatorar `src/components/PaymentForm.jsx` para criar cobrança real via API e exibir QR da resposta
- [x] Implementar polling de status real do pagamento via `api/pix-status.js`
- [x] Remover dependência de confirmação por `localStorage`/`pagar.html` no fluxo principal
- [x] Validar build local e checar status git
- [ ] Commitar correção e subir na `main`

## Ajuste MVP (sem ASAAS) + contador de pagamentos aprovados
- [x] Refatorar `api/pix.js` para mockar criação de cobrança PIX sem `ASAAS_API_KEY`
- [x] Refatorar `api/pix-status.js` para retorno simulado de aprovação sem gateway externo
- [x] Atualizar `src/App.jsx` para passar `transactions` ao `PaymentForm`
- [x] Atualizar `src/components/PaymentForm.jsx` para exibir quantidade exata já paga após aprovação
- [ ] Executar teste de caminho crítico (PIX + manual) e validar build
