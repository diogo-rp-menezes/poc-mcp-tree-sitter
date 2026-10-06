import { createHash } from 'crypto';
import { Project, ProjectFile } from './types';
import { detectLanguage, parseSourceToAST, extractSymbolsFromAST } from './parser';
import { calculateComplexity } from './complexity';
import { validateAndResolvePath, normalizePath, auditProjectIsolation } from './isolation';
import { sqliteStorage } from './db';
import { logger, serializeError } from './logger';
import { QuotaExceededError, ProjectError, ProjectConflictError } from './errors';

const projects = new Map<string, Project>();

/** Memo das métricas por conteúdo (evita re-parsear arquivos inalterados a cada agregação). */
interface FileAnalysis {
  functions: number;
  classes: number;
  lines: number;
  codeLines: number;
  commentLines: number;
  complexity: number;
}
const ANALYSIS_CACHE_MAX = 2000;
const analysisCache = new Map<string, FileAnalysis>();

function analyzeFileCached(file: { content: string; language: string }): FileAnalysis {
  const key = `${file.language}:${createHash('sha1').update(file.content).digest('hex')}`;
  const hit = analysisCache.get(key);
  if (hit) {
    // refresh LRU
    analysisCache.delete(key);
    analysisCache.set(key, hit);
    return hit;
  }
  const ast = parseSourceToAST(file.content, file.language);
  const metrics = calculateComplexity(file.content, ast);
  const syms = extractSymbolsFromAST(ast, file.language);
  const result: FileAnalysis = {
    functions: syms.functions?.length || 0,
    classes: syms.classes?.length || 0,
    lines: metrics.lineCount,
    codeLines: metrics.codeLines,
    commentLines: metrics.commentLines,
    complexity: metrics.cyclomaticComplexity,
  };
  analysisCache.set(key, result);
  if (analysisCache.size > ANALYSIS_CACHE_MAX) {
    const oldest = analysisCache.keys().next().value;
    if (oldest !== undefined) analysisCache.delete(oldest);
  }
  return result;
}

const MB = 1024 * 1024;

