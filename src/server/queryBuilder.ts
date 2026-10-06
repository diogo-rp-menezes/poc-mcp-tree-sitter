/**
 * AST/Tree-sitter Language-Agnostic Specification - Section 6
 * Query Builder Operations & Cross-Language Adaptation
 */

import { TEMPLATES, COMMON_NODE_DESCRIPTIONS } from './templates';
import { QueryError } from './errors';

export interface AdaptedQueryResult {
  original_language: string;
  target_language: string;
  original_query: string;
  adapted_query: string;
  /** Avisos sobre a adaptação (ex.: não há mapeamento para o par de linguagens). */
  warnings: string[];
}

/**
 * Common node type translation dictionary between languages.
 */
const LANGUAGE_NODE_MAPS: Record<string, Record<string, string>> = {
  'python->javascript': {
    function_definition: 'function_declaration',
    class_definition: 'class_declaration',
    block: 'statement_block',
    parameters: 'formal_parameters',
    argument_list: 'arguments',
    call: 'call_expression',
    assignment: 'assignment_expression',
  },
  'python->typescript': {
    function_definition: 'function_declaration',
    class_definition: 'class_declaration',
    block: 'statement_block',
    parameters: 'formal_parameters',
    argument_list: 'arguments',
    call: 'call_expression',
    assignment: 'assignment_expression',
  },
  'javascript->python': {
    function_declaration: 'function_definition',
    class_declaration: 'class_definition',
    statement_block: 'block',
    formal_parameters: 'parameters',
    arguments: 'argument_list',
    call_expression: 'call',
    assignment_expression: 'assignment',
  },
  'typescript->python': {
    function_declaration: 'function_definition',
    class_declaration: 'class_definition',
    statement_block: 'block',
    formal_parameters: 'parameters',
    arguments: 'argument_list',
    call_expression: 'call',
    assignment_expression: 'assignment',
  },
  'python->rust': {
    function_definition: 'function_item',
    class_definition: 'struct_item',
    block: 'block',
    parameters: 'parameters',
    argument_list: 'arguments',
    call: 'call_expression',
  },
  'rust->python': {
    function_item: 'function_definition',
    struct_item: 'class_definition',
    call_expression: 'call',
    arguments: 'argument_list',
  },
  'python->go': {
    function_definition: 'function_declaration',
    class_definition: 'type_spec',
    block: 'block',
    parameters: 'parameter_list',
    argument_list: 'argument_list',
    call: 'call_expression',
  },
  'go->python': {
    function_declaration: 'function_definition',
    type_spec: 'class_definition',
    parameter_list: 'parameters',
    call_expression: 'call',
  },
};

/**
 * 6.1 Template Retrieval: Returns template if pattern is a known name; else returns pattern as-is.
 */
export function getTemplate(language: string, pattern: string): string {
  const langKey = language.toLowerCase();
  const patternKey = pattern.toLowerCase();
  if (TEMPLATES[langKey] && TEMPLATES[langKey][patternKey]) {
    return TEMPLATES[langKey][patternKey];
  }
  return pattern;
}

/**
 * 6.2 Compound Query Building: Combines multiple patterns into a single query.
 */
export function buildCompoundQuery(
  language: string,
  patterns: string[],
  combine: 'or' | 'and' = 'or'
): string {
  const resolved = patterns.map((p) => getTemplate(language, p).trim());

  if (combine === 'and') {
    // Tree-sitter não tem AND entre padrões de topo: cada padrão casa de forma independente
    // (o resultado seria sempre a união). Em vez de fingir semântica AND, recusamos.
    if (resolved.length > 1) {
      throw new QueryError(
        "combine='and' não é suportado: queries Tree-sitter não combinam padrões de topo com AND. " +
          "Use combine='or' ou aninhe as condições em um único padrão S-expression (com predicados #eq?/#match?).",
        { combine, patterns: patterns.length }
      );
    }
    return resolved[0] ?? '';
  }

  // Tree-sitter trata vários padrões separados por linha em branco como OR.
  return resolved.join('\n\n');
}

/**
 * 6.3 Cross-Language Query Adaptation: Translates node types across grammars.
 */
export function adaptQuery(
  query: string,
  fromLanguage: string,
  toLanguage: string
): AdaptedQueryResult {
  const fromNorm = fromLanguage.toLowerCase();
  const toNorm = toLanguage.toLowerCase();
  const mapKey = `${fromNorm}->${toNorm}`;

  let adapted = query;
  const warnings: string[] = [];
  const translationMap = LANGUAGE_NODE_MAPS[mapKey];

  if (fromNorm === toNorm) {
    warnings.push(`Linguagem de origem e destino são iguais ('${fromLanguage}'); a query não foi alterada.`);
  } else if (!translationMap) {
    warnings.push(
      `Não há mapeamento de nós de '${fromLanguage}' para '${toLanguage}'; a query foi devolvida sem alterações.`
    );
  }

  if (translationMap) {
    for (const [sourceNode, targetNode] of Object.entries(translationMap)) {
      // Replace node name taking parentheses into account
      const regex = new RegExp(`\\b${sourceNode}\\b`, 'g');
      adapted = adapted.replace(regex, targetNode);
    }
  }

  if (translationMap && adapted === query) {
    warnings.push('Nenhum tipo de nó da query possui equivalente mapeado; a query não foi alterada.');
  }

  return {
    original_language: fromLanguage,
    target_language: toLanguage,
    original_query: query,
    adapted_query: adapted,
    warnings,
  };
}

/**
 * 6.4 Node Type Descriptions: Human-readable descriptions of common node types.
 */
export function describeNodeTypes(language: string): Record<string, string> {
  const langNorm = language.toLowerCase();
  return COMMON_NODE_DESCRIPTIONS[langNorm] || {};
}
