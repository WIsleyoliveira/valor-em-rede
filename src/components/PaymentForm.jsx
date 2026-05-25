import { useState } from 'react';
import { CreditCard, Zap, FileText, Banknote, CheckCircle, ChevronRight, ChevronLeft, Copy, Check, FileCheck, Lock } from 'lucide-react';
import { fmt, maskMoney, parseMasked, genId, fmtDate, todayLocal } from '../utils/format';

// ── PIX estático — QR Code fixo de R$ 15,00 ──────────────────────────────────
const PIX_QR_IMAGE   = '/qrcode-pix.png';
const PIX_COPIA_COLA = '00020126330014BR.GOV.BCB.PIX0111054595012025204000053039865802BR5917MURILO MUNIZ DIAS6005BELEM622605227Nb3sU3Mw0mTa0iB682C1C63040B5D';

const METHODS = [
  { id: 'pix',      label: 'PIX',      icon: Zap,        color: '#059669', desc: 'Instantâneo e gratuito' },
  { id: 'boleto',   label: 'Boleto',   icon: FileText,   color: '#3b82f6', desc: 'Vence em 3 dias úteis'  },
  { id: 'credito',  label: 'Crédito',  icon: CreditCard, color: '#8b5cf6', desc: 'Parcelamento disponível' },
  { id: 'dinheiro', label: 'Dinheiro', icon: Banknote,   color: '#f59e0b', desc: 'Pagamento presencial'    },
];

