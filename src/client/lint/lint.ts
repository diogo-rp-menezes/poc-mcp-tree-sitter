/**
 * Regras de lint do editor (Tree-sitter + heurísticas por linguagem), compartilhadas entre o
 * Web Worker (`workers/linter.worker.ts`) e o fallback síncrono do `CodeEditor`.
 *
 * Cada marcador pode carregar uma correção rápida (`fix`) já pronta: a lista de edições que o
 * Monaco aplica via Code Actions (lâmpada / Ctrl+.). Só há `fix` quando a correção é
 * determinística; os demais casos (nós ERROR genéricos, `const` sem inicializador, chaves
 * desalinhadas) ficam sem sugestão.
 */
import type { ASTNode } from '../types';

export const SEVERITY_ERROR = 8; // monaco.MarkerSeverity.Error
export const SEVERITY_WARNING = 4; // monaco.MarkerSeverity.Warning
export const SEVERITY_INFO = 2; // monaco.MarkerSeverity.Info (não conta como problema)

export interface LintRange {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export interface LintTextEdit {
  range: LintRange;
  text: string;
}

export interface LintFix {
  title: string;
  edits: LintTextEdit[];
  /**
   * Conteúdo da linha no momento em que o marcador foi gerado. O worker é assíncrono: se o
   * usuário digitou depois disso, as posições podem estar velhas. O editor só oferece a correção
   * se a linha ainda estiver idêntica.
   */
  guard: { lineNumber: number; lineText: string };
}

export interface LintMarker extends LintRange {
  message: string;
  severity: number;
  /** Identificador estável da regra (ex.: `py-missing-colon`). */
  code?: string;
  fix?: LintFix;
}

const BRACE_LANGS = new Set([
  'typescript', 'tsx', 'javascript', 'jsx', 'ts', 'js', 'rust', 'rs', 'cpp', 'java', 'css', 'json',
]);
const JS_LANGS = new Set(['typescript', 'tsx', 'javascript', 'jsx', 'ts', 'js']);
const PY_LANGS = new Set(['python', 'py']);
const GO_LANGS = new Set(['go', 'golang']);

/** Tokens que, quando o Tree-sitter os marca como MISSING, podem ser inseridos sem ambiguidade. */
const INSERTABLE_MISSING_TOKENS = new Set([';', ')', ']', '}', ':']);

/** Remove o '\r' de fim de linha (arquivos CRLF): o Monaco não inclui EOL em `getLineContent`. */
function splitLines(code: string): string[] {
  return code.split(/\r?\n/);
}

function lineGuard(lines: string[], lineNumber: number): LintFix['guard'] {
  return { lineNumber, lineText: lines[lineNumber - 1] ?? '' };
}

// ---------------------------------------------------------------------------
// 1. Nós ERROR da AST
// ---------------------------------------------------------------------------

/**
 * A gramática tree-sitter-tsx trata um '&' solto em texto JSX (`Claude Desktop & Cursor`) como
 * início de entidade HTML e gera um nó ERROR, embora o código seja válido. Nesse caso (nó ERROR
 * dentro de JSX cujo primeiro caractere é '&') emitimos só uma dica com a correção `&amp;`.
 */
function jsxAmpersandMarker(node: ASTNode, lines: string[]): LintMarker | null {
  const row = node.startPoint.row;
  const col = node.startPoint.column;
  const lineText = lines[row];
  if (lineText === undefined || lineText[col] !== '&') return null;
  if (HTML_ENTITY_AT_START.test(lineText.slice(col))) return null; // já é entidade
  const range: LintRange = {
    startLineNumber: row + 1,
    startColumn: col + 1,
    endLineNumber: row + 1,
    endColumn: col + 2,
  };
  return {
    ...range,
    message: `[Tree-sitter Lint] '&' solto em texto JSX é válido, mas o parser o rejeita; prefira '&amp;'`,
    severity: SEVERITY_INFO,
    code: 'jsx-bare-ampersand',
    fix: {
      title: `Substituir '&' por '&amp;'`,
      edits: [{ range, text: '&amp;' }],
      guard: lineGuard(lines, row + 1),
    },
  };
}

const HTML_ENTITY_AT_START = /^&(#\d+|#x[0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);/;

/**
 * Posições ("linha:coluna", 0-based como no Tree-sitter) dos nós ERROR que são só um '&' solto em
 * texto JSX. Usado pelo painel de Diagnósticos para concordar com o editor.
 */
export function findJsxBareAmpersandErrors(ast: ASTNode | null | undefined): Set<string> {
  const found = new Set<string>();
  const walk = (node: ASTNode, inJsx: boolean) => {
    if (inJsx && (node.type === 'ERROR' || node.type.includes('ERROR')) && node.text?.[0] === '&') {
      if (!HTML_ENTITY_AT_START.test(node.text)) {
        found.add(`${node.startPoint.row}:${node.startPoint.column}`);
      }
    }
    const childInJsx = inJsx || node.type.startsWith('jsx');
    if (Array.isArray(node.children)) for (const child of node.children) walk(child, childInJsx);
  };
  if (ast) walk(ast, false);
  return found;
}

/**
 * Quantidade de problemas de sintaxe da AST, com o MESMO critério do painel de Diagnósticos
 * (ast.errors, sem os '&' soltos em JSX). Usada pelo selo da barra de atividades e pela barra de
 * status, para não divergirem do painel.
 */
export function countSyntaxProblems(ast: ASTNode | null | undefined): number {
  if (!ast) return 0;
  const ignored = findJsxBareAmpersandErrors(ast);
  if (Array.isArray(ast.errors)) {
    return ast.errors.filter(
      (d) => d.isMissing || !ignored.has(`${d.startPosition.row}:${d.startPosition.column}`)
    ).length;
  }
  let count = 0;
  const walk = (node: ASTNode) => {
    const isError = node.type === 'ERROR' || node.type.includes('ERROR');
    const isMissing = node.type.startsWith('MISSING');
    if ((isError && !ignored.has(`${node.startPoint.row}:${node.startPoint.column}`)) || isMissing) count++;
    if (Array.isArray(node.children)) node.children.forEach(walk);
  };
  walk(ast);
  return count;
}

function extractASTErrorNodes(node: ASTNode | null, markers: LintMarker[], lines: string[], inJsx = false) {
  if (!node) return;

  if (node.type === 'ERROR' || node.type.includes('ERROR')) {
    const ampersand = inJsx ? jsxAmpersandMarker(node, lines) : null;
    if (ampersand) {
      markers.push(ampersand);
    } else {
      const textSnippet = node.text ? node.text.trim().slice(0, 30) : '';
      markers.push({
        startLineNumber: node.startPoint.row + 1,
        startColumn: node.startPoint.column + 1,
        endLineNumber: node.endPoint.row + 1,
        endColumn: Math.max(node.endPoint.column + 1, node.startPoint.column + 2),
        message: textSnippet
          ? `[Tree-sitter Lint] Erro de sintaxe próximo a '${textSnippet}'`
          : `[Tree-sitter Lint] Erro de sintaxe ou token não reconhecido`,
        severity: SEVERITY_ERROR,
        code: 'ts-error-node',
      });
    }
  }

  const childInJsx = inJsx || node.type.startsWith('jsx');
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      extractASTErrorNodes(child, markers, lines, childInJsx);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Nós MISSING (vêm em `ast.errors`, calculado no servidor com `node.isMissing`)
//
// No Tree-sitter um nó MISSING mantém o `type` do token esperado (';', ')' ...) e tem largura
// zero; ele não aparece com type "MISSING". Por isso a fonte confiável é `ast.errors`.
// ---------------------------------------------------------------------------

function collectMissingTokenMarkers(ast: ASTNode | null | undefined, lines: string[], markers: LintMarker[]) {
  const errors = ast?.errors;
  if (!Array.isArray(errors)) return;

  const seen = new Set<string>();
  for (const diag of errors) {
    if (!diag.isMissing) continue;
    const row = diag.startPosition.row;
    const col = diag.startPosition.column;
    const key = `${row}:${col}:${diag.type}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const lineText = lines[row];
    const insertable =
      INSERTABLE_MISSING_TOKENS.has(diag.type) && lineText !== undefined && col <= lineText.length;

    const marker: LintMarker = {
      startLineNumber: row + 1,
      startColumn: col + 1,
      endLineNumber: row + 1,
      endColumn: col + 2,
      message: insertable
        ? `[Tree-sitter Lint] Token ausente: '${diag.type}'`
        : `[Tree-sitter Lint] Elemento sintático ausente (${diag.type})`,
      severity: SEVERITY_ERROR,
      code: 'ts-missing-token',
    };

    if (insertable) {
      marker.fix = {
        title: `Inserir '${diag.type}'`,
        edits: [
          {
            range: { startLineNumber: row + 1, startColumn: col + 1, endLineNumber: row + 1, endColumn: col + 1 },
            text: diag.type,
          },
        ],
        guard: lineGuard(lines, row + 1),
      };
    }
    markers.push(marker);
  }
}

// ---------------------------------------------------------------------------
// 3. Python
// ---------------------------------------------------------------------------

/** Para cada linha, indica se ela COMEÇA dentro de uma string de aspas triplas (docstring). */
function pythonLinesInsideTripleString(lines: string[]): boolean[] {
  const result: boolean[] = [];
  let open: string | null = null;

  for (const line of lines) {
    result.push(open !== null);
    let i = 0;
    while (i < line.length) {
      if (open) {
        const end = line.indexOf(open, i);
        if (end === -1) {
          i = line.length;
        } else {
          open = null;
          i = end + 3;
        }
        continue;
      }
      const c = line[i];
      if (c === '#') break;
      if (c === '"' || c === "'") {
        const triple = c.repeat(3);
        if (line.startsWith(triple, i)) {
          open = triple;
          i += 3;
          continue;
        }
        let j = i + 1;
        while (j < line.length && line[j] !== c) {
          if (line[j] === '\\') j++;
          j++;
        }
        i = j + 1;
        continue;
      }
      i++;
    }
  }
  return result;
}

/** Profundidade de colchetes no fim da linha e se já existe um ':' fora de colchetes/strings. */
function analyzePythonHeader(text: string): { depth: number; topLevelColon: boolean } {
  let depth = 0;
  let topLevelColon = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'") {
      const triple = c.repeat(3);
      if (text.startsWith(triple, i)) {
        const end = text.indexOf(triple, i + 3);
        if (end === -1) break;
        i = end + 2;
        continue;
      }
      let j = i + 1;
      while (j < text.length && text[j] !== c) {
        if (text[j] === '\\') j++;
        j++;
      }
      i = j;
      continue;
    }
    if (c === '#') break;
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ':' && depth === 0 && text[i + 1] !== '=') topLevelColon = true;
  }
  return { depth, topLevelColon };
}

/** Linha termina em operador/continuação: o ':' não pertence ao fim dela. */
const PY_CONTINUATION_END = /(\b(?:and|or|not|in|is)|[+\-*/%&|^=<>,.\\~])\s*$/;

function checkPythonColon(lineText: string, lineNumber: number, lines: string[], markers: LintMarker[]) {
  const trimmed = lineText.trim();
  if (
    !/^(def|class|if|elif|else|for|while|try|except|finally|with)\b/.test(trimmed) ||
    trimmed.endsWith(':') ||
    trimmed.endsWith('\\') ||
    trimmed.includes('#')
  ) {
    return;
  }

  const { depth, topLevelColon } = analyzePythonHeader(trimmed);
  // `else: pass` já tem o ':' e `if (a and` continua na próxima linha: não são erros.
  if (topLevelColon || depth > 0) return;

  const canFix = !PY_CONTINUATION_END.test(trimmed);
  const fix: LintFix | undefined = canFix
    ? (() => {
        const insertColumn = lineText.replace(/\s+$/, '').length + 1;
        return {
          title: `Adicionar ':' ao final da linha`,
          edits: [
            {
              range: {
                startLineNumber: lineNumber,
                startColumn: insertColumn,
                endLineNumber: lineNumber,
                endColumn: insertColumn,
              },
              text: ':',
            },
          ],
          guard: lineGuard(lines, lineNumber),
        };
      })()
    : undefined;

  // Em geral o Tree-sitter já marcou a linha com um nó ERROR: a correção vai nesse marcador
  // (assim a lâmpada aparece nele) em vez de duplicar o aviso.
  const existing = markers.find((m) => m.startLineNumber === lineNumber);
  if (existing) {
    if (fix && !existing.fix) {
      existing.fix = fix;
      existing.code = existing.code ?? 'py-missing-colon';
    }
    return;
  }

  markers.push({
    startLineNumber: lineNumber,
    startColumn: Math.max(1, lineText.indexOf(trimmed) + 1),
    endLineNumber: lineNumber,
    endColumn: lineText.length + 1,
    message: `[Linter Python] Dois-pontos ':' ausente no final da instrução '${trimmed.split(' ')[0]}'`,
    severity: SEVERITY_WARNING,
    code: 'py-missing-colon',
    fix,
  });
}

// ---------------------------------------------------------------------------
// 4. JSON: vírgula sobressalente (antes de '}' / ']' ou no fim do arquivo)
// ---------------------------------------------------------------------------

function checkJsonTrailingCommas(code: string, lines: string[], markers: LintMarker[]) {
  const lineStarts = [0];
  for (let i = 0; i < code.length; i++) {
    if (code[i] === '\n') lineStarts.push(i + 1);
  }
  const lineOf = (offset: number): number => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };

  let inString = false;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c !== ',') continue;

    let j = i + 1;
    while (j < code.length && /\s/.test(code[j])) j++;
    const next = j < code.length ? code[j] : '';
    if (next !== '}' && next !== ']' && next !== '') continue;

    const row = lineOf(i);
    const col = i - lineStarts[row];
    const lineNumber = row + 1;
    const range: LintRange = {
      startLineNumber: lineNumber,
      startColumn: col + 1,
      endLineNumber: lineNumber,
      endColumn: col + 2,
    };
    markers.push({
      ...range,
      message:
        next === ''
          ? `[Linter JSON] Vírgula sobressalente no final da estrutura JSON`
          : `[Linter JSON] Vírgula sobressalente antes de '${next}'`,
      severity: SEVERITY_WARNING,
      code: 'json-trailing-comma',
      fix: {
        title: 'Remover vírgula sobressalente',
        edits: [{ range, text: '' }],
        guard: lineGuard(lines, lineNumber),
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Entrada principal
// ---------------------------------------------------------------------------

export function computeMarkers(
  ast: ASTNode | null | undefined,
  code: string | null | undefined,
  language: string | null | undefined
): LintMarker[] {
  const markers: LintMarker[] = [];
  const lang = (language || '').toLowerCase();
  const lines = splitLines(code || '');

  if (ast) {
    extractASTErrorNodes(ast, markers, lines);
    collectMissingTokenMarkers(ast, lines, markers);
  }

  if (!code) return markers;

  const checkBrackets = BRACE_LANGS.has(lang);
  let openBraces = 0;
  let openParens = 0;
  let openBrackets = 0;

  const insideTripleString = PY_LANGS.has(lang) ? pythonLinesInsideTripleString(lines) : [];

  lines.forEach((lineText, idx) => {
    const lineNumber = idx + 1;
    const trimmed = lineText.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) {
      return;
    }

    if (checkBrackets) {
      for (let i = 0; i < lineText.length; i++) {
        const char = lineText[i];
        if (char === '{') openBraces++;
        else if (char === '}') openBraces--;
        else if (char === '(') openParens++;
        else if (char === ')') openParens--;
        else if (char === '[') openBrackets++;
        else if (char === ']') openBrackets--;
      }
    }

    if (PY_LANGS.has(lang) && !insideTripleString[idx]) {
      checkPythonColon(lineText, lineNumber, lines, markers);
    }

    if (JS_LANGS.has(lang)) {
      // `const x;` não tem correção determinística (qual valor inicial?): só sinalizamos.
      if (/^const\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*(;|\s*$)/.test(trimmed)) {
        markers.push({
          startLineNumber: lineNumber,
          startColumn: Math.max(1, lineText.indexOf(trimmed) + 1),
          endLineNumber: lineNumber,
          endColumn: lineText.length + 1,
          message: `[Linter JS/TS] Declaração 'const' precisa ser inicializada`,
          severity: SEVERITY_ERROR,
          code: 'js-const-uninitialized',
        });
      }
    }

    if (GO_LANGS.has(lang) && idx === 0 && !trimmed.startsWith('package ')) {
      markers.push({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: lineText.length + 1,
        message: `[Linter Go] Arquivos Go devem começar com declaração 'package <nome>'`,
        severity: SEVERITY_WARNING,
        code: 'go-missing-package',
        fix: {
          title: `Inserir 'package main' no topo`,
          edits: [
            {
              range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
              text: 'package main\n\n',
            },
          ],
          guard: lineGuard(lines, 1),
        },
      });
    }
  });

  if (lang === 'json') {
    checkJsonTrailingCommas(code, lines, markers);
  }

  if (checkBrackets) {
    const lastLine = lines[lines.length - 1] ?? '';
    if (openBraces !== 0) {
      markers.push({
        startLineNumber: lines.length,
        startColumn: 1,
        endLineNumber: lines.length,
        endColumn: lastLine.length + 1,
        message: `[Linter] Chaves '{' e '}' desalinhadas (saldo: ${openBraces > 0 ? '+' : ''}${openBraces})`,
        severity: SEVERITY_WARNING,
        code: 'brace-balance',
      });
    }
    if (openParens !== 0) {
      markers.push({
        startLineNumber: lines.length,
        startColumn: 1,
        endLineNumber: lines.length,
        endColumn: lastLine.length + 1,
        message: `[Linter] Parênteses '(' e ')' desalinhados (saldo: ${openParens > 0 ? '+' : ''}${openParens})`,
        severity: SEVERITY_WARNING,
        code: 'paren-balance',
      });
    }
  }

  return markers;
}
