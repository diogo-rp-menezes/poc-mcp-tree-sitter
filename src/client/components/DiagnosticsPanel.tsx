import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Search,
  Code2,
  Copy,
  Check,
  FileCode,
  ArrowUpRight,
  ExternalLink,
  Table as TableIcon,
  List as ListIcon,
  Terminal,
} from 'lucide-react';
import { ASTNode, SyntaxDiagnostic } from '../types';
import { findJsxBareAmpersandErrors } from '../lint/lint';

export interface DiagnosticsPanelProps {
  ast?: ASTNode | null;
  hasError?: boolean;
  errors?: SyntaxDiagnostic[];
  filename?: string;
  activeFile?: string;
  language?: string;
  className?: string;
  onJumpToLine?: (line: number) => void;
  onSelectNode?: (node: ASTNode | SyntaxDiagnostic) => void;
}

/**
 * Traverses an ASTNode to collect any ERROR or MISSING syntax nodes as fallback
 */
function collectASTErrorsFallback(node: ASTNode | null | undefined): SyntaxDiagnostic[] {
  if (!node) return [];
  const results: SyntaxDiagnostic[] = [];

  function walk(curr: ASTNode) {
    const isError = curr.type === 'ERROR' || curr.type.includes('ERROR');
    const isMissing = curr.type.startsWith('MISSING') || curr.type === 'MISSING';

    if (isError || isMissing) {
      results.push({
        type: curr.type,
        message: isMissing
          ? `Token sintático ausente '${curr.type}'`
          : `Erro de sintaxe próximo a '${(curr.text || '').trim().slice(0, 35)}'`,
        isMissing,
        startPosition: { row: curr.startPoint.row, column: curr.startPoint.column },
        endPosition: { row: curr.endPoint.row, column: curr.endPoint.column },
        startByte: curr.startByte,
        endByte: curr.endByte,
        text: curr.text,
      });
    }

    if (curr.children && Array.isArray(curr.children)) {
      for (const child of curr.children) {
        walk(child);
      }
    }
  }

  walk(node);
  return results;
}

