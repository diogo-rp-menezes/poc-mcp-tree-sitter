/**
 * Escaneamento de diretórios do host para dentro do store, compartilhado entre
 * POST /api/scan-directory e as ferramentas MCP (open_folder / register_project_tool).
 * Sempre passa por validateScanDirectoryPath (roots + symlinks).
 */
import fs from 'fs';
import path from 'path';
import { projectStore } from './store';
import { QuotaExceededError, SecurityError, FileAccessError, MCPTreeSitterError } from './errors';
import { validateScanDirectoryPath, type WorkspaceRootsConfig } from './workspaceRoots';

const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', '.venv', 'venv', '__pycache__',
  '.turbo', '.cache', '.idea', '.vscode', '.ssh', '.aws', 'coverage',
]);

const ALLOWED_EXTS = new Set([
  '.py', '.ts', '.tsx', '.js', '.jsx', '.go', '.rs', '.java',
  '.c', '.cpp', '.h', '.hpp', '.cs', '.rb', '.php', '.swift',
  '.json', '.yaml', '.yml', '.toml', '.md', '.sql', '.html', '.css',
]);

const MAX_FILE_BYTES = 1024 * 1024;

export interface ScanResult {
  project: string;
  path: string;
  filesCount: number;
  detectedLanguages: string[];
}

/** Valida o diretório contra as roots e importa os arquivos suportados em um projeto novo. */
export function scanDirectoryIntoProject(
  config: WorkspaceRootsConfig,
  opts: { path: unknown; name?: string; maxFiles?: number }
): ScanResult {
  const validation = validateScanDirectoryPath(opts.path, config);
  if (validation.ok === false) {
    const failure = validation as Extract<typeof validation, { ok: false }>;
    if (failure.status === 403) throw new SecurityError(failure.error);
    if (failure.status === 404) throw new FileAccessError(failure.error, 404);
    throw new MCPTreeSitterError(failure.error, failure.status);
  }
  const root = validation.resolvedPath;
  const maxFiles = typeof opts.maxFiles === 'number' && opts.maxFiles > 0 ? opts.maxFiles : 150;

  const projectName = (opts.name || path.basename(root) || 'scanned-project')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-');

  const discovered: Array<{ relativePath: string; absolutePath: string }> = [];

  const walk = (dir: string): void => {
    if (discovered.length >= maxFiles) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (discovered.length >= maxFiles) break;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name) && !entry.name.startsWith('.')) walk(full);
      } else if (entry.isFile()) {
        if (
          entry.name.startsWith('.env') ||
          entry.name.includes('credential') ||
          entry.name.includes('id_rsa') ||
          entry.name.endsWith('.pem')
        ) {
          continue;
        }
        if (!ALLOWED_EXTS.has(path.extname(entry.name).toLowerCase())) continue;
        try {
          if (fs.statSync(full).size <= MAX_FILE_BYTES) {
            discovered.push({
              relativePath: path.relative(root, full).replace(/\\/g, '/'),
              absolutePath: full,
            });
          }
        } catch {
          // ignora arquivos ilegíveis
        }
      }
    }
  };
  walk(root);

  if (discovered.length === 0) {
    throw new MCPTreeSitterError('No supported source code files found in the directory', 400);
  }

  const proj = projectStore.createProject(
    projectName,
    root,
    `Project scanned from ${root} (${discovered.length} files)`
  );

  const langs = new Set<string>();
  for (const item of discovered) {
    try {
      const saved = projectStore.saveFile(proj.name, item.relativePath, fs.readFileSync(item.absolutePath, 'utf-8'));
      langs.add(saved.language);
    } catch (err) {
      if (err instanceof QuotaExceededError) throw err;
    }
  }

  return {
    project: proj.name,
    path: proj.path,
    filesCount: proj.files.size,
    detectedLanguages: Array.from(langs),
  };
}
