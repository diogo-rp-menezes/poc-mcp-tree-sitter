/**
 * Model Context Protocol (MCP) Server Tools & Prompts
 * Implements MCP Tree-sitter Server specifications & high-efficiency LLM tools
 */

import { projectStore } from './store';
import {
  detectLanguage,
  extractSymbolsFromAST,
  findNodeAtPosition as findNodeAtPos,
  parseSourceToASTAsync,
  ensureLanguagesLoaded,
} from './parser';
import { executeQuery, executeQueryOnSource } from './queryEngine';
import { calculateComplexity } from './complexity';
import { findSimilarCodeBlocks } from './similarity';
import { COMMON_NODE_DESCRIPTIONS, TEMPLATES } from './templates';
import { languageRegistry } from './languageRegistry';
import { treeCache } from './treeCache';
import {
  extractSymbols,
  analyzeProjectStructure,
  findDependencies,
  analyzeCodeComplexity,
  searchText,
  findSimilarCode,
  getFileAST,
  findNodeAtPosition,
  getOutline,
  getSymbolSource,
  findReferences,
  safeReplaceNode,
  analyzeFunctionComplexity,
} from './operations';
import { adaptQuery, buildCompoundQuery, getTemplate, describeNodeTypes } from './queryBuilder';
import fs from 'fs';
import path from 'path';
import { scanDirectoryIntoProject } from './scanDirectory';
import { getActiveWorkspaceRoots, validateWritableProjectPath } from './workspaceRoots';

/**
 * Grava no disco o resultado de um safe_replace_node, se (e somente se) for seguro:
 * projeto dentro das roots, arquivo já existente no disco, dentro do projeto, e sem divergência
 * entre o disco e o conteúdo que o store tinha antes da edição.
 */
function persistReplacedFile(
  projectPath: string,
  filePath: string,
  previousContent: string,
  newContent: string
): { persisted: boolean; reason?: string } {
  const root = validateWritableProjectPath(projectPath, getActiveWorkspaceRoots());
  if (root.ok === false) return { persisted: false, reason: 'project_outside_workspace_roots' };
  const target = path.resolve(root.resolvedPath, filePath);
  if (!target.startsWith(root.resolvedPath + path.sep)) return { persisted: false, reason: 'file_outside_project' };
  try {
    const real = fs.realpathSync(target);
    const realRoot = fs.realpathSync(root.resolvedPath);
    if (!real.startsWith(realRoot + path.sep)) return { persisted: false, reason: 'file_outside_project' };
    if (fs.readFileSync(real, 'utf-8') !== previousContent) {
      return { persisted: false, reason: 'disk_content_diverged' };
    }
    fs.writeFileSync(real, newContent, 'utf-8');
    return { persisted: true };
  } catch {
    return { persisted: false, reason: 'file_not_on_disk' };
  }
}

