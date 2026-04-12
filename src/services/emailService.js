// ─── src/services/emailService.js ────────────────────────────────────────────
// Envio de relatório via mailto: — 100% gratuito, zero configuração.
// Abre o app de e-mail padrão do gestor (Gmail, Outlook, Mail…)
// já com destinatário, assunto e corpo preenchidos.
// ─────────────────────────────────────────────────────────────────────────────

export const AMAZON_PEOPLE_EMAIL = 'amazon-people-integration@amazon-corp.example.com';

// Limite de caracteres no corpo do mailto (browsers cortam ~2000 chars na URL)
// O resumo vai completo; o JSON completo vai no arquivo .json baixado separado.
const MAX_BODY_CHARS = 1800;

function fmtBRL(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
}

function buildEmailBody(payload) {
  const s    = payload.financial_summary || {};
  const m    = payload.metadata || {};
  const cats = Object.entries(payload.categories || {});
  const dateStr = new Date(m.generated_at).toLocaleString('pt-BR');

  const catLines = cats.length
    ? cats.map(([k, v]) => `  • ${k}: ${fmtBRL(v)}`).join('\n')
    : '  (nenhuma despesa registrada)';

  const body = [
    '=== RELATÓRIO FINANCEIRO — VALOR EM REDE ===',
    '',
    `Gerado em  : ${dateStr}`,
    `Gerado por : ${m.generated_by || '—'}`,
    `Associação : ${m.association_name || 'Valor em Rede'}`,
    `CNPJ       : ${m.cnpj || '—'}`,
    `Período    : ${m.period?.start?.split('T')[0]} → ${m.period?.end?.split('T')[0]}`,
    '',
    '--- RESUMO FINANCEIRO ---',
    `Total entradas : ${fmtBRL(s.total_income)}`,
    `Total despesas : ${fmtBRL(s.total_expenses)}`,
    `Saldo atual    : ${fmtBRL(s.net_balance)}`,
    `Doações        : ${fmtBRL(s.total_donations)}`,
    `Membros pagos  : ${s.members_paid ?? 0} / ${s.members_count ?? 0}`,
    '',
    '--- CATEGORIAS DE DESPESAS ---',
    catLines,
    '',
    '--- CONFORMIDADE ---',
    `Transparência  : ${payload.compliance?.transparency_level || 'full'}`,
    `Retenção dados : ${payload.compliance?.data_retention || '5_years'}`,
    `Auditável      : ${payload.compliance?.audit_ready ? 'SIM' : 'NÃO'}`,
    '',
    '--- OBSERVAÇÃO ---',
    'O arquivo JSON completo com todas as transações foi baixado',
    'automaticamente. Anexe-o a este e-mail antes de enviar.',
  ].join('\n');

  return body.length > MAX_BODY_CHARS
    ? body.slice(0, MAX_BODY_CHARS) + '\n...(ver arquivo JSON em anexo)'
    : body;
}

/**
 * Baixa o JSON e abre o cliente de e-mail via mailto: com tudo preenchido.
 * O gestor só precisa anexar o .json baixado e clicar Enviar.
 *
 * @param {object} payload - buildPayload() do AmazonPeopleExport
 * @param {*}      _       - (ignorado)
 * @param {object} user    - Usuário gestor logado
 * @returns {{ success: boolean, preview: string }}
 */
export function sendReportByEmail(payload, _, user) {
  const dateStr = new Date().toLocaleDateString('pt-BR');
  const subject = `[Valor em Rede] Relatório financeiro — ${dateStr}`;
  const body    = buildEmailBody(payload);

  // 1. Baixa o JSON automaticamente para o gestor poder anexar
  const jsonBlob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const jsonUrl  = URL.createObjectURL(jsonBlob);
  const a        = document.createElement('a');
  a.href         = jsonUrl;
  a.download     = `amazon-people-report-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(jsonUrl), 3000);

  // 2. Abre o cliente de e-mail com destinatário, assunto e corpo prontos
  const mailto = `mailto:${AMAZON_PEOPLE_EMAIL}`
    + `?subject=${encodeURIComponent(subject)}`
    + `&body=${encodeURIComponent(body)}`;

  window.location.href = mailto;

  return { success: true, preview: body };
}
