import { describe, it, expect } from 'vitest';
import { computeMarkers, countSyntaxProblems, findJsxBareAmpersandErrors, type LintMarker } from '../lint';
import type { ASTNode } from '../../types';

/** Aplica as edições de um fix numa string, como o Monaco faria (linhas/colunas 1-based). */
function applyFix(code: string, marker: LintMarker): string {
  const fix = marker.fix!;
  const lines = code.split('\n');
  const offsetOf = (line: number, col: number) =>
    lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0) + (col - 1);
  const edits = [...fix.edits].sort(
    (a, b) => offsetOf(b.range.startLineNumber, b.range.startColumn) - offsetOf(a.range.startLineNumber, a.range.startColumn)
  );
  let out = code;
  for (const e of edits) {
    const s = offsetOf(e.range.startLineNumber, e.range.startColumn);
    const end = offsetOf(e.range.endLineNumber, e.range.endColumn);
    out = out.slice(0, s) + e.text + out.slice(end);
  }
  return out;
}

const fixable = (markers: LintMarker[]) => markers.filter((m) => m.fix);

function rootWithErrors(errors: ASTNode['errors']): ASTNode {
  return {
    type: 'program',
    startPoint: { row: 0, column: 0 },
    endPoint: { row: 0, column: 0 },
    startByte: 0,
    endByte: 0,
    children: [],
    hasError: true,
    errors,
  };
}