function readLimitMb(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

/** Limites de memória do store (lidos a cada chamada para facilitar testes e ajustes). */
export function getStoreLimits(): { maxProjectBytes: number; maxTotalBytes: number } {
  return {
    maxProjectBytes: readLimitMb('MCP_MAX_PROJECT_MB', 200) * MB,
    maxTotalBytes: readLimitMb('MCP_MAX_TOTAL_MB', 1024) * MB,
  };
}

function totalBytes(proj?: Project): number {
  let sum = 0;
  const list = proj ? [proj] : Array.from(projects.values());
  for (const p of list) for (const f of p.files.values()) sum += f.sizeBytes || 0;
  return sum;
}

/** Lança QuotaExceededError se gravar `addedBytes` (já descontando o arquivo substituído) estourar os limites. */
function assertQuota(project: Project, addedBytes: number, replacedBytes = 0): void {
  const { maxProjectBytes, maxTotalBytes } = getStoreLimits();
  const delta = addedBytes - replacedBytes;
  if (delta <= 0) return;
  if (totalBytes(project) + delta > maxProjectBytes) {
    throw new QuotaExceededError(`Projeto '${project.name}' excederia o limite de ${maxProjectBytes / MB} MB (MCP_MAX_PROJECT_MB)`, {
      project: project.name,
    });
  }
  if (totalBytes() + delta > maxTotalBytes) {
    throw new QuotaExceededError(`Armazenamento total excederia o limite de ${maxTotalBytes / MB} MB (MCP_MAX_TOTAL_MB)`);
  }
}

function addFileToProject(project: Project, path: string, content: string): ProjectFile {
  const file: ProjectFile = {
    path,
    language: detectLanguage(path),
    content,
    sizeBytes: Buffer.byteLength(content, 'utf-8'),
    lastModified: new Date().toISOString(),
  };
  project.files.set(path, file);
  try {
    sqliteStorage.saveFile(project.name, path, file.language, file.content, file.sizeBytes);
  } catch (err) {
    logger.error('sqlite_persist_file_failed', { path, err: serializeError(err) });
  }
  return file;
}

function initStore() {
  try {
    const loaded = sqliteStorage.loadAllProjects();
    if (loaded) {
      for (const [name, p] of loaded) {
        // Projetos persistidos antes da correção do TSX guardavam '.tsx' como 'typescript'.
        for (const f of p.files.values()) {
          const detected = detectLanguage(f.path, f.language);
          if (detected !== f.language) f.language = detected;
        }
        projects.set(name, p);
      }
    }
  } catch (err) {
    logger.error('sqlite_load_projects_failed', { err: serializeError(err) });
  }
}

initStore();

/**
 * Converte um glob em RegExp ancorada (caminhos relativos à raiz do projeto, separador '/').
 *  - `**` casa qualquer profundidade (inclusive zero diretórios em `**\/x`);
 *  - `*` casa dentro de um segmento; `?` casa um caractere;
 *  - sem '/' no padrão, casa pelo nome do arquivo em qualquer profundidade (como no .gitignore).
 */
export function globToRegExp(pattern: string): RegExp {
  const glob = pattern.trim().replace(/^\.\//, '').replace(/\\/g, '/');
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') {
          i++;
          re += '(?:.*/)?';
        } else {
          re += '.*';
        }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  const prefix = glob.includes('/') ? '' : '(?:.*/)?';
  return new RegExp(`^${prefix}${re}$`);
}

export const projectStore = {
  listProjects(): Array<{ name: string; path: string; description?: string; fileCount: number }> {
    return Array.from(projects.values()).map((p) => ({
      name: p.name,
      path: p.path,
      description: p.description,
      fileCount: p.files.size,
    }));
  },

  getProjectOverview(): Array<{
    name: string;
    path: string;
    description?: string;
    fileCount: number;
    totalLines: number;
    totalBytes: number;
    languages: Array<{ language: string; count: number; percentage: number }>;
    lastModified: string;
    totalFunctions: number;
    totalClasses: number;
    isIsolated: boolean;
  }> {
    return Array.from(projects.values()).map((p) => {
      let totalLines = 0;
      let totalBytes = 0;
      let latestModified = '';
      const langCounts: Record<string, number> = {};
      let totalFunctions = 0;
      let totalClasses = 0;

      for (const file of p.files.values()) {
        const lines = file.content.split('\n').length;
        totalLines += lines;
        totalBytes += file.sizeBytes || 0;
        if (!latestModified || file.lastModified > latestModified) {
          latestModified = file.lastModified;
        }
        langCounts[file.language] = (langCounts[file.language] || 0) + 1;

        try {
          const analysis = analyzeFileCached(file);
          totalFunctions += analysis.functions;
          totalClasses += analysis.classes;
        } catch {
          // ignore parsing edge cases
        }
      }

      const totalFiles = p.files.size;
      const languages = Object.entries(langCounts).map(([language, count]) => ({
        language,
        count,
        percentage: totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0,
      }));

      return {
        name: p.name,
        path: p.path,
        description: p.description,
        fileCount: totalFiles,
        totalLines,
        totalBytes,
        languages,
        lastModified: latestModified || new Date().toISOString(),
        totalFunctions,
        totalClasses,
        isIsolated: true,
      };
    });
  },

  getProjectFileStats(projectName: string): Array<{
    fileName: string;
    language: string;
    lines: number;
    codeLines: number;
    commentLines: number;
    complexity: number;
    functions: number;
    classes: number;
  }> {
    const p = projects.get(projectName);
    if (!p) return [];

    return Array.from(p.files.values()).map((file) => {
      try {
        const a = analyzeFileCached(file);
        return {
          fileName: file.path,
          language: file.language,
          lines: a.lines,
          codeLines: a.codeLines,
          commentLines: a.commentLines,
          complexity: a.complexity,
          functions: a.functions,
          classes: a.classes,
        };
      } catch {
        const lines = file.content.split('\n').length;
        return {
          fileName: file.path,
          language: file.language,
          lines,
          codeLines: lines,
          commentLines: 0,
          complexity: 1,
          functions: 0,
          classes: 0,
        };
      }
    });
  },

  /** Contagens para métricas. */
  getMemoryStats(): { bytes: number; projects: number } {
    return { bytes: totalBytes(), projects: projects.size };
  },

  /** Linguagens presentes em um projeto (ou em todos, se omitido). */
  listLanguages(projectName?: string): string[] {
    const set = new Set<string>();
    for (const p of projectName ? [projects.get(projectName)] : projects.values()) {
      if (!p) continue;
      for (const f of p.files.values()) set.add(f.language);
    }
    return Array.from(set);
  },

  getProject(name: string): Project | undefined {
    return projects.get(name);
  },

  createProject(name: string, path?: string, description?: string): Project {
    const rawPath = path || `/projects/${name}`;
    const cleanPath = normalizePath(rawPath);

    const proj: Project = {
      name,
      path: cleanPath,
      description: description || `Project ${name}`,
      files: new Map(),
    };
    projects.set(name, proj);
    try {
      sqliteStorage.saveProject(name, cleanPath, proj.description || '');
    } catch (err) {
      logger.error('sqlite_persist_project_failed', { project: name, err: serializeError(err) });
    }
    return proj;
  },

  updateProject(
    oldName: string,
    updates: { name?: string; path?: string; description?: string }
  ): Project {
    const proj = projects.get(oldName);
    if (!proj) {
      throw new ProjectError(`Projeto '${oldName}' não encontrado.`);
    }

    const newName = updates.name ? updates.name.trim() : proj.name;
    if (newName !== oldName && projects.has(newName)) {
      throw new ProjectConflictError(`Já existe um projeto com o nome '${newName}'.`);
    }
    const newPath = updates.path ? normalizePath(updates.path.trim()) : proj.path;
    const newDesc = updates.description !== undefined ? updates.description : (proj.description || '');

    // Persist changes in SQLite
    sqliteStorage.updateProject(oldName, {
      name: newName,
      path: newPath,
      description: newDesc,
    });

    if (newName !== oldName) {
      // Re-key in memory Map
      projects.delete(oldName);
      proj.name = newName;
      proj.path = newPath;
      proj.description = newDesc;
      projects.set(newName, proj);
    } else {
      proj.path = newPath;
      proj.description = newDesc;
    }

    return proj;
  },

  cloneProject(
    sourceName: string,
    targetName: string,
    targetPath?: string,
    targetDescription?: string
  ): Project {
    const sourceProj = projects.get(sourceName);
    if (!sourceProj) {
      throw new ProjectError(`Projeto '${sourceName}' não encontrado para clonagem.`);
    }

    if (projects.has(targetName)) {
      throw new ProjectConflictError(`Já existe um projeto com o nome '${targetName}'.`);
    }

    const cleanPath = normalizePath(targetPath || `/projects/${targetName}`);
    const cleanDesc = targetDescription !== undefined ? targetDescription : `Clone de ${sourceName}`;

    const { maxTotalBytes } = getStoreLimits();
    if (totalBytes() + totalBytes(sourceProj) > maxTotalBytes) {
      throw new QuotaExceededError(`Clonar '${sourceName}' excederia o limite de ${maxTotalBytes / MB} MB (MCP_MAX_TOTAL_MB)`);
    }

    // Clone in SQLite
    sqliteStorage.cloneProject(sourceName, targetName, cleanPath, cleanDesc);

    // Clone in memory
    const clonedFiles = new Map<string, ProjectFile>();
    for (const [filePath, fileObj] of sourceProj.files.entries()) {
      clonedFiles.set(filePath, {
        path: fileObj.path,
        language: fileObj.language,
        content: fileObj.content,
        sizeBytes: fileObj.sizeBytes,
        lastModified: new Date().toISOString(),
      });
    }

    const clonedProj: Project = {
      name: targetName,
      path: cleanPath,
      description: cleanDesc,
      files: clonedFiles,
    };

    projects.set(targetName, clonedProj);
    return clonedProj;
  },

  removeProject(name: string): boolean {
    const deleted = projects.delete(name);
    try {
      sqliteStorage.deleteProject(name);
    } catch (err) {
      logger.error('sqlite_delete_project_failed', { project: name, err: serializeError(err) });
    }
    return deleted;
  },

  listFiles(projectName: string, pattern?: string, extensions?: string[]): string[] {
    const p = projects.get(projectName);
    if (!p) return [];

    let paths = Array.from(p.files.keys());
    if (extensions && extensions.length > 0) {
      // Aceita ".ts", "ts" e "TS": remove o ponto inicial e ignora maiúsculas.
      const wanted = new Set(
        extensions
          .filter((e) => typeof e === 'string')
          .map((e) => e.trim().replace(/^\.+/, '').toLowerCase())
          .filter((e) => e.length > 0)
      );
      if (wanted.size > 0) {
        paths = paths.filter((filePath) => {
          const base = filePath.split('/').pop() ?? filePath;
          const dot = base.lastIndexOf('.');
          return dot > 0 && wanted.has(base.slice(dot + 1).toLowerCase());
        });
      }
    }
    if (pattern) {
      const regex = globToRegExp(pattern);
      paths = paths.filter((filePath) => regex.test(filePath));
    }
    return paths;
  },

  getFile(projectName: string, filePath: string): ProjectFile | undefined {
    const p = projects.get(projectName);
    if (!p) return undefined;

    // Validate path boundary
    const { relativePath } = validateAndResolvePath(p, filePath);
    return p.files.get(relativePath);
  },

  saveFile(projectName: string, filePath: string, content: string): ProjectFile {
    let p = projects.get(projectName);
    if (!p) {
      p = this.createProject(projectName);
    }

    // Validate path boundary
    const { relativePath } = validateAndResolvePath(p, filePath);
    assertQuota(p, Buffer.byteLength(content, 'utf-8'), p.files.get(relativePath)?.sizeBytes ?? 0);
    return addFileToProject(p, relativePath, content);
  },

  saveFilesBatch(projectName: string, files: Array<{ path: string; content: string }>): number {
    let p = projects.get(projectName);
    if (!p) {
      p = this.createProject(projectName);
    }

    const batchToPersist: Array<{ path: string; language: string; content: string; sizeBytes: number }> = [];
    let quotaError: QuotaExceededError | null = null;

    for (const item of files) {
      try {
        const { relativePath } = validateAndResolvePath(p, item.path);
        const lang = detectLanguage(relativePath);
        const sizeBytes = Buffer.byteLength(item.content, 'utf-8');
        assertQuota(p, sizeBytes, p.files.get(relativePath)?.sizeBytes ?? 0);
        const projFile: ProjectFile = {
          path: relativePath,
          language: lang,
          content: item.content,
          sizeBytes,
          lastModified: new Date().toISOString(),
        };
        p.files.set(relativePath, projFile);
        batchToPersist.push({
          path: relativePath,
          language: lang,
          content: item.content,
          sizeBytes,
        });
      } catch (err) {
        if (err instanceof QuotaExceededError) {
          // Persiste o que já coube e propaga o erro de quota.
          quotaError = err;
          break;
        }
        // Skip paths failing isolation
      }
    }

    if (batchToPersist.length > 0) {
      try {
        sqliteStorage.saveFilesBatch(projectName, batchToPersist);
      } catch (err) {
        logger.error('sqlite_batch_persist_failed', { project: projectName, err: serializeError(err) });
      }
    }

    if (quotaError) throw quotaError;
    return batchToPersist.length;
  },

  deleteFile(projectName: string, filePath: string): boolean {
    const p = projects.get(projectName);
    if (!p) return false;

    // Validate path boundary
    const { relativePath } = validateAndResolvePath(p, filePath);
    const deleted = p.files.delete(relativePath);
    try {
      sqliteStorage.deleteFile(projectName, relativePath);
    } catch (err) {
      logger.error('sqlite_delete_file_failed', { path: relativePath, err: serializeError(err) });
    }
    return deleted;
  },

  auditIsolation(projectName: string) {
    const p = projects.get(projectName);
    if (!p) return null;
    return auditProjectIsolation(p);
  },
};
