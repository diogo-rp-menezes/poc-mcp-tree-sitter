// Web Worker for asynchronous background Tree-sitter syntax validation & linting.
// As regras (e as correções rápidas) vivem em ../lint/lint.ts, compartilhadas com o fallback síncrono.
import { computeMarkers } from '../lint/lint';

export type { LintMarker } from '../lint/lint';

self.onmessage = (e: MessageEvent) => {
  const { id, ast, code, language } = e.data;
  self.postMessage({ id, markers: computeMarkers(ast, code, language) });
};
