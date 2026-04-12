import { Brain, Lightbulb, AlertCircle, TrendingUp, CheckCircle, RefreshCw, AlertTriangle, Star, ArrowRight } from 'lucide-react';

const PRIORITY_COLOR = { alta: 'red', media: 'yellow', baixa: 'blue' };
const PRIORITY_LABEL = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
const HEALTH_COLOR = { excelente: '#059669', boa: '#10b981', regular: '#f59e0b', critica: '#ef4444' };
const HEALTH_LABEL = { excelente: 'Excelente', boa: 'Boa', regular: 'Regular', critica: 'Crítica' };

function ScoreGauge({ score }) {
  const pct = Math.min(100, Math.max(0, score || 0));
  const color = pct >= 75 ? '#059669' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
      <div style={{ position: 'relative', width: 100, height: 100 }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="10" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${2 * Math.PI * 42 * pct / 100} ${2 * Math.PI * 42 * (1 - pct / 100)}`}
            strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: '1.5rem', color }}>{pct}</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>/100</span>
        </div>
      </div>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Score financeiro</span>
    </div>
  );
}

export default function AIRecommendations({ recommendations, loading, onRefresh }) {
  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div className="ai-thinking" style={{ justifyContent: 'center', marginBottom: '0.75rem' }}>
          <span className="ai-dot" /><span className="ai-dot" /><span className="ai-dot" />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>IA analisando dados financeiros...</p>
      </div>
    );
  }

  if (!recommendations) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <Brain size={40} color="var(--text-muted)" style={{ marginBottom: '0.75rem' }} />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500, margin: '0 0 0.25rem' }}>Recomendações de IA</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 1rem' }}>Gere análises inteligentes sobre a saúde financeira da associação</p>
        {onRefresh && (
          <button className="btn btn-primary" onClick={onRefresh} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Brain size={16} /> Analisar agora
          </button>
        )}
      </div>
    );
  }

  const rec = recommendations;
  const healthColor = HEALTH_COLOR[rec.saude_financeira] || '#6b7280';
  const healthLabel = HEALTH_LABEL[rec.saude_financeira] || rec.saude_financeira;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <ScoreGauge score={rec.score} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Brain size={20} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Análise de IA</span>
            <span style={{ background: healthColor, color: '#fff', borderRadius: 6, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600 }}>{healthLabel}</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 0.75rem', lineHeight: 1.5 }}>{rec.resumo_executivo}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowRight size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>{rec.proximo_passo}</span>
          </div>
        </div>
        {onRefresh && (
          <button className="btn btn-secondary" onClick={onRefresh} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', alignSelf: 'flex-start' }}>
            <RefreshCw size={14} /> Atualizar
          </button>
        )}
      </div>

      {/* Alertas */}
      {rec.alertas && rec.alertas.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <AlertCircle size={18} color="#ef4444" />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Alertas</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {rec.alertas.map((alerta, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.6rem 0.75rem' }}>
                <AlertTriangle size={15} color="#ef4444" style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: '0.85rem', color: '#b91c1c' }}>{alerta}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recomendações */}
      {rec.recomendacoes && rec.recomendacoes.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Lightbulb size={18} color="#f59e0b" />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Recomendações</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {rec.recomendacoes.map((r, i) => {
              const pColor = PRIORITY_COLOR[r.prioridade] || 'gray';
              const pLabel = PRIORITY_LABEL[r.prioridade] || r.prioridade;
              return (
                <div key={i} style={{ borderLeft: `3px solid var(--badge-${pColor}-text, #6b7280)`, paddingLeft: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    {r.tipo === 'corte' ? <TrendingUp size={14} color="#ef4444" /> :
                     r.tipo === 'investimento' ? <Star size={14} color="#059669" /> :
                     <CheckCircle size={14} color="#6b7280" />}
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.titulo}</span>
                    <span className={`badge badge-${pColor}`} style={{ marginLeft: 'auto' }}>{pLabel}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.descricao}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
