import { useState } from 'react';
import { Heart, Repeat, EyeOff, Eye, CheckCircle, ChevronRight, Mail } from 'lucide-react';
import { fmt, maskMoney, parseMasked, genId, fmtDate } from '../utils/format';

const CAUSES = [
  { id: 'educacao', label: 'Educação', color: '#3b82f6' },
  { id: 'saude', label: 'Saúde', color: '#ef4444' },
  { id: 'cultura', label: 'Cultura', color: '#8b5cf6' },
  { id: 'esporte', label: 'Esporte', color: '#f59e0b' },
  { id: 'assistencia', label: 'Assistência Social', color: '#059669' },
  { id: 'infraestrutura', label: 'Infraestrutura', color: '#6b7280' },
];
const QUICK = [20, 50, 100, 200];

export default function DonationForm({ onAdd }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [cause, setCause] = useState('');
  const [anon, setAnon] = useState(false);
  const [recurrent, setRecurrent] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = parseMasked(amount);
    const rec = { id: genId(), type: 'donation', name: anon ? 'Anônimo' : name, email, value, cause, anon, recurrent, message, date: new Date().toISOString() };
    onAdd(rec);
    setDone(rec);
  };
  const reset = () => { setName(''); setEmail(''); setAmount(''); setCause(''); setAnon(false); setRecurrent(false); setMessage(''); setDone(null); };

  if (done) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fdf2f8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <Heart size={36} color="#ec4899" fill="#ec4899" />
          </div>
          <h3 style={{ margin: '0 0 0.25rem', color: '#9d174d', fontSize: '1.1rem' }}>Doação registrada!</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 0.5rem' }}>Protocolo: <strong>#{done.id.slice(-8).toUpperCase()}</strong></p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 0.25rem' }}>{fmt(done.value)} para {CAUSES.find(c => c.id === done.cause)?.label || done.cause}</p>
          {done.recurrent && <p style={{ color: '#ec4899', fontSize: '0.8rem', margin: '0 0 1.5rem' }}>Doação recorrente ativada</p>}
          <button className="btn btn-primary" onClick={reset} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}><ChevronRight size={16} /> Nova doação</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Fazer uma Doação</h2>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Contribua para as causas da associação</p>
      </div>
      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="toggle-wrap">
          <div>
            <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Doação anônima</span>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Seu nome não será exibido publicamente</p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.4rem' }}>
            {anon ? <EyeOff size={16} color="var(--primary)" /> : <Eye size={16} color="var(--text-muted)" />}
            <div onClick={() => setAnon(!anon)} style={{ width: 40, height: 22, borderRadius: 11, background: anon ? 'var(--primary)' : 'var(--border)', position: 'relative', transition: 'background 0.2s', cursor: 'pointer' }}>
              <div style={{ position: 'absolute', top: 3, left: anon ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px #0002' }} />
            </div>
          </label>
        </div>

        {!anon && (
          <div><label className="form-label">Nome</label><input className="form-input" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} /></div>
        )}
        <div>
          <label className="form-label"><Mail size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />E-mail (opcional)</label>
          <input className="form-input" type="email" placeholder="para recibos e atualizações" value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        <div>
          <label className="form-label">Causa</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem' }}>
            {CAUSES.map(c => (
              <button key={c.id} type="button" onClick={() => setCause(c.id)} style={{ padding: '0.5rem', border: `2px solid ${cause === c.id ? c.color : 'var(--border)'}`, borderRadius: 8, background: cause === c.id ? c.color + '15' : 'transparent', color: cause === c.id ? c.color : 'var(--text-secondary)', fontWeight: cause === c.id ? 700 : 400, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.15s' }}>{c.label}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="form-label">Valor</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            {QUICK.map(v => (
              <button key={v} type="button" onClick={() => setAmount(String(v) + ',00')} style={{ padding: '0.35rem 0.75rem', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 }}>{fmt(v)}</button>
            ))}
          </div>
          <input className="form-input" placeholder="R$ 0,00" value={amount} onChange={e => setAmount(maskMoney(e.target.value))} />
        </div>

        <div>
          <label className="form-label">Mensagem (opcional)</label>
          <textarea className="form-input" rows={2} placeholder="Deixe uma mensagem para a associação..." value={message} onChange={e => setMessage(e.target.value)} style={{ resize: 'vertical' }} />
        </div>

        <div className="toggle-wrap">
          <div>
            <span style={{ fontWeight: 500, fontSize: '0.875rem' }}><Repeat size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Doação recorrente</span>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Repetir mensalmente este valor</p>
          </div>
          <div onClick={() => setRecurrent(!recurrent)} style={{ width: 40, height: 22, borderRadius: 11, background: recurrent ? 'var(--primary)' : 'var(--border)', position: 'relative', transition: 'background 0.2s', cursor: 'pointer' }}>
            <div style={{ position: 'absolute', top: 3, left: recurrent ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px #0002' }} />
          </div>
        </div>

        <button className="btn btn-primary" type="submit" disabled={!amount || !cause || (!anon && !name)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Heart size={16} /> Confirmar doação
        </button>
      </form>
    </div>
  );
}