export const MCP_TOOLS_METADATA = [
  {
    name: 'get_ast',
    description: 'Get abstract syntax tree for a file or code snippet with syntax diagnostics.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name' },
        path: { type: 'string', description: 'File path relative to project' },
        code: { type: 'string', description: 'Optional raw code snippet' },
        language: { type: 'string', description: 'Language if providing raw code' },
        max_depth: { type: 'number', description: 'Max depth of AST' },
        include_text: { type: 'boolean', description: 'Whether to include node text' },
      },
    },
  },
  {
    name: 'get_outline',
    description: 'Get a compact outline map (signatures, functions, classes) for a file to minimize LLM token budget.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name' },
        file_path: { type: 'string', description: 'Path to source file' },
      },
      required: ['project', 'file_path'],
    },
  },
  {
    name: 'get_symbol_source',
    description: 'Extract exact source code snippet for a symbol using byte ranges without loading entire files.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name' },
        file_path: { type: 'string', description: 'File path' },
        symbol_name: { type: 'string', description: 'Name of the function or class' },
      },
      required: ['project', 'file_path', 'symbol_name'],
    },
  },
  {
    name: 'find_references',
    description: 'Find identifier usages and references across project files using Tree-sitter queries.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name' },
        symbol_name: { type: 'string', description: 'Symbol/identifier name to search for' },
        language: { type: 'string', description: 'Optional language filter' },
      },
      required: ['project', 'symbol_name'],
    },
  },
  {
    name: 'safe_replace_node',
    description: 'Safely replace a code range and reject the edit if it introduces new syntax errors (ERROR nodes).',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name' },
        file_path: { type: 'string', description: 'File path' },
        start_byte: { type: 'number', description: 'Start byte index' },
        end_byte: { type: 'number', description: 'End byte index' },
        replacement_text: { type: 'string', description: 'Replacement code' },
        write_to_disk: { type: 'boolean', description: 'Also write the edit to the file on disk when safe (default true). The response reports `persisted`.' },
      },
      required: ['project', 'file_path', 'start_byte', 'end_byte', 'replacement_text'],
    },
  },
  {
    name: 'analyze_function_complexity',
    description: 'Calculate McCabe cyclomatic complexity granularly per function/method.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name' },
        file_path: { type: 'string', description: 'File path' },
      },
      required: ['project', 'file_path'],
    },
  },
  {
    name: 'run_query',
    description: 'Run a Tree-sitter S-expression query on project files or raw code using native Language.query().',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name' },
        query: { type: 'string', description: 'Tree-sitter S-expression query' },
        file_path: { type: 'string', description: 'File to query' },
        code: { type: 'string', description: 'Optional raw code string' },
        language: { type: 'string', description: 'Language' },
        capture_filter: { type: 'string', description: 'Optional capture name to filter' },
        max_results: { type: 'number', description: 'Max matches to return' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_symbols',
    description: 'Extract symbols (functions, classes, structs, imports) from a file or code.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name' },
        file_path: { type: 'string', description: 'Path to file' },
        code: { type: 'string', description: 'Raw code snippet' },
        language: { type: 'string', description: 'Language' },
        symbol_types: { type: 'array', items: { type: 'string' }, description: 'Types of symbols to extract' },
        exclude_class_methods: { type: 'boolean', description: 'Exclude methods inside classes from functions' },
      },
    },
  },
  {
    name: 'analyze_complexity',
    description: 'Analyze code complexity, lines of code, and McCabe cyclomatic complexity.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name' },
        file_path: { type: 'string', description: 'File path' },
        code: { type: 'string', description: 'Raw code' },
        language: { type: 'string', description: 'Language' },
      },
    },
  },
  {
    name: 'analyze_project_structure',
    description: 'Analyze complete project structure, languages, entry points, and build files.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name' },
        scan_depth: { type: 'number', description: 'Depth for scanning' },
      },
      required: ['project'],
    },
  },
  {
    name: 'find_dependencies',
    description: 'Analyze import dependencies, requires, includes, and uses in a file.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name' },
        file_path: { type: 'string', description: 'File path' },
      },
      required: ['project', 'file_path'],
    },
  },
  {
    name: 'search_text',
    description: 'Search for text or regex patterns across project files with context lines.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name' },
        pattern: { type: 'string', description: 'Search pattern or regular expression' },
        file_pattern: { type: 'string', description: 'Glob relative to the project root (e.g. "**/*.tsx", "src/*.ts"); a pattern without "/" matches file names at any depth' },
        max_results: { type: 'number', description: 'Max results limit' },
        case_sensitive: { type: 'boolean', description: 'Case sensitive matching' },
        whole_word: { type: 'boolean', description: 'Match whole words only' },
        use_regex: { type: 'boolean', description: 'Interpret pattern as regular expression' },
        context_lines: { type: 'number', description: 'Surrounding context lines to include' },
      },
      required: ['project', 'pattern'],
    },
  },
  {
    name: 'adapt_query',
    description: 'Adapt a tree-sitter S-expression query from one language grammar to another.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Original query string' },
        from_language: { type: 'string', description: 'Source language' },
        to_language: { type: 'string', description: 'Target language' },
      },
      required: ['query', 'from_language', 'to_language'],
    },
  },
  {
    name: 'build_compound_query',
    description: "Combine multiple query templates or patterns into one query. Only combine='or' (default) is supported for several patterns; Tree-sitter has no top-level AND.",
    inputSchema: {
      type: 'object',
      properties: {
        language: { type: 'string', description: 'Language' },
        patterns: { type: 'array', items: { type: 'string' }, description: 'Template names or patterns' },
        combine: { type: 'string', enum: ['or', 'and'], description: 'Combination mode' },
      },
      required: ['language', 'patterns'],
    },
  },
  {
    name: 'get_node_at_position',
    description: 'Find AST node at row and column coordinate.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name' },
        path: { type: 'string', description: 'File path' },
        code: { type: 'string', description: 'Raw code snippet' },
        language: { type: 'string', description: 'Language' },
        row: { type: 'number', description: '0-based row' },
        column: { type: 'number', description: '0-based column' },
      },
      required: ['row', 'column'],
    },
  },
  {
    name: 'find_similar_code',
    description: 'Find code structurally similar to a snippet using AST fingerprinting.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name' },
        snippet: { type: 'string', description: 'Snippet to compare' },
        language: { type: 'string', description: 'Language' },
        threshold: { type: 'number', description: 'Minimum similarity (0.0 - 1.0)' },
        max_results: { type: 'number', description: 'Max results' },
      },
      required: ['snippet'],
    },
  },
  {
    name: 'list_languages',
    description: 'List available languages with verified WebAssembly binaries in the Tree-sitter server.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_projects_tool',
    description: 'List all registered projects.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_files',
    description: 'List files in a project.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name' },
        pattern: { type: 'string', description: 'Glob pattern' },
        extensions: { type: 'array', items: { type: 'string' }, description: 'Extensions with or without dot, e.g. ["ts", ".tsx"]' },
      },
      required: ['project'],
    },
  },
  {
    name: 'get_file',
    description: 'Get content of a file.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name' },
        path: { type: 'string', description: 'File path' },
      },
      required: ['project', 'path'],
    },
  },
  {
    name: 'get_query_template_tool',
    description: 'Get predefined tree-sitter query template for a language.',
    inputSchema: {
      type: 'object',
      properties: {
        language: { type: 'string', description: 'Language' },
        template_name: { type: 'string', description: 'Template name (functions, classes, etc.)' },
      },
      required: ['language', 'template_name'],
    },
  },
  {
    name: 'list_query_templates_tool',
    description: 'List available query templates.',
    inputSchema: {
      type: 'object',
      properties: {
        language: { type: 'string', description: 'Optional language filter' },
      },
    },
  },
  {
    name: 'register_project_tool',
    description: 'Register a new project in the workspace. If `path` is an existing directory inside the allowed workspace roots, its source files are imported (set scan=false to register an empty project).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name' },
        path: { type: 'string', description: 'Root path of the project' },
        description: { type: 'string', description: 'Project description' },
        scan: { type: 'boolean', description: 'Import files from `path` when it is an allowed directory (default true)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'open_folder',
    description: 'Open a folder from the host filesystem (must be inside the allowed workspace roots) as a project, importing its source files.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute or cwd-relative directory path' },
        name: { type: 'string', description: 'Optional project name (defaults to the folder name)' },
        max_files: { type: 'number', description: 'Maximum number of files to import (default 150)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'get_node_types',
    description: 'Get common AST node type descriptions for a language.',
    inputSchema: {
      type: 'object',
      properties: {
        language: { type: 'string', description: 'Language identifier' },
      },
      required: ['language'],
    },
  },
];

