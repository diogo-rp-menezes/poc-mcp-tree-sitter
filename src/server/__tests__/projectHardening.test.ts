import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { projectStore, globToRegExp } from '../store';
import { validateWritableProjectPath, parseWorkspaceRootsConfig, setActiveWorkspaceRoots } from '../workspaceRoots';
import { buildCompoundQuery } from '../queryBuilder';
import { handleMCPToolCall, handleMCPPrompt } from '../mcp';
import { syncProjectFilesToDisk } from '../git';
import { initTreeSitter } from '../treeSitter';
import { detectLanguage, parseSourceToASTAsync } from '../parser';
import type { ASTNode } from '../types';

const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'hardening-')));
const config = parseWorkspaceRootsConfig({ MCP_ALLOWED_WORKSPACE_ROOTS: root } as NodeJS.ProcessEnv);
setActiveWorkspaceRoots(config);

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe('validateWritableProjectPath', () => {
  it('aceita caminhos (inclusive inexistentes) dentro da root', () => {
    expect(validateWritableProjectPath(path.join(root, 'novo/sub'), config).ok).toBe(true);
    expect(validateWritableProjectPath(root, config).ok).toBe(true);
  });
  it('recusa fora da root, traversal e prefixo irmão', () => {
    expect((validateWritableProjectPath('/etc', config) as any).status).toBe(403);
    expect((validateWritableProjectPath(path.join(root, '..', 'x'), config) as any).status).toBe(403);
    expect((validateWritableProjectPath(root + '-2', config) as any).status).toBe(403);
    expect((validateWritableProjectPath('', config) as any).status).toBe(400);
  });
  it('recusa symlink que escapa mesmo com destino inexistente', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'hardening-out-'));
    try {
      fs.symlinkSync(outside, path.join(root, 'link'), 'dir');
      expect((validateWritableProjectPath(path.join(root, 'link', 'novo'), config) as any).status).toBe(403);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe('syncProjectFilesToDisk', () => {
  it('ignora arquivos que escapam do diretório do projeto', () => {
    const dir = path.join(root, 'sync');
    const res = syncProjectFilesToDisk(dir, [
      { path: 'a.ts', content: '1' },
      { path: '../escaped.ts', content: '2' },
    ]);
    expect(res.syncedCount).toBe(1);
    expect(res.skipped).toEqual(['../escaped.ts']);
    expect(fs.existsSync(path.join(root, 'escaped.ts'))).toBe(false);
  });
});

describe('list_files (extensões e globs)', () => {
  projectStore.createProject('lf', '/projects/lf');
  for (const f of ['a.ts', 'src/b.ts', 'src/c.tsx', 'src/deep/d.tsx', 'README.md']) projectStore.saveFile('lf', f, 'x');

  it('extensions aceita ".ts", "ts" e "TS"', () => {
    for (const ext of ['.ts', 'ts', 'TS']) {
      expect(projectStore.listFiles('lf', undefined, [ext]).sort()).toEqual(['a.ts', 'src/b.ts']);
    }
  });
  it('globs relativos à raiz do projeto', () => {
    expect(projectStore.listFiles('lf', '**/*.tsx').sort()).toEqual(['src/c.tsx', 'src/deep/d.tsx']);
    expect(projectStore.listFiles('lf', 'src/*.ts')).toEqual(['src/b.ts']);
    expect(projectStore.listFiles('lf', '*.ts').sort()).toEqual(['a.ts', 'src/b.ts']);
    expect(globToRegExp('a.b').test('aXb')).toBe(false);
  });
});

describe('build_compound_query', () => {
  it("recusa combine='and' com vários padrões", () => {
    expect(() => buildCompoundQuery('python', ['functions', 'classes'], 'and')).toThrow();
  });
});

describe('ferramentas MCP', () => {
  it('open_folder importa arquivos e register_project_tool com path escaneia', async () => {
    const dir = path.join(root, 'proj');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'm.py'), 'def f():\n    return 1\n');
    const opened = await handleMCPToolCall('open_folder', { path: dir, name: 'mcp-open' });
    expect(opened.filesCount).toBe(1);

    const reg = await handleMCPToolCall('register_project_tool', { name: 'mcp-reg', path: dir });
    expect(reg.files).toEqual(['m.py']);

    const empty = await handleMCPToolCall('register_project_tool', { name: 'mcp-empty' });
    expect(empty.files).toEqual([]);
    expect(empty.warnings.length).toBeGreaterThan(0);
  });

  it('open_folder recusa pasta fora das roots', async () => {
    await expect(handleMCPToolCall('open_folder', { path: '/etc' })).rejects.toThrow();
  });

  it('safe_replace_node grava no disco quando seguro e reporta persisted', async () => {
    await initTreeSitter();
    const dir = path.join(root, 'replace');
    fs.mkdirSync(dir);
    const file = path.join(dir, 'm.py');
    fs.writeFileSync(file, 'x = 1\n');
    await handleMCPToolCall('open_folder', { path: dir, name: 'mcp-replace' });

    const ok = await handleMCPToolCall('safe_replace_node', {
      project: 'mcp-replace', file_path: 'm.py', start_byte: 4, end_byte: 5, replacement_text: '2',
    });
    expect(ok.success).toBe(true);
    expect(ok.persisted).toBe(true);
    expect(fs.readFileSync(file, 'utf-8')).toBe('x = 2\n');

    // Disco divergente do store: não sobrescreve.
    fs.writeFileSync(file, 'x = 99\n');
    const diverged = await handleMCPToolCall('safe_replace_node', {
      project: 'mcp-replace', file_path: 'm.py', start_byte: 4, end_byte: 5, replacement_text: '3',
    });
    expect(diverged.persisted).toBe(false);
    expect(diverged.persistReason).toBe('disk_content_diverged');
    expect(fs.readFileSync(file, 'utf-8')).toBe('x = 99\n');
  });

  it('prompts incluem o código e falham para arquivo inexistente', () => {
    projectStore.createProject('pr', '/projects/pr');
    projectStore.saveFile('pr', 'a.py', 'print(1)\n');
    expect(handleMCPPrompt('suggest_improvements', { project: 'pr', file_path: 'a.py' })).toContain('print(1)');
    expect(() => handleMCPPrompt('code_review', { project: 'pr', file_path: 'nope.py' })).toThrow();
    expect(() => handleMCPPrompt('explain_code', { project: 'pr', file_path: 'nope.py' })).toThrow();
  });
});

describe('TSX usa a gramática tsx (lint não marca tudo como erro)', () => {
  const hasError = (n: ASTNode): boolean => n.type === 'ERROR' || (n.children ?? []).some(hasError);

  it('detectLanguage devolve tsx para .tsx', () => {
    expect(detectLanguage('src/BreadcrumbBar.tsx')).toBe('tsx');
    expect(detectLanguage('a.ts')).toBe('typescript');
  });

  it('JSX válido não gera nós ERROR', async () => {
    await initTreeSitter();
    const src = "interface P { a: string }\nexport function C({ a }: P) {\n  return <div className=\"x\">{a}</div>;\n}\n";
    const ast = await parseSourceToASTAsync(src, detectLanguage('C.tsx'));
    expect(hasError(ast)).toBe(false);
  });
});