export default function PaymentForm({ onAdd, onShowReceipt, user, transactions = [] }) {
  const [step, setStep]     = useState(1);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [paidCount, setPaidCount] = useState(0);
  const [copied, setCopied]       = useState(false);
  const [pixConfirmed, setPixConfirmed] = useState(false);

  const name  = user?.name  || '';
  const email = user?.email || '';

  function copiarChavePix() {
    navigator.clipboard.writeText(PIX_COPIA_COLA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function confirmarPixManual() {
    setPixConfirmed(true);
    setTimeout(() => confirmarPagamento(null, null), 1000);
  }

  function confirmarPagamento(idPix, pixData) {
    clearInterval(pollingRef.current);
    // Se veio do pagar.html (QR Code físico), usa nome/valor de lá; senão usa os do formulário
    const value = (pixData?.valor && pixData.valor > 0) ? pixData.valor : parseMasked(amount);
    const pagadorName = pixData?.nome || name;
    const rec = {
      id: genId(),
      type: 'payment',
      name: pagadorName,
      email,
      value,
      method: method.id,
      methodLabel: method.label,
      date: todayLocal(),
      status: 'confirmed',
      pix_id: idPix || pixId,
    };

    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedName = (pagadorName || '').trim().toLowerCase();
    const previousPaidCount = (transactions || []).filter((t) => {
      if (t.type !== 'payment') return false;
      const tEmail = (t.email || '').trim().toLowerCase();
      const tName = (t.name || '').trim().toLowerCase();
      if (normalizedEmail) return tEmail === normalizedEmail;
      return normalizedName ? tName === normalizedName : false;
    }).length;

    onAdd(rec);
    setPaidCount(previousPaidCount + 1);
    setReceipt(rec);
    setStep(4);
  }

  function voltarDoStep3() {
    clearTimeout(delayRef.current);
    clearInterval(pollingRef.current);
    setPixId('');
    setPixQrUrl('');
    setPixLink('');
    setPixStatus('waiting');
    setStep(2);
  }

  function reset() {
    clearTimeout(delayRef.current);
    clearInterval(pollingRef.current);
    setStep(1);
    setAmount('');
    setMethod(null);
    setReceipt(null);
    setPixId('');
    setPixQrUrl('');
    setPixLink('');
    setCopied(false);
    setPixConfirmed(false);
    setPaidCount(0);
  }

  return (
    <div className="page">
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Registrar Pagamento</h2>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Contribuição mensal de associado</p>
      </div>

      {/* ── Indicador de steps ── */}
      {step < 4 && (
        <div className="steps-row" style={{ marginBottom: '1.5rem' }}>
          {['Seus dados', 'Forma de pagto.', 'Confirmar'].map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: i < 2 ? 1 : 0 }}>
              <div style={{
                background: step > i ? 'var(--primary)' : 'var(--border)',
                color: step > i ? '#fff' : 'var(--text-muted)',
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
              }}>
                {step > i + 1 ? <Check size={14} /> : i + 1}
              </div>
              <span
                style={{ fontSize: '0.75rem', color: step === i + 1 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: step === i + 1 ? 600 : 400, whiteSpace: 'nowrap' }}
                className="hide-mobile"
              >
                {label}
              </span>
              {i < 2 && <div style={{ flex: 1, height: 1, background: step > i + 1 ? 'var(--primary)' : 'var(--border)', minWidth: 20 }} />}
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          STEP 1 — Dados e valor
      ══════════════════════════════════════════════ */}
      {step === 1 && (
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          }}
        >
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              Nome completo <Lock size={11} color="var(--text-muted)" />
            </label>
            <input className="form-input" value={name} readOnly
              style={{ background: 'var(--surface-alt)', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'not-allowed' }} />
          </div>
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              E-mail <Lock size={11} color="var(--text-muted)" />
            </label>
            <input className="form-input" value={email} readOnly
              style={{ background: 'var(--surface-alt)', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'not-allowed' }} />
          </div>
          <div>
            <label className="form-label">Valor da contribuição</label>
            <input
              className="form-input"
              placeholder="R$ 0,00"
              value={amount}
              onChange={e => setAmount(maskMoney(e.target.value))}
              style={{ background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
            />
          </div>
          <button
            className="btn btn-primary"
            disabled={!amount || parseMasked(amount) <= 0}
            onClick={() => setStep(2)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
          >
            Próximo <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          STEP 2 — Método de pagamento
      ══════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="card">
          <p style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.95rem' }}>Forma de pagamento:</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {METHODS.map(m => (
              <button
                key={m.id}
                onClick={() => setMethod(m)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                  padding: '1rem',
                  border: `2px solid ${method?.id === m.id ? m.color : 'var(--border)'}`,
                  borderRadius: 10,
                  background: method?.id === m.id ? m.color + '10' : 'var(--surface)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <div style={{ background: m.color + '18', borderRadius: 8, padding: '0.5rem' }}>
                  <m.icon size={22} color={m.color} />
                </div>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: method?.id === m.id ? m.color : 'var(--text-primary)' }}>
                  {m.label}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  {m.desc}
                </span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ChevronLeft size={16} /> Voltar
            </button>
            <button
              className="btn btn-primary"
              disabled={!method}
              onClick={() => setStep(3)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              Próximo <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          STEP 3 — Confirmar + QR Code
      ══════════════════════════════════════════════ */}
      {step === 3 && method && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Confirme o pagamento</h3>

          {/* Resumo */}
          <div style={{ background: 'var(--surface-alt)', borderRadius: 10, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[['Nome', name], ['E-mail', email || '—'], ['Valor', fmt(parseMasked(amount))], ['Método', method.label]].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* ── Bloco PIX estático ── */}
          {method.id === 'pix' && (
            <div style={{ border: '1px solid #bbf7d0', borderRadius: 10, overflow: 'hidden' }}>

              {/* Aguardando escaneamento */}
              {!pixConfirmed && (
                <div style={{ background: '#f0fdf4', padding: '1.25rem', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '0.9rem', color: '#065f46' }}>
                    <Zap size={16} color="#059669" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Contribuição mensal — R$ 15,00
                  </p>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', color: '#6b7280' }}>
                    Escaneie o QR Code com o app do banco
                  </p>

                  {/* QR Code estático */}
                  <div style={{ display: 'inline-block', background: '#fff', padding: '0.75rem', borderRadius: 10, border: '2px solid #bbf7d0', marginBottom: '1rem' }}>
                    <img
                      src={PIX_QR_IMAGE}
                      alt="QR Code PIX R$ 15,00"
                      width={200}
                      height={200}
                      style={{ display: 'block' }}
                    />
                  </div>

                  {/* Copia e cola */}
                  <div style={{ borderTop: '1px dashed #bbf7d0', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
                    <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', color: '#065f46', fontWeight: 600 }}>
                      Ou use o código Pix Copia e Cola:
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                      <code style={{
                        background: '#dcfce7', padding: '0.3rem 0.6rem', borderRadius: 6,
                        fontSize: '0.62rem', color: '#065f46', fontWeight: 600,
                        maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {PIX_COPIA_COLA}
                      </code>
                      <button className="btn btn-ghost" style={{ padding: '0.3rem', flexShrink: 0 }} onClick={copiarChavePix}>
                        {copied ? <Check size={16} color="#059669" /> : <Copy size={16} />}
                      </button>
                    </div>
                    {copied && <p style={{ fontSize: '0.72rem', color: '#059669', marginTop: '0.3rem' }}>✓ Código copiado!</p>}
                  </div>

                  {/* Botão confirmar após pagar */}
                  <button
                    className="btn btn-primary"
                    onClick={confirmarPixManual}
                    style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <CheckCircle size={16} /> Já realizei o pagamento
                  </button>
                </div>
              )}

              {/* Confirmado */}
              {pixConfirmed && (
                <div style={{ background: '#f0fdf4', padding: '1.5rem', textAlign: 'center' }}>
                  <CheckCircle size={40} color="#059669" style={{ marginBottom: '0.5rem' }} />
                  <p style={{ margin: 0, fontWeight: 700, color: '#065f46', fontSize: '1rem' }}>
                    Pagamento confirmado!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Botões */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn btn-secondary"
              onClick={voltarDoStep3}
              disabled={pixStatus === 'confirmed'}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <ChevronLeft size={16} /> Voltar
            </button>

            {/* Outros métodos — confirmação manual */}
            {method.id !== 'pix' && (
              <button
                className="btn btn-primary"
                onClick={() => confirmarPagamento(null)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <CheckCircle size={16} /> Confirmar pagamento
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          STEP 4 — Sucesso
      ══════════════════════════════════════════════ */}
      {step === 4 && receipt && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <CheckCircle size={36} color="#059669" />
          </div>
          <h3 style={{ margin: '0 0 0.25rem', color: '#065f46', fontSize: '1.1rem' }}>Pagamento confirmado!</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 0.25rem' }}>
            Protocolo: <strong>#{receipt.id.slice(-8).toUpperCase()}</strong>
          </p>
          {receipt.name && (
            <p style={{ color: '#065f46', fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem' }}>
              {receipt.name}
            </p>
          )}
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 0.4rem' }}>
            {fmt(receipt.value)} via {receipt.methodLabel} — {fmtDate(receipt.date)}
          </p>
          <p style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 700, margin: '0 0 1.5rem' }}>
            Você já realizou {paidCount} pagamento(s).
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={() => onShowReceipt && onShowReceipt(receipt)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <FileCheck size={16} /> Ver Nota Fiscal
            </button>
            <button
              className="btn btn-primary"
              onClick={reset}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <ChevronRight size={16} /> Novo pagamento
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulsar {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}