/**
 * Monaco empacotado localmente (sem CDN): o loader padrão do @monaco-editor/react baixa o editor
 * de cdn.jsdelivr.net, o que quebra o desktop offline. Aqui apontamos o loader para a instância
 * local de `monaco-editor` e registramos os workers via Vite (`?worker`).
 */
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

(self as unknown as { MonacoEnvironment: monaco.Environment }).MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    switch (label) {
      case 'json':
        return new jsonWorker();
      case 'css':
      case 'scss':
      case 'less':
        return new cssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new htmlWorker();
      case 'typescript':
      case 'javascript':
        return new tsWorker();
      default:
        return new editorWorker();
    }
  },
};

loader.config({ monaco });

/**
 * O serviço de TypeScript embutido no Monaco não conhece o projeto (tsconfig, node_modules), então:
 *  - habilitamos JSX para que .tsx/.jsx não gerem erros de sintaxe falsos;
 *  - desligamos a validação semântica (imports/tipos não resolvidos virariam ruído).
 * Os diagnósticos de sintaxe do app vêm do linter Tree-sitter.
 */
type TsDefaults = {
  setCompilerOptions(options: Record<string, unknown>): void;
  setDiagnosticsOptions(options: Record<string, unknown>): void;
};
const tsApi = ((monaco as unknown as { typescript?: unknown }).typescript ??
  monaco.languages.typescript) as unknown as {
  typescriptDefaults: TsDefaults;
  javascriptDefaults: TsDefaults;
  JsxEmit: { ReactJSX: number };
  ScriptTarget: { ESNext: number };
  ModuleResolutionKind: { NodeJs: number };
};

for (const defaults of [tsApi.typescriptDefaults, tsApi.javascriptDefaults]) {
  defaults.setCompilerOptions({
    jsx: tsApi.JsxEmit.ReactJSX,
    allowNonTsExtensions: true,
    target: tsApi.ScriptTarget.ESNext,
    moduleResolution: tsApi.ModuleResolutionKind.NodeJs,
    allowJs: true,
    esModuleInterop: true,
  });
  defaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false });
}
