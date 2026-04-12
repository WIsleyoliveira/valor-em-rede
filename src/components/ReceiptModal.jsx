import { Printer, X, FileCheck, Building2, CheckCircle, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { fmt, fmtDate } from '../utils/format';

const METHOD_LABEL = { pix: 'PIX', boleto: 'Boleto Bancario', credito: 'Cartao de Credito', dinheiro: 'Dinheiro', donation: 'Doacao' };

export default function ReceiptModal({ transaction, onClose }) {
  if (!transaction) return null;
  const t = transaction;
  const isExpense = t.type === 'expense';
  const isDonation = t.type === 'donation';
  const proto = t.id?.slice(-10).toUpperCase();
  const now = new Date();

  const fields = [
    ['Protocolo', proto],
    ['Data de emissao', now.toLocaleDateString('pt-BR')],
    ['Data da transacao', fmtDate(t.date)],
    [isDonation ? 'Doador' : 'Nome', t.name || t.desc || '-'],
    !isExpense && !isDonation ? ['E-mail', t.email || '-'] : null,
    !isExpense && !isDonation ? ['Telefone', t.phone || '-'] : null,
    !isExpense && !isDonation ? ['Pagamento', METHOD_LABEL[t.method] || t.methodLabel || '-'] : null,
    isExpense ? ['Descricao', t.desc || '-'] : null,
    isExpense ? ['Categoria', t.category || '-'] : null,
    isDonation ? ['Causa', t.cause || '-'] : null,
    isDonation ? ['Recorrente', t.recurrent ? 'Sim' : 'Nao'] : null,
  ].filter(Boolean);

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a5' });
    const W = doc.internal.pageSize.getWidth();
    let y = 15;
    const lm = 14;
    const lineH = 7;
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, W, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('VALOR EM REDE', W / 2, 11, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Associacao Comunitaria - CNPJ: 00.000.000/0001-00', W / 2, 17, { align: 'center' });
    doc.text('Rua da Comunidade, 123 - Sao Paulo/SP', W / 2, 22, { align: 'center' });
    y = 36;
    const title = isExpense ? 'COMPROVANTE DE DESPESA' : isDonation ? 'RECIBO DE DOACAO' : 'RECIBO DE PAGAMENTO';
    doc.setFillColor(243, 244, 246);
    doc.rect(lm, y - 5, W - lm * 2, 10, 'F');
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(title, W / 2, y + 1, { align: 'center' });
    y += 13;
    doc.setFontSize(8.5);
    fields.forEach(([label, val], i) => {
      if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(lm, y - 4, W - lm * 2, lineH, 'F'); }
      doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
      doc.text(label + ':', lm + 2, y + 1);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
      const lines = doc.splitTextToSize(String(val), W - lm - 42);
      doc.text(lines[0], W - lm - 2, y + 1, { align: 'right' });
      y += lineH;
    });
    y += 5;
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(lm, y, W - lm * 2, 12, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('VALOR: ' + fmt(t.value || 0), W / 2, y + 8, { align: 'center' });
    y += 20;
    doc.setDrawColor(5, 150, 105);
    doc.setLineWidth(0.6);
    doc.roundedRect(lm + 12, y, W - lm * 2 - 24, 11, 2, 2);
    doc.setTextColor(5, 150, 105);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(isExpense ? 'DESPESA AUTORIZADA' : 'PAGAMENTO CONFIRMADO', W / 2, y + 7, { align: 'center' });
    y += 18;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 160);
    doc.line(lm, y, W - lm, y);
    y += 4;
    doc.text('Documento valido como comprovante para fins de transparencia financeira.', W / 2, y, { align: 'center' });
    doc.text('Gerado em: ' + now.toLocaleString('pt-BR') + ' | Valor em Rede (c) ' + now.getFullYear(), W / 2, y + 4, { align: 'center' });
    doc.save('NF-' + proto + '.pdf');
  };

  const handlePrint = () => {
    const c = document.getElementById('nf-print-area').innerHTML;
    const w = window.open('', '_blank');
    w.document.write('<!DOCTYPE html><html><head><title>Recibo</title><style>body{font-family:monospace;padding:2rem;max-width:600px;margin:0 auto}.nf-header{text-align:center;border-bottom:2px solid #000;padding-bottom:1rem;margin-bottom:1rem}.nf-row{display:flex;justify-content:space-between;padding:.3rem 0;border-bottom:1px dashed #ccc;font-size:.85rem}.nf-label{color:#555}.nf-value{font-weight:bold}.nf-total{font-size:1.2rem;font-weight:bold;text-align:center;border:2px solid #000;padding:.5rem;margin-top:1rem}.nf-stamp{text-align:center;border:3px double #059669;color:#059669;padding:.5rem;margin:1rem auto;width:fit-content;font-weight:bold}.nf-footer{font-size:.7rem;text-align:center;color:#888;margin-top:1.5rem;border-top:1px solid #ccc;padding-top:.5rem}</style></head><body>' + c + '</body></html>');
    w.document.close(); w.print();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileCheck size={20} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Nota Fiscal / Recibo</span>
          </div>
          <button className="btn btn-ghost" style={{ padding: '0.3rem' }} onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: '1.25rem' }}>
          <div id="nf-print-area" className="nf-paper">
            <div className="nf-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Building2 size={20} />
                <strong>VALOR EM REDE</strong>
              </div>
              <div style={{ fontSize: '0.75rem' }}>Associação Comunitária — CNPJ: 00.000.000/0001-00</div>
              <div style={{ fontSize: '0.75rem' }}>Rua da Comunidade, 123 — São Paulo/SP</div>
              <div style={{ marginTop: '0.5rem', fontWeight: 700, fontSize: '0.9rem', borderTop: '1px dashed #000', paddingTop: '0.5rem' }}>
                {isExpense ? 'COMPROVANTE DE DESPESA' : isDonation ? 'RECIBO DE DOAÇÃO' : 'RECIBO DE PAGAMENTO'}
              </div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              {fields.map(([l, v]) => v && (
                <div key={l} className="nf-row">
                  <span className="nf-label">{l}:</span>
                  <span className="nf-value">{v}</span>
                </div>
              ))}
            </div>
            <div className="nf-total">VALOR: {fmt(t.value || 0)}</div>
            <div className="nf-stamp">
              <CheckCircle size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              {isExpense ? 'DESPESA AUTORIZADA' : 'PAGAMENTO CONFIRMADO'}
            </div>
            <div className="nf-footer">
              <p>Comprovante de {isExpense ? 'despesa' : isDonation ? 'doação' : 'pagamento'} para fins de transparência financeira.</p>
              <p>Gerado em: {now.toLocaleString('pt-BR')} | Valor em Rede &copy; {now.getFullYear()}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1, minWidth: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <X size={15} /> Fechar
            </button>
            <button className="btn btn-secondary" onClick={handlePrint} style={{ flex: 1, minWidth: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <Printer size={15} /> Imprimir
            </button>
            <button className="btn btn-primary" onClick={handleDownloadPDF} style={{ flex: 1, minWidth: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <Download size={15} /> Baixar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
