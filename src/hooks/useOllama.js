import { useState, useEffect, useCallback } from 'react';
import { checkOllamaStatus, analisarGasto, gerarRecomendacoes, gerarRelatorioNarrativo } from '../services/ollamaService';

export function useOllama() {
  const [status, setStatus] = useState({ online: false, models: [], checked: false });
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingRec, setLoadingRec] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [narrativeReport, setNarrativeReport] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    checkOllamaStatus().then(s => setStatus({ ...s, checked: true }));
    const interval = setInterval(() =>
      checkOllamaStatus().then(s => setStatus(prev => ({ ...s, checked: true }))),
    30000);
    return () => clearInterval(interval);
  }, []);

  const analyzeExpense = useCallback(async (desc, value) => {
    if (!desc || desc.length < 4) { setSuggestion(null); return null; }
    setLoadingAnalysis(true);
    setError('');
    try {
      const result = await analisarGasto(desc, value || 0);
      setSuggestion(result);
      return result;
    } catch (e) {
      setError('Análise indisponível: ' + e.message);
      setSuggestion(null);
      return null;
    } finally { setLoadingAnalysis(false); }
  }, []);

  const fetchRecommendations = useCallback(async (transactions, totals) => {
    setLoadingRec(true);
    setError('');
    try {
      const result = await gerarRecomendacoes(transactions, totals);
      setRecommendations(result);
      return result;
    } catch (e) {
      setError('Recomendações indisponíveis: ' + e.message);
      return null;
    } finally { setLoadingRec(false); }
  }, []);

  const fetchNarrativeReport = useCallback(async (transactions, totals, periodo) => {
    setLoadingReport(true);
    setError('');
    try {
      const result = await gerarRelatorioNarrativo(transactions, totals, periodo);
      setNarrativeReport(result);
      return result;
    } catch (e) {
      setError('Relatório indisponível: ' + e.message);
      return null;
    } finally { setLoadingReport(false); }
  }, []);

  const clearSuggestion = useCallback(() => setSuggestion(null), []);

  return {
    status, error,
    loadingAnalysis, loadingRec, loadingReport,
    suggestion, recommendations, narrativeReport,
    analyzeExpense, fetchRecommendations, fetchNarrativeReport, clearSuggestion,
  };
}
