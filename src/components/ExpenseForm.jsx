import { useState, useEffect, useRef } from 'react';
import { Receipt, Tag, AlertTriangle, Sparkles, CheckCircle, Loader, FileCheck } from 'lucide-react';
import { fmt, maskMoney, parseMasked, genId, fmtDate, todayLocal } from '../utils/format';
import { useOllama } from '../hooks/useOllama';

const URGENCY_COLOR = { alta: '#ef4444', media: '#f59e0b', baixa: '#059669' };

export default function ExpenseForm({ onAdd, onShowReceipt }) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [note, setNote] = useState('');
  const [done, setDone] = useState(null);
  const { analyzeExpense, suggestion, loadingAnalysis, clearSuggestion } = useOllama();
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (desc.length >= 5) analyzeExpense(desc, parseMasked(amount));
      else clearSuggestion();
    }, 900);
    return () => clearTimeout(debounceRef.current);
  }, [desc, amount]);

  useEffect(() => {
    if (suggestion?.categoria && !category) setCategory(suggestion.categoria);
  }, [suggestion]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = parseMasked(amount);
    // Salva como "YYYY-MM-DD" puro (sem conversão UTC) para evitar salto de dia
    const rec = { id: genId(), type: 'expense', desc, value, category: category || suggestion?.categoria || 'Outros', date, note, aiSuggestion: suggestion };
    onAdd(rec);
    setDone(rec);
  };
  const reset = () => { setDesc(''); setAmount(''); setCategory(''); setDate(todayLocal()); setNote(''); setDone(null); clearSuggestion(); };

  if (done) return (
    <div className="page">
      <div className="card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff7ed', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
          <Receipt size={36} color="#f59e0b" />
        </div>
        <h3 style={{ margin: '0 0 0.25rem', color: '#92400e' }}>Despesa registrada!</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 0.25rem' }}>{done.desc} — {fmt(done.value)}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 1.5rem' }}>Categoria: {done.category}</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => onShowReceipt && onShowReceipt(done)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileCheck size={16} /> Ver Nota Fiscal
          </button>
          <button className="btn btn-primary" onClick={reset} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Receipt size={16} /> Nova despesa
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Registrar Despesa</h2>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>A IA categoriza automaticamente</p>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="form-label">Descrição</label>
            <input className="form-input" placeholder="Ex: Compra de material para reunião" value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div><label className="form-label">Valor</label><input className="form-input" placeholder="R$ 0,00" value={amount} onChange={e => setAmount(maskMoney(e.target.value))} /></div>
            <div><label className="form-label">Data</label><input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          </div>
          <div>
            <label className="form-label"><Tag size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Categoria</label>
            <input className="form-input" placeholder="Ex: Alimentação, Transporte..." value={category} onChange={e => setCategory(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Observação (opcional)</label>
            <textarea className="form-input" rows={2} placeholder="Detalhes adicionais..." value={note} onChange={e => setNote(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
        </div>

        {/* AI Box */}
        {(loadingAnalysis || suggestion) && (
          <div className="ai-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {loadingAnalysis ? <Loader size={16} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} color="var(--primary)" />}
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--primary)' }}>Análise de IA</span>
              {loadingAnalysis && (
                <div className="ai-thinking"><span className="ai-dot" /><span className="ai-dot" /><span className="ai-dot" /></div>
              )}
            </div>

            {suggestion && !loadingAnalysis && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 6, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600 }}>{suggestion.categoria}</span>
                  {suggestion.subcategoria && <span className="badge badge-blue">{suggestion.subcategoria}</span>}
                  {suggestion.urgencia && <span style={{ background: URGENCY_COLOR[suggestion.urgencia] + '20', color: URGENCY_COLOR[suggestion.urgencia], borderRadius: 6, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600 }}>{suggestion.urgencia?.toUpperCase()}</span>}
                  <span className="badge badge-gray">{Math.round((suggestion.confianca || 0) * 100)}% confiança</span>
                </div>
                {suggestion.resumo && <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{suggestion.resumo}</p>}
                {suggestion.recomendacao && (
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '0.5rem 0.75rem' }}>
                    <AlertTriangle size={14} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: '0.8rem', color: '#92400e' }}>{suggestion.recomendacao}</span>
                  </div>
                )}
                {suggestion.alerta && (
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '0.5rem 0.75rem' }}>
                    <AlertTriangle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: '0.8rem', color: '#b91c1c' }}>{suggestion.alerta}</span>
                  </div>
                )}
                {suggestion.tags && suggestion.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {suggestion.tags.map(t => <span key={t} className="badge badge-gray">{t}</span>)}
                  </div>
                )}
                <button type="button" className="btn btn-ghost" style={{ fontSize: '0.75rem', color: 'var(--primary)', padding: '0.15rem 0', width: 'fit-content' }} onClick={() => { if (suggestion?.categoria) setCategory(suggestion.categoria); }}>
                  <CheckCircle size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Aplicar categoria sugerida
                </button>
              </div>
            )}
          </div>
        )}

        <button className="btn btn-primary" type="submit" disabled={!desc || !amount} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Receipt size={16} /> Registrar despesa
        </button>
      </form>
    </div>
  );
}
