export interface ControlFieldExpressionContext {
  currentValue: number;
  min?: number;
  max?: number;
}

export type ControlFieldExpressionResolver = (
  expression: string,
  context: ControlFieldExpressionContext,
) => number | null;

type Token =
  | { type: 'number'; value: number }
  | { type: 'operator'; value: '+' | '-' | '*' | '/' | '^' }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'current' };

function tokenize(expression: string): Token[] | null {
  const tokens: Token[] = [];
  let index = 0;

  while (index < expression.length) {
    const character = expression[index];

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (character === '(' || character === ')') {
      tokens.push({ type: 'paren', value: character });
      index += 1;
      continue;
    }

    if ('+-*/^'.includes(character)) {
      tokens.push({
        type: 'operator',
        value: character as '+' | '-' | '*' | '/' | '^',
      });
      index += 1;
      continue;
    }

    if (/\d|\./.test(character)) {
      const match = expression.slice(index).match(/^(?:\d+\.?\d*|\.\d+)/);
      if (!match) return null;

      const value = Number(match[0]);
      if (!Number.isFinite(value)) return null;

      tokens.push({ type: 'number', value });
      index += match[0].length;
      continue;
    }

    const identifier = expression.slice(index).match(/^(?:current|value|x)\b/i);
    if (identifier) {
      tokens.push({ type: 'current' });
      index += identifier[0].length;
      continue;
    }

    return null;
  }

  return tokens;
}

function evaluate(tokens: Token[], currentValue: number): number | null {
  let index = 0;

  const parseExpression = (): number | null => {
    const first = parseTerm();
    if (first === null) return null;

    let value = first;
    while (true) {
      const token = tokens[index];
      if (token?.type !== 'operator') break;
      const operator = token.value;
      if (operator !== '+' && operator !== '-') break;
      index += 1;

      const right = parseTerm();
      if (right === null) return null;
      value = operator === '+' ? value + right : value - right;
    }

    return value;
  };

  const parseTerm = (): number | null => {
    const first = parseUnary();
    if (first === null) return null;

    let value = first;
    while (true) {
      const token = tokens[index];
      if (token?.type !== 'operator') break;
      const operator = token.value;
      if (operator !== '*' && operator !== '/') break;
      index += 1;

      const right = parseUnary();
      if (right === null) return null;
      value = operator === '*' ? value * right : value / right;
    }

    return value;
  };

  const parseUnary = (): number | null => {
    const token = tokens[index];
    if (
      token?.type === 'operator' &&
      (token.value === '+' || token.value === '-')
    ) {
      index += 1;
      const value = parseUnary();
      if (value === null) return null;
      return token.value === '-' ? -value : value;
    }

    return parsePower();
  };

  const parsePower = (): number | null => {
    const left = parsePrimary();
    if (left === null) return null;

    const operator = tokens[index];
    if (operator?.type === 'operator' && operator.value === '^') {
      index += 1;
      const right = parseUnary();
      return right === null ? null : left ** right;
    }

    return left;
  };

  const parsePrimary = (): number | null => {
    const token = tokens[index];
    if (!token) return null;

    if (token.type === 'number') {
      index += 1;
      return token.value;
    }

    if (token.type === 'current') {
      index += 1;
      return currentValue;
    }

    if (token.type === 'paren' && token.value === '(') {
      index += 1;
      const value = parseExpression();
      const closing = tokens[index];
      if (
        value === null ||
        closing?.type !== 'paren' ||
        closing.value !== ')'
      ) {
        return null;
      }
      index += 1;
      return value;
    }

    return null;
  };

  const value = parseExpression();
  return index === tokens.length && Number.isFinite(value) ? value : null;
}

/**
 * Resolves arithmetic entered in a Control Field without executing JavaScript.
 * Leading `+`, `*`, and `/` operators are relative to the current value. Use
 * `current`, `value`, or `x` when an explicit reference reads more clearly.
 */
export const resolveControlFieldExpression: ControlFieldExpressionResolver = (
  expression,
  context,
) => {
  const trimmed = expression.trim();
  if (!trimmed) return null;

  const relativeExpression = /^[+*/]/.test(trimmed)
    ? `current ${trimmed}`
    : trimmed;
  const tokens = tokenize(relativeExpression);
  if (!tokens?.length) return null;

  return evaluate(tokens, context.currentValue);
};
