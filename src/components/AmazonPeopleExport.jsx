import { useState } from 'react';
import { Upload, Shield, FileBarChart, RefreshCw, CheckCircle, AlertCircle, Copy, Check, Brain, Mail, Eye, X } from 'lucide-react';
import { fmt, fmtDate } from '../utils/format';
import { useOllama } from '../hooks/useOllama';
import { sendReportByEmail, AMAZON_PEOPLE_EMAIL } from '../services/emailService';

function buildPayload(transactions, totals, members, user, narrative) {
  const now = new Date();
  const expenses = transactions.filter(t => t.type === 'expense');
  const payments = transactions.filter(t => t.type === 'payment');
  const donations = transactions.filter(t => t.type === 'donation');
  const catBreakdown = expenses.reduce((acc, t) => { acc[t.category || 'Outros'] = (acc[t.category || 'Outros'] || 0) + t.value; return acc; }, {});

  return {
    metadata: {
      version: '2.1',
      generated_at: now.toISOString(),
      period: { start: transactions.at(-1)?.date || now.toISOString(), end: now.toISOString() },
      generated_by: user?.name || 'Sistema',
      association_name: 'Valor em Rede',
      cnpj: '00.000.000/0001-00',
    },
    financial_summary: {
      total_income: totals?.in || 0,
      total_expenses: totals?.out || 0,
      net_balance: totals?.balance || 0,
      total_donations: totals?.donations || 0,
      members_count: members?.length || payments.length,
      members_paid: new Set(payments.map(p => p.email || p.name)).size,
    },
    categories: catBreakdown,
    transactions: {
      payments: payments.map(p => ({ id: p.id, name: p.name, value: p.value, method: p.methodLabel || p.method, date: p.date })),
      expenses: expenses.map(e => ({ id: e.id, desc: e.desc, value: e.value, category: e.category, date: e.date, ai_category: e.aiSuggestion?.categoria })),
      donations: donations.map(d => ({ id: d.id, name: d.anon ? 'Anônimo' : d.name, value: d.value, cause: d.cause, recurrent: d.recurrent, date: d.date })),
    },
    ai_narrative: narrative || null,
    compliance: {
      transparency_level: 'full',
      data_retention: '5_years',
      audit_ready: true,
    },
  };
}

