import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronRight,
  Folder,
  FileCode,
  FolderGit2,
  Copy,
  Check,
  ChevronDown,
  ArrowUp,
} from 'lucide-react';
import { ProjectInfo } from '../types';

interface BreadcrumbBarProps {
  activeProject: string;
  activeFile: string;
  projectPath?: string;
  projectFiles: string[];
  language: string;
  projects?: ProjectInfo[];
  onSelectProject: (proj: string) => void;
  onSelectFile: (file: string) => void;
  onOpenProjectManager?: () => void;
  onToast?: (msg: string) => void;
}

interface PathSegment {
  name: string;
  fullPath: string; // diretório acumulado ou caminho do arquivo
  isDirectory: boolean;
}

interface MenuState {
  id: string; // 'project' ou o fullPath do segmento
  left: number;
  top: number;
}

interface MenuFile {
  path: string;
  label: string; // nome do arquivo
  dir: string; // subpasta relativa ao menu (com "/" no fim), vazia se direto na pasta
}

const MENU_WIDTH = 272;

export function BreadcrumbBar({
  activeProject,
  activeFile,
  projectPath,
  projectFiles,
  language,
  projects = [],
  onSelectProject,
  onSelectFile,
  onOpenProjectManager,
  onToast,
}: BreadcrumbBarProps) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  // Fecha o menu com clique fora ou Esc.
  useEffect(() => {
    if (!menu) return;
    const onMouseDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setMenu(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menu]);

  // Troca de arquivo fecha o menu e mantém o fim do caminho (o arquivo atual) visível.
  useEffect(() => {
    setMenu(null);
    const strip = stripRef.current;
    if (strip) strip.scrollLeft = strip.scrollWidth;
  }, [activeFile]);

  const segments = useMemo<PathSegment[]>(() => {
    if (!activeFile) return [];
    const parts = activeFile.split('/').filter(Boolean);
    let accumulated = '';
    return parts.map((part, i) => {
      accumulated = accumulated ? `${accumulated}/${part}` : part;
      return { name: part, fullPath: accumulated, isDirectory: i < parts.length - 1 };
    });
  }, [activeFile]);

  // Menus ficam FORA da faixa rolável (posição fixa): dentro dela o overflow cortava o menu.
  const openMenu = (id: string, e: React.MouseEvent<HTMLElement>) => {
    if (menu?.id === id) {
      setMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu({
      id,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8)),
      top: rect.bottom + 4,
    });
  };

  /** Pasta: todos os arquivos dentro dela. Arquivo: só os que estão direto na mesma pasta. */
  const filesForSegment = (seg: PathSegment): MenuFile[] => {
    const dir = seg.isDirectory ? seg.fullPath : activeFile.split('/').slice(0, -1).join('/');
    const prefix = dir ? `${dir}/` : '';
    return projectFiles
      .filter((f) => f.startsWith(prefix) && (seg.isDirectory || !f.slice(prefix.length).includes('/')))
      .sort((a, b) => a.localeCompare(b))
      .map((path) => {
        const rel = path.slice(prefix.length);
        const cut = rel.lastIndexOf('/');
        return { path, label: rel.slice(cut + 1), dir: cut >= 0 ? rel.slice(0, cut + 1) : '' };
      });
  };

  const handleCopyPath = () => {
    const full = projectPath ? `${projectPath}/${activeFile}` : activeFile;
    navigator.clipboard.writeText(full);
    setCopied(true);
    onToast?.(`Caminho copiado: ${full}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const parentSegment = segments.length > 1 ? segments[segments.length - 2] : null;
  const menuSegment = menu && menu.id !== 'project' ? segments.find((s) => s.fullPath === menu.id) : undefined;
  const menuFiles = menuSegment ? filesForSegment(menuSegment) : [];

  return (
    <div
      ref={rootRef}
      className="h-8 px-4 bg-[#0a0f1c] border-b border-slate-800/90 flex items-center justify-between text-xs select-none shrink-0 text-slate-300 font-mono"
    >
      {/* Left: Interactive Breadcrumbs */}
      <div
        ref={stripRef}
        className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 min-w-0"
        onScroll={() => menu && setMenu(null)}
      >
        {/* Pasta pai: abre a lista de arquivos dela (antes abria um arquivo qualquer) */}
        {parentSegment && (
          <button
            onClick={(e) => openMenu(parentSegment.fullPath, e)}
            className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition mr-1 shrink-0"
            title={`Arquivos da pasta ${parentSegment.name}/`}
            aria-haspopup="menu"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Project Root Segment */}
        <button
          onClick={(e) => openMenu('project', e)}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-slate-800/80 transition font-medium text-slate-200 shrink-0 ${
            menu?.id === 'project' ? 'bg-slate-800 text-cyan-300' : ''
          }`}
          title="Projetos disponíveis"
          aria-haspopup="menu"
          aria-expanded={menu?.id === 'project'}
        >
          <FolderGit2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="truncate max-w-[140px]">{activeProject}</span>
          <ChevronDown className="w-3 h-3 text-slate-500" />
        </button>

        {/* Directory & File Path Segments */}
        {segments.map((seg) => {
          const isOpen = menu?.id === seg.fullPath;
          return (
            <React.Fragment key={seg.fullPath}>
              <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
              {seg.isDirectory ? (
                <button
                  onClick={(e) => openMenu(seg.fullPath, e)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-slate-300 hover:text-slate-100 hover:bg-slate-800/70 transition shrink-0 ${
                    isOpen ? 'bg-slate-800 text-cyan-300' : ''
                  }`}
                  title={`Diretório: ${seg.fullPath}/`}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                >
                  <Folder className="w-3.5 h-3.5 text-cyan-400/90 shrink-0" />
                  <span className="truncate max-w-[120px]">{seg.name}</span>
                  <ChevronDown className="w-2.5 h-2.5 text-slate-500" />
                </button>
              ) : (
                <button
                  onClick={(e) => openMenu(seg.fullPath, e)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded font-semibold text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 hover:bg-cyan-950/70 transition shrink-0 ${
                    isOpen ? 'bg-cyan-900/60 border-cyan-500' : ''
                  }`}
                  title={`${seg.fullPath} — clique para trocar de arquivo nesta pasta`}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                >
                  <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate max-w-[160px]">{seg.name}</span>
                  <ChevronDown className="w-2.5 h-2.5 text-cyan-500" />
                </button>
              )}
            </React.Fragment>
          );
        })}
        {!activeFile && (
          <>
            <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
            <span className="text-slate-500 italic text-[11px] font-sans whitespace-nowrap">
              Selecione um arquivo no Explorer para abrir
            </span>
          </>
        )}
      </div>

      {/* Right: Path Info & Copy Action */}
      <div className="flex items-center gap-2 shrink-0 pl-2">
        <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-slate-800/80 text-cyan-400 border border-slate-700 hidden md:inline">
          {language}
        </span>

        <button
          onClick={handleCopyPath}
          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition flex items-center gap-1 text-[11px]"
          title="Copiar caminho relativo do arquivo"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span className="hidden lg:inline">{copied ? 'Copiado!' : 'Copiar Caminho'}</span>
        </button>
      </div>

      {/* Menu único em posição fixa (fora da faixa que rola) */}
      {menu && (
        <div
          role="menu"
          style={{ position: 'fixed', left: menu.left, top: menu.top, width: MENU_WIDTH }}
          className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl z-50 p-1 space-y-0.5 font-sans"
        >
          {menu.id === 'project' ? (
            <>
              <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex justify-between items-center">
                <span>Alternar Projeto</span>
                {onOpenProjectManager && (
                  <button
                    onClick={() => {
                      setMenu(null);
                      onOpenProjectManager();
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-normal normal-case"
                  >
                    Gerenciar
                  </button>
                )}
              </div>
              <div className="max-h-56 overflow-y-auto">
                {projects.map((p) => (
                  <button
                    key={p.name}
                    role="menuitem"
                    onClick={() => {
                      onSelectProject(p.name);
                      setMenu(null);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                      p.name === activeProject
                        ? 'bg-cyan-950/70 text-cyan-200 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FolderGit2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </div>
                    {p.name === activeProject && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 truncate">
                {menuSegment?.isDirectory ? menuSegment.fullPath : activeFile.split('/').slice(0, -1).join('/') || 'raiz'}/
                <span className="ml-1 text-slate-600 normal-case">({menuFiles.length})</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {menuFiles.length > 0 ? (
                  menuFiles.map((file) => {
                    const isCurrent = file.path === activeFile;
                    return (
                      <button
                        key={file.path}
                        role="menuitem"
                        onClick={() => {
                          onSelectFile(file.path);
                          setMenu(null);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 transition ${
                          isCurrent ? 'bg-cyan-950/60 text-cyan-200' : 'text-slate-300 hover:bg-slate-800/70'
                        }`}
                        title={file.path}
                      >
                        <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">
                          {file.dir && <span className="text-slate-500">{file.dir}</span>}
                          {file.label}
                        </span>
                        {isCurrent && <Check className="w-3 h-3 text-cyan-400 shrink-0 ml-auto" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-2.5 py-2 text-slate-500 italic text-[11px]">Nenhum arquivo nesta pasta.</div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