export function DiagnosticsPanel({
  ast,
  hasError: explicitHasError,
  errors: explicitErrors,
  filename,
  activeFile,
  language,
  className,
  onJumpToLine,
  onSelectNode,
}: DiagnosticsPanelProps) {
  const currentFile = activeFile || filename;
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'ERROR' | 'MISSING'>('ALL');
  const [viewLayout, setViewLayout] = useState<'table' | 'list'>('table');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // O mesmo painel vive na barra lateral (~280px) e no modal (>1000px): o layout acompanha a largura
  // real do próprio painel, não a da janela.
  const rootRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width < 560));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const layout = compact ? 'list' : viewLayout;

  // 1. Reads 'ast.errors' from the application state, with prop/fallback support
  // Mesmo critério do editor: um '&' solto em texto JSX é válido (a gramática é que o rejeita),
  // então não é listado como erro aqui.
  const { allDiagnostics, ignoredCount } = useMemo(() => {
    let raw: SyntaxDiagnostic[] = [];
    if (explicitErrors && Array.isArray(explicitErrors)) {
      raw = explicitErrors;
    } else if (ast?.errors && Array.isArray(ast.errors)) {
      raw = ast.errors;
    } else if (ast) {
      raw = collectASTErrorsFallback(ast);
    }
    const ignored = findJsxBareAmpersandErrors(ast);
    if (ignored.size === 0) return { allDiagnostics: raw, ignoredCount: 0 };
    const kept = raw.filter(
      (d) => d.isMissing || !ignored.has(`${d.startPosition.row}:${d.startPosition.column}`)
    );
    return { allDiagnostics: kept, ignoredCount: raw.length - kept.length };
  }, [ast, explicitErrors]);

  const hasSyntaxError = useMemo(() => {
    if (explicitHasError !== undefined) return explicitHasError;
    // O hasError da raiz continua true por causa do '&' ignorado: nesse caso vale a lista filtrada.
    if (ignoredCount > 0) return allDiagnostics.length > 0;
    if (ast?.hasError !== undefined) return ast.hasError;
    return allDiagnostics.length > 0;
  }, [explicitHasError, ast, allDiagnostics, ignoredCount]);

  // Filter diagnostics by search query and type filter
  const filteredDiagnostics = useMemo(() => {
    return allDiagnostics.filter((diag) => {
      // Type filter
      if (selectedType === 'ERROR' && diag.isMissing) return false;
      if (selectedType === 'MISSING' && !diag.isMissing) return false;

      // Text query match
      if (!filterQuery.trim()) return true;
      const q = filterQuery.toLowerCase();
      const lineStr = `linha ${diag.startPosition.row + 1} line ${diag.startPosition.row + 1}`;
      const msg = (diag.message || '').toLowerCase();
      const txt = (diag.text || '').toLowerCase();
      const typ = diag.type.toLowerCase();

      return msg.includes(q) || txt.includes(q) || typ.includes(q) || lineStr.includes(q);
    });
  }, [allDiagnostics, selectedType, filterQuery]);

  const errorCount = useMemo(
    () => allDiagnostics.filter((d) => !d.isMissing).length,
    [allDiagnostics]
  );
  const missingCount = useMemo(
    () => allDiagnostics.filter((d) => d.isMissing).length,
    [allDiagnostics]
  );

  const filterPills = [
    { id: 'ALL', label: 'Todos', count: allDiagnostics.length, Icon: null, active: 'bg-cyan-600 text-white', idle: 'text-slate-300 hover:text-white' },
    { id: 'ERROR', label: 'ERROR', count: errorCount, Icon: XCircle, active: 'bg-red-700 text-white', idle: 'text-red-400 hover:text-red-300' },
    { id: 'MISSING', label: 'MISSING', count: missingCount, Icon: AlertTriangle, active: 'bg-amber-700 text-white', idle: 'text-amber-400 hover:text-amber-300' },
  ] as const;

  const handleCopy = (diag: SyntaxDiagnostic, idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `[${diag.type}] Linha ${diag.startPosition.row + 1}:${diag.startPosition.column + 1} - ${diag.message || ''} (${diag.text || ''})`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const handleNavigate = (diag: SyntaxDiagnostic, idx: number) => {
    if (onJumpToLine) {
      onJumpToLine(diag.startPosition.row);
    }
    if (onSelectNode) {
      onSelectNode({
        id: `diagnostic_${idx}`,
        type: diag.type,
        isNamed: true,
        startPoint: diag.startPosition,
        endPoint: diag.endPosition,
        startByte: diag.startByte,
        endByte: diag.endByte,
        text: diag.text,
        children: [],
      } as ASTNode);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`flex flex-col min-w-0 ${
        className || 'h-full w-full'
      } bg-[#1e1e1e] text-slate-200 select-none text-xs font-sans overflow-hidden`}
    >
      {/* Top Header & Diagnostics Summary */}
      <div className={`${compact ? 'p-2.5 space-y-2' : 'p-3.5 space-y-3'} border-b border-[#2b2b2b] bg-[#252526] shrink-0`}>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-100 text-sm tracking-wide flex items-baseline gap-2 min-w-0">
                <span className="truncate">Diagnósticos de Sintaxe</span>
                {!compact && (
                  <span className="text-[10px] text-slate-400 font-mono font-normal shrink-0">(Tree-sitter AST)</span>
                )}
              </div>
              {!compact && (
                <div className="text-[11px] text-slate-400">
                  Detecção de nós <code className="text-red-300 bg-red-950/60 px-1 rounded">ERROR</code> e{' '}
                  <code className="text-amber-300 bg-amber-950/60 px-1 rounded">MISSING</code> via{' '}
                  <span className="font-mono text-cyan-300">ast.errors</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Badge & View Mode Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {hasSyntaxError || allDiagnostics.length > 0 ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-red-950/80 border border-red-700/70 text-red-300 flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <span>
                  {allDiagnostics.length}{' '}
                  {allDiagnostics.length === 1
                    ? compact ? 'problema' : 'problema detectado'
                    : compact ? 'problemas' : 'problemas detectados'}
                </span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-950/80 border border-emerald-700/70 text-emerald-300 flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{compact ? 'Íntegra' : 'Sintaxe Íntegra (0 erros)'}</span>
              </span>
            )}

            {/* Table / List layout switch (só no modo largo: a tabela não cabe em painel estreito) */}
            {!compact && (
              <div className="flex items-center border border-[#3c3c3c] rounded bg-[#1e1e1e] p-0.5">
                <button
                  onClick={() => setViewLayout('table')}
                  className={`p-1 rounded text-xs transition ${
                    viewLayout === 'table' ? 'bg-[#333] text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Modo Tabela de Erros"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewLayout('list')}
                  className={`p-1 rounded text-xs transition ${
                    viewLayout === 'list' ? 'bg-[#333] text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Modo Lista de Diagnósticos"
                >
                  <ListIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div
          className={`flex ${
            compact ? 'flex-col gap-2' : 'items-center justify-between gap-2'
          } pt-2 border-t border-[#333]/70`}
        >
          <div className={`flex ${compact ? 'flex-col items-stretch' : 'items-center flex-wrap'} gap-2 min-w-0`}>
            <div
              className="flex items-center gap-1.5 text-xs text-slate-300 font-mono bg-[#181818] px-2 py-1 rounded border border-[#3c3c3c] min-w-0"
              title={currentFile || undefined}
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className={`truncate ${compact ? 'flex-1' : 'max-w-[180px]'}`}>
                {compact ? currentFile?.split('/').pop() || 'Buffer Ativo' : currentFile || 'Buffer Ativo'}
              </span>
              <span className="text-slate-500 uppercase text-[10px] shrink-0">({language || 'code'})</span>
            </div>

            <div className={compact ? 'grid grid-cols-3 gap-1' : 'flex items-center gap-1'}>
              {filterPills.map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setSelectedType(pill.id)}
                  className={`${compact ? 'px-1.5' : 'px-2.5'} py-1 rounded text-[11px] font-medium transition flex items-center justify-center gap-1.5 min-w-0 whitespace-nowrap ${
                    selectedType === pill.id
                      ? `${pill.active} shadow-sm`
                      : `bg-[#181818] ${pill.idle} hover:bg-[#2a2a2a] border border-[#3c3c3c]`
                  }`}
                >
                  {pill.Icon && !compact && <pill.Icon className="w-3 h-3 shrink-0" />}
                  <span className="truncate">
                    {pill.label} ({pill.count})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Search text filter */}
          <div className={`relative ${compact ? 'w-full' : 'min-w-[220px]'}`}>
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={compact ? 'Filtrar...' : 'Filtrar por mensagem, linha ou token...'}
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full bg-[#181818] border border-[#3c3c3c] rounded pl-8 pr-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Main Content: Table or List */}
      <div className={`flex-1 overflow-auto ${compact ? 'p-2' : 'p-3'}`}>
        {filteredDiagnostics.length === 0 ? (
          <div className={`flex flex-col items-center justify-center text-center text-slate-400 space-y-3 bg-[#252526]/50 rounded-lg border border-[#333]/50 ${compact ? 'py-6 px-3' : 'h-64 p-6'}`}>
            {allDiagnostics.length === 0 ? (
              <>
                <div className="w-12 h-12 rounded-full bg-emerald-950/70 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shadow-inner">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="font-semibold text-slate-100 text-sm">Nenhum Erro de Sintaxe Detectado</div>
                <div className="text-xs text-slate-400 font-mono max-w-md">
                  {compact ? (
                    <>Sem nós <code className="text-emerald-300">ERROR</code> ou <code className="text-emerald-300">MISSING</code>.</>
                  ) : (
                    <>A árvore gerada pelo parser Tree-sitter para este arquivo não contém nós <code className="text-emerald-300">ERROR</code> ou <code className="text-emerald-300">MISSING</code>. Todas as estruturas sintáticas estão em conformidade com a gramática.</>
                  )}
                </div>
              </>
            ) : (
              <>
                <Search className="w-8 h-8 text-slate-600" />
                <div className="text-sm font-medium text-slate-300">Nenhum diagnóstico corresponde aos filtros</div>
                <button
                  onClick={() => {
                    setFilterQuery('');
                    setSelectedType('ALL');
                  }}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  Limpar filtros
                </button>
              </>
            )}
          </div>
        ) : layout === 'table' ? (
          /* Table View of Syntax Errors */
          <div className="border border-[#3c3c3c] rounded-lg overflow-hidden bg-[#252526] shadow-sm">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-[#3c3c3c] bg-[#1f1f1f] text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-28">Tipo</th>
                  <th className="py-2.5 px-3 w-44">Faixa Linha / Coluna</th>
                  <th className="py-2.5 px-3">Descrição do Erro</th>
                  <th className="py-2.5 px-3 w-52">Token Afetado</th>
                  <th className="py-2.5 px-3 w-36 text-right">Ação / Navegação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333]">
                {filteredDiagnostics.map((diag, idx) => {
                  const startLine = diag.startPosition.row + 1;
                  const endLine = diag.endPosition.row + 1;
                  const startCol = diag.startPosition.column + 1;
                  const endCol = diag.endPosition.column + 1;
                  const isSingleLine = startLine === endLine;

                  const rangeLabel = isSingleLine
                    ? `Ln ${startLine}:${startCol}–${endCol}`
                    : `Ln ${startLine}:${startCol} → Ln ${endLine}:${endCol}`;

                  return (
                    <tr
                      key={`${diag.type}-${idx}-${diag.startByte}`}
                      className={`hover:bg-[#2a2d2e] transition cursor-pointer group ${
                        diag.isMissing ? 'bg-amber-950/10' : 'bg-red-950/10'
                      }`}
                      onClick={() => handleNavigate(diag, idx)}
                    >
                      {/* 1. Type / Severity */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        {diag.isMissing ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-900/60 text-amber-300 border border-amber-700/60">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>MISSING</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-900/60 text-red-300 border border-red-700/60">
                            <XCircle className="w-2.5 h-2.5" />
                            <span>ERROR</span>
                          </span>
                        )}
                      </td>

                      {/* 2. Line / Column Range */}
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-cyan-300 font-medium">
                        {rangeLabel}
                      </td>

                      {/* 3. Short Error Message */}
                      <td className="py-2 px-3 text-slate-200">
                        <div className="font-medium text-[11px] leading-snug">
                          {diag.message || (diag.isMissing ? 'Token sintático ausente' : 'Erro de sintaxe')}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Offset: bytes {diag.startByte}..{diag.endByte}
                        </div>
                      </td>

                      {/* 4. Token Snippet */}
                      <td className="py-2 px-3">
                        {diag.text ? (
                          <code className="block max-w-[200px] truncate bg-[#181818] border border-[#333] px-2 py-0.5 rounded text-[10px] font-mono text-amber-200 group-hover:border-slate-500">
                            {diag.text.trim() || '<espaço em branco>'}
                          </code>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">&lt;ausente&gt;</span>
                        )}
                      </td>

                      {/* 5. Clickable Action Link to onJumpToLine */}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigate(diag, idx);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-950/80 hover:bg-cyan-800 border border-cyan-700/60 text-cyan-200 hover:text-white font-mono text-[11px] font-medium transition shadow-sm"
                            title={`Navegar para Linha ${startLine}`}
                          >
                            <span>Ir para Linha {startLine}</span>
                            <ExternalLink className="w-3 h-3 text-cyan-300" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleCopy(diag, idx, e)}
                            className="p-1 rounded hover:bg-[#333] text-slate-400 hover:text-slate-200 transition"
                            title="Copiar linha e diagnóstico"
                          >
                            {copiedIndex === idx ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* List / Cards View */
          <div className={`grid grid-cols-1 ${compact ? '' : 'md:grid-cols-2'} gap-2.5`}>
            {filteredDiagnostics.map((diag, idx) => {
              const startLine = diag.startPosition.row + 1;
              const endLine = diag.endPosition.row + 1;
              const startCol = diag.startPosition.column + 1;
              const endCol = diag.endPosition.column + 1;
              const isSingleLine = startLine === endLine;

              const rangeLabel = isSingleLine
                ? `Linha ${startLine}:${startCol}–${endCol}`
                : `Linhas ${startLine}:${startCol} → ${endLine}:${endCol}`;

              return (
                <div
                  key={`${diag.type}-${idx}-${diag.startByte}`}
                  onClick={() => handleNavigate(diag, idx)}
                  className={`p-3 rounded-lg border transition cursor-pointer group text-xs flex flex-col justify-between ${
                    diag.isMissing
                      ? 'bg-amber-950/20 border-amber-900/60 hover:bg-amber-950/30 hover:border-amber-700'
                      : 'bg-red-950/20 border-red-900/60 hover:bg-red-950/30 hover:border-red-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#333]/60 mb-2">
                      <div className="flex items-center gap-1.5">
                        {diag.isMissing ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-900/60 text-amber-300 border border-amber-700/50">
                            MISSING
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-900/60 text-red-300 border border-red-700/50">
                            ERROR
                          </span>
                        )}
                        <span className="font-mono text-cyan-300 font-semibold">{rangeLabel}</span>
                      </div>

                      <button
                        onClick={(e) => handleCopy(diag, idx, e)}
                        className="p-1 hover:bg-[#333] rounded text-slate-400 hover:text-slate-200 transition"
                        title="Copiar diagnóstico"
                      >
                        {copiedIndex === idx ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    <div className="text-slate-200 font-normal leading-relaxed text-xs">
                      {diag.message || (diag.isMissing ? 'Nó sintático ausente' : 'Erro de sintaxe')}
                    </div>

                    {diag.text && (
                      <div className="mt-2 p-2 bg-[#181818] border border-[#333] rounded font-mono text-[11px] text-amber-200 truncate">
                        <code>{diag.text.trim() || '<vazio>'}</code>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#333]/50 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500">
                      Offset: {diag.startByte}..{diag.endByte}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigate(diag, idx);
                      }}
                      className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-200 font-mono text-xs font-semibold hover:underline"
                    >
                      <span>Ir para Linha {startLine}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Metrics & State Details */}
      <div className="px-2.5 py-2 border-t border-[#2b2b2b] bg-[#252526] text-[11px] text-slate-400 font-mono flex flex-wrap items-center justify-between gap-x-3 gap-y-1 shrink-0">
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
          <div className="flex items-center gap-1">
            {!compact && <span className="text-slate-500">Tree-sitter State:</span>}
            <span className={hasSyntaxError ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
              {hasSyntaxError ? 'hasError = true' : 'hasError = false'}
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 text-slate-400">
            <span>ast.errors:</span>
            <span className="text-slate-200 font-semibold">
              {allDiagnostics.length}
              {compact ? '' : ' registros'}
            </span>
          </div>
        </div>

        {(!compact || filteredDiagnostics.length !== allDiagnostics.length) && (
          <div className="text-slate-400">
            Exibindo <span className="text-white font-semibold">{filteredDiagnostics.length}</span> de{' '}
            <span className="text-white font-semibold">{allDiagnostics.length}</span>
            {compact ? '' : ' erros'}
          </div>
        )}
      </div>
    </div>
  );
}