export const MCP_PROMPTS_METADATA = [
  {
    name: 'code_review',
    description: 'Prompt template for automated code review using extracted AST symbols and diagnostics.',
    arguments: [
      { name: 'project', description: 'Project name', required: true },
      { name: 'file_path', description: 'File to review', required: true },
    ],
  },
  {
    name: 'explain_code',
    description: 'Prompt template explaining file structure and patterns.',
    arguments: [
      { name: 'project', description: 'Project name', required: true },
      { name: 'file_path', description: 'File path', required: true },
      { name: 'focus', description: 'Specific focus area', required: false },
    ],
  },
  {
    name: 'explain_tree_sitter_query',
    description: 'Prompt template explaining Tree-sitter S-expression query syntax.',
    arguments: [],
  },
  {
    name: 'suggest_improvements',
    description: 'Prompt template for code improvements based on complexity metrics.',
    arguments: [
      { name: 'project', description: 'Project name', required: true },
      { name: 'file_path', description: 'File path', required: true },
    ],
  },
  {
    name: 'project_overview',
    description: 'Prompt template analyzing overall codebase structure.',
    arguments: [{ name: 'project', description: 'Project name', required: true }],
  },
];

export async function handleMCPToolCall(name: string, args: Record<string, any>): Promise<any> {
  switch (name) {
    case 'list_languages': {
      return {
        available: languageRegistry.listAvailableLanguages(),
        installable: languageRegistry.listInstallableLanguages(),
      };
    }

    case 'list_projects_tool': {
      return projectStore.listProjects();
    }

    case 'register_project_tool': {
      const projName = args.name || 'unnamed';
      const warnings: string[] = [];
      if (typeof args.path === 'string' && args.path !== '' && args.scan !== false) {
        try {
          const scanned = scanDirectoryIntoProject(getActiveWorkspaceRoots(), {
            path: args.path,
            name: projName,
          });
          const proj = projectStore.getProject(scanned.project)!;
          if (args.description) proj.description = args.description;
          return {
            name: proj.name,
            path: proj.path,
            files: Array.from(proj.files.keys()),
            warnings,
          };
        } catch (err) {
          warnings.push(`Pasta não importada: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else if (!args.path) {
        warnings.push('Projeto registrado sem arquivos: nenhum path informado. Use open_folder ou salve arquivos manualmente.');
      }
      const proj = projectStore.createProject(projName, args.path, args.description);
      return {
        name: proj.name,
        path: proj.path,
        files: Array.from(proj.files.keys()),
        warnings,
      };
    }

    case 'open_folder': {
      return scanDirectoryIntoProject(getActiveWorkspaceRoots(), {
        path: args.path,
        name: args.name,
        maxFiles: args.max_files !== undefined ? Number(args.max_files) : undefined,
      });
    }

    case 'list_files': {
      return projectStore.listFiles(args.project, args.pattern, args.extensions);
    }

    case 'get_file': {
      const f = projectStore.getFile(args.project, args.path);
      if (!f) throw new Error(`File ${args.path} not found in project ${args.project}`);
      return f.content;
    }

    case 'get_file_metadata': {
      const f = projectStore.getFile(args.project, args.path);
      if (!f) throw new Error(`File ${args.path} not found in project ${args.project}`);
      return {
        path: f.path,
        language: f.language,
        sizeBytes: f.sizeBytes,
        lastModified: f.lastModified,
      };
    }

    case 'get_ast': {
      if (args.project && args.path) {
        const proj = projectStore.getProject(args.project);
        if (proj) {
          const res = await getFileAST(
            proj,
            args.path,
            languageRegistry,
            treeCache,
            args.max_depth || 5,
            args.include_text !== false
          );
          return res.tree;
        }
      }

      let code = args.code;
      let lang = args.language;

      if (!code && args.project && args.path) {
        const file = projectStore.getFile(args.project, args.path);
        if (!file) throw new Error(`File ${args.path} not found`);
        code = file.content;
        lang = languageRegistry.resolveFileLanguageOrThrow(args.path, file.language);
      } else if (args.path) {
        lang = languageRegistry.resolveFileLanguageOrThrow(args.path, lang);
      } else if (!lang) {
        throw new Error('Language is required when code snippet is provided');
      }

      if (!code) throw new Error('Either code or project + path must be provided');
      return await parseSourceToASTAsync(code, lang);
    }

    case 'get_outline': {
      const proj = projectStore.getProject(args.project);
      if (!proj) throw new Error(`Project '${args.project}' not found`);
      return await getOutline(proj, args.file_path || args.path, languageRegistry);
    }

    case 'get_symbol_source': {
      const proj = projectStore.getProject(args.project);
      if (!proj) throw new Error(`Project '${args.project}' not found`);
      const result = await getSymbolSource(proj, args.file_path || args.path, args.symbol_name, languageRegistry);
      if (!result) throw new Error(`Symbol '${args.symbol_name}' not found in '${args.file_path || args.path}'`);
      return result;
    }

    case 'find_references': {
      const proj = projectStore.getProject(args.project);
      if (!proj) throw new Error(`Project '${args.project}' not found`);
      return await findReferences(proj, args.symbol_name, args.language, languageRegistry);
    }

    case 'safe_replace_node': {
      const proj = projectStore.getProject(args.project);
      if (!proj) throw new Error(`Project '${args.project}' not found`);
      const targetFile = args.file_path || args.path;
      const previousContent = proj.files.get(targetFile)?.content;
      const replaceResult = await safeReplaceNode(
        proj,
        targetFile,
        Number(args.start_byte),
        Number(args.end_byte),
        args.replacement_text,
        languageRegistry,
        { isByteOffset: args.is_byte_offset === true }
      );
      if (!replaceResult.success || previousContent === undefined) {
        return { ...replaceResult, persisted: false };
      }
      if (args.write_to_disk === false) {
        return { ...replaceResult, persisted: false, persistReason: 'write_to_disk_disabled' };
      }
      const persisted = persistReplacedFile(proj.path, targetFile, previousContent, replaceResult.newContent);
      return {
        ...replaceResult,
        persisted: persisted.persisted,
        ...(persisted.reason ? { persistReason: persisted.reason } : {}),
      };
    }

    case 'analyze_function_complexity': {
      const proj = projectStore.getProject(args.project);
      if (!proj) throw new Error(`Project '${args.project}' not found`);
      return await analyzeFunctionComplexity(proj, args.file_path || args.path, languageRegistry);
    }

    case 'get_node_at_position': {
      let code = args.code;
      let lang = args.language;

      if (!code && args.project && args.path) {
        const file = projectStore.getFile(args.project, args.path);
        if (!file) throw new Error(`File ${args.path} not found`);
        code = file.content;
        lang = languageRegistry.resolveFileLanguageOrThrow(args.path, file.language);
      } else if (args.path) {
        lang = languageRegistry.resolveFileLanguageOrThrow(args.path, lang);
      } else if (!lang) {
        throw new Error('Language is required when code snippet is provided');
      }

      if (!code) throw new Error('Code or project + path required');
      const ast = await parseSourceToASTAsync(code, lang);
      const node = findNodeAtPosition(ast, Number(args.row), Number(args.column));
      return node || { error: 'No node found at specified position' };
    }

    case 'run_query': {
      let code = args.code;
      let lang = args.language;

      if (!code && args.project && (args.file_path || args.path)) {
        const filePath = args.file_path || args.path;
        const file = projectStore.getFile(args.project, filePath);
        if (!file) throw new Error(`File ${filePath} not found`);
        code = file.content;
        lang = languageRegistry.resolveFileLanguageOrThrow(filePath, file.language);
      } else if (args.file_path || args.path) {
        lang = languageRegistry.resolveFileLanguageOrThrow(args.file_path || args.path, lang);
      } else if (!lang) {
        throw new Error('Language is required when code snippet is provided');
      }

      if (!code) throw new Error('Code or file_path required');
      return await executeQueryOnSource(code, lang, args.query, {
        captureFilter: args.capture_filter,
        maxResults: args.max_results ? Number(args.max_results) : 100,
      });
    }

    case 'get_symbols': {
      if (args.project && (args.file_path || args.path)) {
        const filePath = args.file_path || args.path;
        const proj = projectStore.getProject(args.project);
        if (proj) {
          return await extractSymbols(
            proj,
            filePath,
            languageRegistry,
            args.symbol_types,
            args.exclude_class_methods
          );
        }
      }

      let code = args.code;
      let lang = args.language;

      if (!code && args.project && (args.file_path || args.path)) {
        const filePath = args.file_path || args.path;
        const file = projectStore.getFile(args.project, filePath);
        if (!file) throw new Error(`File ${filePath} not found`);
        code = file.content;
        lang = languageRegistry.resolveFileLanguageOrThrow(filePath, file.language);
      } else if (args.file_path || args.path) {
        lang = languageRegistry.resolveFileLanguageOrThrow(args.file_path || args.path, lang);
      } else if (!lang) {
        throw new Error('Language is required when code snippet is provided');
      }

      if (!code) throw new Error('Code or file_path required');
      const ast = await parseSourceToASTAsync(code, lang);
      return extractSymbolsFromAST(ast, lang);
    }

    case 'analyze_complexity': {
      if (args.project && (args.file_path || args.path)) {
        const filePath = args.file_path || args.path;
        const proj = projectStore.getProject(args.project);
        if (proj) {
          return await analyzeCodeComplexity(proj, filePath, languageRegistry);
        }
      }

      let code = args.code;
      let lang = args.language;

      if (!code && args.project && (args.file_path || args.path)) {
        const filePath = args.file_path || args.path;
        const file = projectStore.getFile(args.project, filePath);
        if (!file) throw new Error(`File ${filePath} not found`);
        code = file.content;
        lang = languageRegistry.resolveFileLanguageOrThrow(filePath, file.language);
      } else if (args.file_path || args.path) {
        lang = languageRegistry.resolveFileLanguageOrThrow(args.file_path || args.path, lang);
      } else if (!lang) {
        throw new Error('Language is required when code snippet is provided');
      }

      if (!code) throw new Error('Code or file_path required');
      const ast = await parseSourceToASTAsync(code, lang);
      return calculateComplexity(code, ast, lang);
    }

    case 'analyze_project_structure': {
      const proj = projectStore.getProject(args.project);
      if (!proj) throw new Error(`Project '${args.project}' not found`);
      return analyzeProjectStructure(proj, languageRegistry, args.scan_depth || 3);
    }

    case 'find_dependencies': {
      const proj = projectStore.getProject(args.project);
      if (!proj) throw new Error(`Project '${args.project}' not found`);
      return await findDependencies(proj, args.file_path || args.path, languageRegistry);
    }

    case 'search_text': {
      const proj = projectStore.getProject(args.project);
      if (!proj) throw new Error(`Project '${args.project}' not found`);
      return searchText(
        proj,
        args.pattern,
        args.file_pattern || '**/*',
        args.max_results ? Number(args.max_results) : 100,
        args.case_sensitive === true,
        args.whole_word === true,
        args.use_regex === true,
        args.context_lines ? Number(args.context_lines) : 0
      );
    }

    case 'adapt_query': {
      return adaptQuery(args.query, args.from_language, args.to_language);
    }

    case 'build_compound_query': {
      return {
        query: buildCompoundQuery(args.language, args.patterns, args.combine || 'or'),
      };
    }

    case 'find_similar_code': {
      const proj = projectStore.getProject(args.project || 'tree-sitter-core');
      if (proj) {
        return await findSimilarCode(
          proj,
          args.snippet,
          languageRegistry,
          treeCache,
          args.language || 'python',
          args.threshold || 0.5,
          args.max_results || 10
        );
      }

      const candidates = proj
        ? Array.from(proj.files.values()).map((f) => ({
            path: f.path,
            content: f.content,
            language: f.language,
          }))
        : [];

      await ensureLanguagesLoaded([args.language || 'python', ...candidates.map((c) => c.language)]);
      return findSimilarCodeBlocks(
        args.snippet,
        args.language || 'python',
        candidates,
        args.threshold || 0.5,
        args.max_results || 10
      );
    }

    case 'get_query_template_tool': {
      const t = getTemplate(args.language, args.template_name);
      return {
        language: args.language,
        name: args.template_name,
        query: t,
      };
    }

    case 'list_query_templates_tool': {
      if (args.language) {
        return { [args.language]: Object.keys(TEMPLATES[args.language] || {}) };
      }
      const res: Record<string, string[]> = {};
      for (const [l, t] of Object.entries(TEMPLATES)) {
        res[l] = Object.keys(t);
      }
      return res;
    }

    case 'get_node_types': {
      return describeNodeTypes(args.language);
    }

    default:
      throw new Error(`Unknown MCP tool: ${name}`);
  }
}

function requirePromptFile(args: Record<string, any>) {
  const f = projectStore.getFile(args.project, args.file_path);
  if (!f) throw new Error(`File ${args.file_path} not found in project ${args.project}`);
  return f;
}

export function handleMCPPrompt(name: string, args: Record<string, any>): string {
  switch (name) {
    case 'code_review': {
      const f = requirePromptFile(args);
      const code = f.content;
      return `Please review this ${f?.language || 'code'} file:\n\n\`\`\`\n${code}\n\`\`\`\nFocus on clarity, potential bugs, performance, and best practices.`;
    }
    case 'explain_code': {
      const f = requirePromptFile(args);
      const code = f.content;
      return `Please explain this ${f?.language || 'code'} file:\n\n\`\`\`\n${code}\n\`\`\`\nExplain what it does, how it is structured, and any key patterns.`;
    }
    case 'explain_tree_sitter_query': {
      return `Tree-sitter queries use S-expression syntax to match patterns in code.\n\nBasic query syntax:\n- (node_type) - Match nodes of a specific type\n- (node_type field: (child_type)) - Match nodes with specific field relationships\n- @name - Capture a node with a name\n- #predicate - Apply additional constraints`;
    }
    case 'suggest_improvements': {
      const f = requirePromptFile(args);
      return `Please suggest improvements for ${args.file_path} (${f.language}) focusing on modularity, error handling, and performance:\n\n\`\`\`\n${f.content}\n\`\`\``;
    }
    case 'project_overview': {
      const proj = projectStore.getProject(args.project);
      const files = proj ? Array.from(proj.files.keys()).join(', ') : '';
      return `Please analyze this project (${args.project}) with files: ${files}. Provide an overview of its architectural structure.`;
    }
    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}
