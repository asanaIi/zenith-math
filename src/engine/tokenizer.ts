export type Token =
  | { type: 'num'; value: number }
  | { type: 'var'; name: string }
  | { type: 'func'; name: string }
  | { type: 'op'; name: string }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'comma' };

const FUNCS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'sinh', 'cosh', 'tanh',
  'log', 'ln', 'log2',
  'sqrt', 'cbrt', 'abs', 'exp',
  'floor', 'ceil', 'round', 'sign',
  'min', 'max', 'mod', 'pow',
]);

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
};

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = input.replace(/\s+/g, '');

  while (i < s.length) {
    const c = s[i];

    if (c >= '0' && c <= '9' || c === '.') {
      let j = i + 1;
      while (j < s.length && ((s[j] >= '0' && s[j] <= '9') || s[j] === '.')) j++;
      // scientific notation
      if (j < s.length && (s[j] === 'e' || s[j] === 'E')) {
        j++;
        if (j < s.length && (s[j] === '+' || s[j] === '-')) j++;
        while (j < s.length && s[j] >= '0' && s[j] <= '9') j++;
      }
      tokens.push({ type: 'num', value: parseFloat(s.slice(i, j)) });
      i = j;
      continue;
    }

    if (c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z') {
      let j = i + 1;
      while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j++;
      const name = s.slice(i, j).toLowerCase();
      if (FUNCS.has(name)) {
        tokens.push({ type: 'func', name });
      } else if (name in CONSTANTS) {
        tokens.push({ type: 'num', value: CONSTANTS[name] });
      } else if (name === 'x' || name === 't') {
        tokens.push({ type: 'var', name });
      } else {
        throw new Error(`Unknown identifier: ${name}`);
      }
      i = j;
      continue;
    }

    if (c === '(') { tokens.push({ type: 'lparen' }); i++; continue; }
    if (c === ')') { tokens.push({ type: 'rparen' }); i++; continue; }
    if (c === ',') { tokens.push({ type: 'comma' }); i++; continue; }

    if (c === '+' || c === '-') {
      // detect unary minus/plus
      const prev = tokens[tokens.length - 1];
      const isUnary = !prev || prev.type === 'op' || prev.type === 'lparen' || prev.type === 'comma';
      if (isUnary) {
        // collect full number or handle unary
        if (c === '-') {
          tokens.push({ type: 'num', value: -1 });
          tokens.push({ type: 'op', name: '*' });
        }
        i++;
      } else {
        tokens.push({ type: 'op', name: c });
        i++;
      }
      continue;
    }

    if (c === '*' || c === '/' || c === '^') {
      tokens.push({ type: 'op', name: c });
      i++;
      continue;
    }

    throw new Error(`Unexpected character: ${c}`);
  }

  return tokens;
}