describe('quick fixes por regra', () => {
  it('Python: adiciona ":" no fim da linha (mantendo espaços finais fora)', () => {
    const code = 'def f(x)  \n    return x\n';
    const markers = computeMarkers(null, code, 'python');
    const [m] = fixable(markers);
    expect(m.code).toBe('py-missing-colon');
    expect(applyFix(code, m)).toBe('def f(x):  \n    return x\n');
  });

  it('Python: anexa a correção ao marcador ERROR da mesma linha em vez de duplicar', () => {
    const code = 'if x\n    pass\n';
    const ast = rootWithErrors([]);
    ast.children = [
      {
        type: 'ERROR',
        text: 'if x',
        startPoint: { row: 0, column: 0 },
        endPoint: { row: 0, column: 4 },
        startByte: 0,
        endByte: 4,
        children: [],
      },
    ];
    const markers = computeMarkers(ast, code, 'python');
    expect(markers.filter((m) => m.startLineNumber === 1)).toHaveLength(1);
    expect(markers[0].fix?.title).toContain(':');
  });

  it('Python: não sugere nem marca quando o ":" já existe ou a instrução continua', () => {
    expect(computeMarkers(null, 'else: pass\n', 'python')).toHaveLength(0);
    expect(computeMarkers(null, 'if (a and\n    b):\n    pass\n', 'python')).toHaveLength(0);
    expect(computeMarkers(null, 'x = """\nif foo\n"""\n', 'python')).toHaveLength(0);
  });

  it('Python: sem fix quando a linha termina em operador', () => {
    const markers = computeMarkers(null, 'if a and\n', 'python');
    expect(fixable(markers)).toHaveLength(0);
  });

  it('JSON: remove vírgula antes de } ou ] e no fim do arquivo, ignorando strings', () => {
    const code = '{\n  "a": [1, 2,],\n  "b": "x,}",\n  "c": 1,\n}\n';
    const markers = fixable(computeMarkers(null, code, 'json'));
    expect(markers.map((m) => m.startLineNumber)).toEqual([2, 4]);
    expect(applyFix(code, markers[0])).toContain('[1, 2]');
    expect(applyFix(code, markers[1])).toContain('"c": 1\n');
    expect(markers.every((m) => m.code === 'json-trailing-comma')).toBe(true);
  });

  it('JSON: vírgula no último caractere do arquivo', () => {
    const code = '{"a": 1},';
    const [m] = fixable(computeMarkers(null, code, 'json'));
    expect(applyFix(code, m)).toBe('{"a": 1}');
  });

  it('Go: insere package main no topo', () => {
    const code = 'func main() {}\n';
    const [m] = fixable(computeMarkers(null, code, 'go'));
    expect(m.code).toBe('go-missing-package');
    expect(applyFix(code, m)).toBe('package main\n\nfunc main() {}\n');
  });

  it('Tree-sitter MISSING: insere o token ausente a partir de ast.errors', () => {
    const code = 'const a = 1\nconst b = 2;\n';
    const ast = rootWithErrors([
      {
        type: ';',
        isMissing: true,
        startPosition: { row: 0, column: 11 },
        endPosition: { row: 0, column: 11 },
        startByte: 11,
        endByte: 11,
      },
    ]);
    const [m] = fixable(computeMarkers(ast, code, 'typescript'));
    expect(m.code).toBe('ts-missing-token');
    expect(applyFix(code, m)).toBe('const a = 1;\nconst b = 2;\n');
  });

  it('Tree-sitter MISSING: tokens não determinísticos ficam sem fix', () => {
    const ast = rootWithErrors([
      {
        type: 'identifier',
        isMissing: true,
        startPosition: { row: 0, column: 3 },
        endPosition: { row: 0, column: 3 },
        startByte: 3,
        endByte: 3,
      },
    ]);
    const markers = computeMarkers(ast, 'let ', 'typescript');
    expect(markers).toHaveLength(1);
    expect(markers[0].fix).toBeUndefined();
  });

  it('sem correção determinística: const sem inicializador e chaves desalinhadas', () => {
    const markers = computeMarkers(null, 'const x;\nfunction f() {\n', 'typescript');
    expect(markers.map((m) => m.code).sort()).toEqual(['brace-balance', 'js-const-uninitialized']);
    expect(fixable(markers)).toHaveLength(0);
  });

  it('JSX: "&" solto vira dica com fix &amp; em vez de erro', () => {
    const code = '<span>Claude Desktop & Cursor</span>\n';
    const ast = rootWithErrors([]);
    ast.children = [
      {
        type: 'jsx_element',
        startPoint: { row: 0, column: 0 },
        endPoint: { row: 0, column: 36 },
        startByte: 0,
        endByte: 36,
        children: [
          {
            type: 'ERROR',
            text: '& Cursor',
            startPoint: { row: 0, column: 21 },
            endPoint: { row: 0, column: 29 },
            startByte: 20,
            endByte: 28,
            children: [],
          },
        ],
      },
    ];
    const markers = computeMarkers(ast, code, 'typescript');
    expect(markers).toHaveLength(1);
    expect(markers[0].code).toBe('jsx-bare-ampersand');
    expect(markers[0].severity).toBe(2);
    expect(applyFix(code, markers[0])).toBe('<span>Claude Desktop &amp; Cursor</span>\n');
  });

  it('findJsxBareAmpersandErrors: mesma regra do editor, para o painel de diagnósticos', () => {
    const node = (type: string, text: string, col: number, children: ASTNode[] = []): ASTNode => ({
      type, text, startPoint: { row: 319, column: col }, endPoint: { row: 319, column: col + text.length },
      startByte: 0, endByte: 0, children,
    });
    const inJsx = node('jsx_element', '', 0, [node('ERROR', '& Cursor', 49), node('ERROR', '&amp; x', 70)]);
    const outside = node('program', '', 0, [node('ERROR', '& b', 2)]);
    expect([...findJsxBareAmpersandErrors(inJsx)]).toEqual(['319:49']);
    expect(findJsxBareAmpersandErrors(outside).size).toBe(0);
  });

  it('countSyntaxProblems: nulo = 0, ignora o & de JSX e conta o resto', () => {
    expect(countSyntaxProblems(null)).toBe(0);
    const errs = (rows: number[]) =>
      rows.map((r) => ({ type: 'ERROR', isMissing: false, startPosition: { row: r, column: 49 }, endPosition: { row: r, column: 57 }, startByte: 0, endByte: 0 }));
    const root = rootWithErrors(errs([319, 400]));
    root.children = [
      { type: 'jsx_element', startPoint: { row: 0, column: 0 }, endPoint: { row: 0, column: 0 }, startByte: 0, endByte: 0,
        children: [{ type: 'ERROR', text: '& Cursor', startPoint: { row: 319, column: 49 }, endPoint: { row: 319, column: 57 }, startByte: 0, endByte: 0, children: [] }] },
    ];
    expect(countSyntaxProblems(root)).toBe(1);
    expect(countSyntaxProblems({ ...root, errors: [] })).toBe(0);
  });

  it('"&" fora de JSX continua sendo erro', () => {
    const ast = rootWithErrors([]);
    ast.children = [
      { type: 'ERROR', text: '& b', startPoint: { row: 0, column: 2 }, endPoint: { row: 0, column: 5 }, startByte: 2, endByte: 5, children: [] },
    ];
    const markers = computeMarkers(ast, 'a & b', 'typescript');
    expect(markers[0].code).toBe('ts-error-node');
    expect(markers[0].severity).toBe(8);
  });

  it('o guard guarda o texto da linha (sem \\r em arquivos CRLF)', () => {
    const [m] = fixable(computeMarkers(null, 'def f()\r\n    pass\r\n', 'python'));
    expect(m.fix!.guard).toEqual({ lineNumber: 1, lineText: 'def f()' });
  });
});
