/**
 * Utilitário de Exportação de Movimentações para CSV.
 * Compatível com Microsoft Excel (UTF-8 BOM + separador ponto-e-vírgula).
 */

export interface MovimentacaoParaExportacao {
  data: string; // YYYY-MM-DD ou ISO datetime
  hora: string; // HH:mm
  tipo: 'Entrada' | 'Saída';
  codigo: string;
  item: string;
  quantidade: number;
  unidade: string;
  responsavel: string;
  nfe?: string;
  lote?: string;
  observacao?: string;
}

/**
 * Converte data ISO ou YYYY-MM-DD para DD/MM/AAAA.
 */
export function formatarDataBR(dataStr: string): string {
  if (!dataStr) return '';
  if (dataStr.includes('/')) return dataStr;
  const parteData = dataStr.split('T')[0];
  const partes = parteData.split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return dataStr;
}

/**
 * Gera string CSV formatada com BOM UTF-8 (\ufeff) e separador ';'.
 */
export function gerarMovimentacoesCSV(
  movimentacoes: MovimentacaoParaExportacao[]
): string {
  const colunas = [
    'Data',
    'Hora',
    'Movimento',
    'Código',
    'Item',
    'Quantidade',
    'Unidade',
    'Responsável',
    'NF-e',
    'Lote',
    'Observação',
  ];

  const linhas = [
    colunas,
    ...movimentacoes.map((m) => [
      formatarDataBR(m.data),
      m.hora || '00:00',
      m.tipo,
      m.codigo || '',
      m.item || '',
      m.quantidade,
      m.unidade || 'un',
      m.responsavel || '',
      m.nfe || '',
      m.lote || '',
      m.observacao || '',
    ]),
  ];

  return (
    '\ufeff' +
    linhas
      .map((row) =>
        row
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(';')
      )
      .join('\r\n')
  );
}

/**
 * Dispara download do arquivo CSV no navegador.
 */
export function exportarMovimentacoesCSV(
  movimentacoes: MovimentacaoParaExportacao[],
  nomeArquivo = 'relatorio-movimentacoes.csv'
): void {
  const csv = gerarMovimentacoesCSV(movimentacoes);
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', nomeArquivo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
