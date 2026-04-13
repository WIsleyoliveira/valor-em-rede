import { useState } from 'react';
import { CreditCard, Zap, FileText, Banknote, CheckCircle, ChevronRight, ChevronLeft, Copy, Check, FileCheck, Lock } from 'lucide-react';
import { fmt, maskMoney, parseMasked, genId, fmtDate, todayLocal } from '../utils/format';

const METHODS = [
  { id: 'pix', label: 'PIX', icon: Zap, color: '#059669', desc: 'Instantâneo e gratuito' },
  { id: 'boleto', label: 'Boleto', icon: FileText, color: '#3b82f6', desc: 'Vence em 3 dias úteis' },
  { id: 'credito', label: 'Crédito', icon: CreditCard, color: '#8b5cf6', desc: 'Parcelamento disponível' },
  { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: '#f59e0b', desc: 'Pagamento presencial' },
];
const PIX_KEY = 'associacao@valorem.rede';

export default function PaymentForm({ onAdd, onShowReceipt, user }) {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(null);
  const [copied, setCopied] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // Nome e email vêm do usuário logado — não podem ser alterados
  const name = user?.name || '';
  const email = user?.email || '';

  const handleCopy = () => { navigator.clipboard.writeText(PIX_KEY); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleConfirm = () => {
    const value = parseMasked(amount);
    const rec = { id: genId(), type: 'payment', name, email, value, method: method.id, methodLabel: method.label, date: todayLocal(), status: 'confirmed' };
    onAdd(rec); setReceipt(rec); setStep(4);
  };
  const reset = () => { setStep(1); setAmount(''); setMethod(null); setReceipt(null); };

  return (
    <div className="page">
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Registrar Pagamento</h2>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Contribuição mensal de associado</p>
      </div>
      {step < 4 && (
        <div className="steps-row" style={{ marginBottom: '1.5rem' }}>
          {['Seus dados', 'Forma de pagto.', 'Confirmar'].map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: i < 2 ? 1 : 0 }}>
              <div className="step-circle" style={{ background: step > i ? 'var(--primary)' : 'var(--border)', color: step > i ? '#fff' : 'var(--text-muted)', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                {step > i + 1 ? <Check size={14} /> : i + 1}
              </div>
              <span style={{ fontSize: '0.75rem', color: step === i + 1 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: step === i + 1 ? 600 : 400, whiteSpace: 'nowrap' }} className="hide-mobile">{label}</span>
              {i < 2 && <div style={{ flex: 1, height: 1, background: step > i + 1 ? 'var(--primary)' : 'var(--border)', minWidth: 20 }} />}
            </div>
          ))}
        </div>
      )}
      {step === 1 && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Nome e email bloqueados — vêm do login */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              Nome completo <Lock size={11} color="var(--text-muted)" />
            </label>
            <input className="form-input" value={name} readOnly
              style={{ background: 'var(--surface-alt)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
          </div>
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              E-mail <Lock size={11} color="var(--text-muted)" />
            </label>
            <input className="form-input" value={email} readOnly
              style={{ background: 'var(--surface-alt)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
          </div>
          <div><label className="form-label">Valor da contribuição</label><input className="form-input" placeholder="R$ 0,00" value={amount} onChange={e => setAmount(maskMoney(e.target.value))} /></div>
          <button className="btn btn-primary" disabled={!amount} onClick={() => setStep(2)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>Próximo <ChevronRight size={16} /></button>
        </div>
      )}
      {step === 2 && (
        <div className="card">
          <p style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.95rem' }}>Forma de pagamento:</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {METHODS.map(m => (
              <button key={m.id} onClick={() => setMethod(m)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', padding: '1rem', border: `2px solid ${method?.id === m.id ? m.color : 'var(--border)'}`, borderRadius: 10, background: method?.id === m.id ? m.color + '10' : 'var(--surface)', cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ background: m.color + '18', borderRadius: 8, padding: '0.5rem' }}><m.icon size={22} color={m.color} /></div>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: method?.id === m.id ? m.color : 'var(--text-primary)' }}>{m.label}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>{m.desc}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><ChevronLeft size={16} /> Voltar</button>
            <button className="btn btn-primary" disabled={!method} onClick={() => setStep(3)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>Próximo <ChevronRight size={16} /></button>
          </div>
        </div>
      )}
      {step === 3 && method && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Confirme o pagamento</h3>
          <div style={{ background: 'var(--surface-alt)', borderRadius: 10, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[['Nome', name], ['E-mail', email || '—'], ['Valor', fmt(parseMasked(amount))], ['Método', method.label]].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}><span style={{ color: 'var(--text-muted)' }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span></div>
            ))}
          </div>
          {method.id === 'pix' && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
              <Zap size={28} color="#059669" style={{ marginBottom: '0.5rem' }} />
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#065f46' }}>Chave PIX:</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', marginTop: '0.4rem' }}>
                <code style={{ background: '#dcfce7', padding: '0.3rem 0.75rem', borderRadius: 6, fontSize: '0.875rem', color: '#065f46', fontWeight: 700 }}>{PIX_KEY}</code>
                <button className="btn btn-ghost" style={{ padding: '0.3rem' }} onClick={handleCopy}>{copied ? <Check size={16} color="#059669" /> : <Copy size={16} />}</button>
              </div>
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: '#059669' }}>Após pagar, clique em "Confirmar"</p>
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><ChevronLeft size={16} />Voltar</button>
            <button className="btn btn-primary" onClick={handleConfirm} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}><CheckCircle size={16} /> Confirmar pagamento</button>
          </div>
        </div>
      )}
      {step === 4 && receipt && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <CheckCircle size={36} color="#059669" />
          </div>
          <h3 style={{ margin: '0 0 0.25rem', color: '#065f46', fontSize: '1.1rem' }}>Pagamento confirmado!</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 0.5rem' }}>Protocolo: <strong>#{receipt.id.slice(-8).toUpperCase()}</strong></p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>{fmt(receipt.value)} via {receipt.methodLabel} — {fmtDate(receipt.date)}</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => onShowReceipt && onShowReceipt(receipt)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileCheck size={16} /> Ver Nota Fiscal
            </button>
            <button className="btn btn-primary" onClick={reset} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}><ChevronRight size={16} /> Novo pagamento</button>
          </div>
        </div>
      )}
    </div>
  );
}
