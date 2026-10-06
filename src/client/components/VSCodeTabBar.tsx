import React, { useEffect, useMemo, useRef } from 'react';
import { FileCode, X } from 'lucide-react';

interface VSCodeTabBarProps {
  openFiles: string[];
  activeFile: string;
  language: string;
  isDirty?: boolean;
  onSelectFile: (file: string) => void;
  onCloseFile: (file: string) => void;
  onSaveFile?: () => void;
}

function getFileIcon(filename: string) {
  if (filename.endsWith('.py')) return <span className="text-amber-400 font-bold text-[10px]">PY</span>;
  if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return <span className="text-cyan-400 font-bold text-[10px]">TS</span>;
  if (filename.endsWith('.go')) return <span className="text-sky-400 font-bold text-[10px]">GO</span>;
  if (filename.endsWith('.rs')) return <span className="text-orange-400 font-bold text-[10px]">RS</span>;
  if (filename.endsWith('.json')) return <span className="text-emerald-400 font-bold text-[10px]">{}</span>;
  if (filename.endsWith('.sql')) return <span className="text-purple-400 font-bold text-[10px]">SQL</span>;
  return <FileCode className="w-3.5 h-3.5 text-slate-400" />;
}

/** Nome do arquivo e pasta pai ("components"), separando por / ou \\. */
function splitPath(file: string): { name: string; parent: string } {
  const parts = file.split(/[\\/]/).filter(Boolean);
  return { name: parts[parts.length - 1] || file, parent: parts.length > 1 ? parts[parts.length - 2] : '' };
}

export function VSCodeTabBar({
  openFiles,
  activeFile,
  language,
  isDirty,
  onSelectFile,
  onCloseFile,
  onSaveFile,
}: VSCodeTabBarProps) {
  const stripRef = useRef<HTMLDivElement>(null);

  // Só o nome do arquivo na aba; a pasta pai aparece (discreta) apenas quando há nomes repetidos.
  const labels = useMemo(() => {
    const counts = new Map<string, number>();
    const parsed = openFiles.map((file) => ({ file, ...splitPath(file) }));
    parsed.forEach(({ name }) => counts.set(name, (counts.get(name) || 0) + 1));
    return new Map(
      parsed.map(({ file, name, parent }) => [file, { name, hint: (counts.get(name) || 0) > 1 ? parent : '' }])
    );
  }, [openFiles]);

  // Mantém a aba ativa visível quando há muitas abertas.
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [activeFile, openFiles.length]);

  return (
    <div className="h-9 bg-[#252526] border-b border-[#2b2b2b] flex items-center justify-between px-1 select-none shrink-0 font-sans text-xs">
      {/* Scrollable Editor File Tabs (Only Documents explicitly opened) */}
      <div
        ref={stripRef}
        role="tablist"
        className="flex items-center overflow-x-auto no-scrollbar flex-1 h-full"
        onWheel={(e) => {
          // Roda do mouse rola as abas na horizontal.
          if (e.deltaY !== 0 && stripRef.current) stripRef.current.scrollLeft += e.deltaY;
        }}
      >
        {openFiles.length === 0 ? (
          <div className="px-3 text-[11px] text-slate-500 italic font-mono flex items-center gap-2">
            <span>Nenhum arquivo aberto — Selecione um arquivo no Explorer para abrir</span>
          </div>
        ) : (
          openFiles.map((file) => {
            const isActive = activeFile === file;
            const showDirty = isActive && isDirty;
            const label = labels.get(file) || { name: file, hint: '' };
            return (
              <div
                key={file}
                role="tab"
                aria-selected={isActive}
                title={file}
                onClick={() => onSelectFile(file)}
                // Clique com o botão do meio fecha a aba, como no VS Code.
                onAuxClick={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    onCloseFile(file);
                  }
                }}
                className={`group relative h-full pl-3 pr-1.5 flex items-center gap-2 cursor-pointer border-r border-[#2b2b2b] transition shrink-0 max-w-[14rem] ${
                  isActive
                    ? 'bg-[#1e1e1e] text-white font-medium border-t-2 border-t-cyan-400'
                    : 'bg-[#2d2d2d] text-slate-400 hover:bg-[#2a2a2a] hover:text-slate-200'
                }`}
              >
                <span className="shrink-0 w-4 flex justify-center">{getFileIcon(file)}</span>
                <span className="truncate font-mono text-xs min-w-0">{label.name}</span>
                {label.hint && (
                  <span className="truncate text-[10px] text-slate-500 font-mono min-w-0 max-w-[5rem]">{label.hint}</span>
                )}

                {/* Fechar: o ponto de "não salvo" ocupa o mesmo lugar do X e vira X ao passar o mouse */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseFile(file);
                  }}
                  className={`relative shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-[#3c3c3c] transition ${
                    isActive || showDirty ? '' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  title={showDirty ? 'Alterações não salvas — fechar aba' : 'Fechar aba'}
                  aria-label={`Fechar ${label.name}`}
                >
                  {showDirty && (
                    <span className="absolute w-2 h-2 rounded-full bg-amber-400 group-hover:hidden" />
                  )}
                  <X className={`w-3 h-3 text-slate-400 hover:text-white ${showDirty ? 'hidden group-hover:block' : ''}`} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Right Tab Bar Actions */}
      <div className="flex items-center gap-2 px-2 border-l border-[#2b2b2b] bg-[#252526] h-full shrink-0">
        <span className="text-[10px] text-cyan-400 font-mono bg-[#1e1e1e] px-2 py-0.5 rounded border border-[#333] uppercase">
          {language || 'TXT'}
        </span>
      </div>
    </div>
  );
}