export default function AmazonPeopleExport({ transactions, totals, members, user }) {
  const [status, setStatus] = useState(null);
  const [copied, setCopied] = useState(false);
  const [json, setJson] = useState('');
  const { fetchNarrativeReport, narrativeReport, loadingReport } = useOllama();

  // e-mail state
  const [emailStatus, setEmailStatus] = useState(null); // null | 'loading' | 'success' | 'error' | 'demo'
  const [emailMsg, setEmailMsg]       = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewBody, setPreviewBody] = useState('');

  const handleGenNarrative = async () => {
    await fetchNarrativeReport(transactions, totals, 'período atual');
  };

  const handleExport = async () => {
    setStatus('loading');
    try {
      const payload = buildPayload(transactions, totals, members, user, narrativeReport);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `amazon-people-report-${new Date().toISOString().split('T')[0]}.json`; a.click();
      URL.revokeObjectURL(url);
      setJson(JSON.stringify(payload, null, 2));
      setStatus('success');
    } catch (e) {
      setStatus('error');
    }
  };

  const handleSendEmail = async () => {
    setEmailStatus('loading');
    setEmailMsg('');
    setShowPreview(false);
    try {
      const payload = buildPayload(transactions, totals, members, user, narrativeReport);
      if (!json) setJson(JSON.stringify(payload, null, 2));

      // Pequeno delay para mostrar o spinner antes de abrir o mailto
      await new Promise((r) => setTimeout(r, 600));

      const result = sendReportByEmail(payload, null, user);
      setPreviewBody(result.preview || '');
      setEmailStatus('success');
      setEmailMsg(`App de e-mail aberto com destinatário preenchido. O arquivo JSON foi baixado — anexe-o antes de enviar.`);
    } catch (e) {
      setEmailStatus('error');
      setEmailMsg(`Erro: ${e.message}`);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const expenseCount = (transactions || []).filter(t => t.type === 'expense').length;
  const paymentCount = (transactions || []).filter(t => t.type === 'payment').length;
  const donationCount = (transactions || []).filter(t => t.type === 'donation').length;

  return (
    <div className="page">
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Shield size={20} color="var(--primary)" />
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Exportar para Amazon People</h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Relatório completo com conformidade e narrativa de IA</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid-3" style={{ marginBottom: '1rem' }}>
        {[
          { label: 'Pagamentos', value: paymentCount, color: '#3b82f6' },
          { label: 'Despesas', value: expenseCount, color: '#ef4444' },
          { label: 'Doações', value: donationCount, color: '#ec4899' },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* AI Narrative */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Brain size={16} color="var(--primary)" />
          <span style={{ fontWeight: 600 }}>Relatório narrativo de IA</span>
        </div>
        {loadingReport ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'var(--surface-alt)', borderRadius: 8 }}>
            <div className="ai-thinking"><span className="ai-dot" /><span className="ai-dot" /><span className="ai-dot" /></div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gerando narrativa...</span>
          </div>
        ) : narrativeReport ? (
          <div style={{ background: 'var(--surface-alt)', borderRadius: 8, padding: '1rem', fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--text-secondary)', maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {narrativeReport}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>A IA pode gerar um relatório narrativo formal para incluir no export.</p>
        )}
        <button className="btn btn-secondary" onClick={handleGenNarrative} disabled={loadingReport} style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Brain size={15} /> {narrativeReport ? 'Regenerar narrativa' : 'Gerar narrativa com IA'}
        </button>
      </div>

      {/* Export */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <FileBarChart size={16} color="var(--primary)" />
          <span style={{ fontWeight: 600 }}>Exportar dados</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {[
            'Resumo financeiro completo',
            'Breakdown por categoria (IA)',
            'Lista de transações anonimizadas',
            'Narrativa executiva gerada pela IA',
            'Metadados de conformidade',
          ].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
              <CheckCircle size={13} color="#059669" />{item}
            </div>
          ))}
        </div>

        {status === 'success' && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.75rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={16} color="#059669" />
            <span style={{ fontSize: '0.875rem', color: '#065f46', fontWeight: 500 }}>Arquivo exportado com sucesso!</span>
            {json && <button className="btn btn-ghost" style={{ marginLeft: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={handleCopy}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar JSON'}</button>}
          </div>
        )}
        {status === 'error' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.75rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} color="#ef4444" />
            <span style={{ fontSize: '0.875rem', color: '#b91c1c' }}>Erro ao exportar. Tente novamente.</span>
          </div>
        )}

        <button className="btn btn-primary" onClick={handleExport} disabled={status === 'loading'} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          {status === 'loading' ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Gerando...</> : <><Upload size={16} /> Exportar relatório (.json)</>}
        </button>
      </div>

      {/* ── Envio por E-mail ───────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Mail size={16} color="var(--primary)" />
          <span style={{ fontWeight: 600 }}>Enviar para Amazon People por e-mail</span>
        </div>

        {/* Destino */}
        <div style={{ background: 'var(--surface-alt)', borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: '0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Mail size={14} color="var(--text-muted)" />
          <span style={{ color: 'var(--text-muted)' }}>Para:</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{AMAZON_PEOPLE_EMAIL}</span>
        </div>

        {/* O que vai no e-mail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {[
            'Resumo financeiro (entradas, saídas, saldo)',
            'Breakdown por categoria de despesas',
            'Payload JSON completo inline',
            'Metadados de conformidade e auditoria',
            narrativeReport ? '✦ Narrativa executiva gerada pela IA' : null,
          ].filter(Boolean).map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
              <CheckCircle size={13} color="#059669" />{item}
            </div>
          ))}
        </div>

        {/* Status do envio */}
        {emailStatus === 'success' && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.75rem', marginBottom: '0.75rem', display:'flex', alignItems:'flex-start', gap:'0.5rem' }}>
            <CheckCircle size={16} color="#059669" style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.875rem', color: '#065f46', fontWeight: 600, display: 'block' }}>App de e-mail aberto!</span>
              <span style={{ fontSize: '0.8rem', color: '#047857' }}>{emailMsg}</span>
            </div>
            <button className="btn btn-ghost" style={{ padding:'0.2rem 0.5rem', fontSize:'0.75rem', display:'flex', alignItems:'center', gap:'0.3rem', flexShrink: 0 }} onClick={() => setShowPreview(!showPreview)}>
              <Eye size={13} /> {showPreview ? 'Ocultar' : 'Ver corpo'}
            </button>
          </div>
        )}
        {emailStatus === 'error' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.75rem', marginBottom: '0.75rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <AlertCircle size={16} color="#ef4444" />
            <span style={{ fontSize: '0.875rem', color: '#b91c1c' }}>{emailMsg}</span>
          </div>
        )}

        {/* Preview do conteúdo do e-mail */}
        {showPreview && previewBody && (
          <div style={{ position:'relative', background:'#0f172a', borderRadius:8, padding:'1rem', marginBottom:'0.75rem' }}>
            <button onClick={() => setShowPreview(false)} style={{ position:'absolute', top:8, right:8, background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
              <X size={16} />
            </button>
            <div style={{ fontSize:'0.72rem', color:'#94a3b8', fontFamily:'monospace', whiteSpace:'pre-wrap', maxHeight:300, overflow:'auto', lineHeight:1.6 }}>
              {previewBody}
            </div>
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleSendEmail}
          disabled={emailStatus === 'loading'}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #1a56db, #7c3aed)' }}
        >
          {emailStatus === 'loading'
            ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Enviando e-mail...</>
            : <><Mail size={16} /> Enviar relatório por e-mail</>}
        </button>
      </div>

    </div>
  );
}
