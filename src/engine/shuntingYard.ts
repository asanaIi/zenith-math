import type { Token } from './tokenizer';

export type RPNToken =
  | { type: 'num'; value: number }
  | { type: 'var'; name: string }
  | { type: 'func'; name: string }
  | { type: 'op'; name: string; arity: 1 | 2 };

const PRECEDENCE: Record<string, number> = {
  '^': 4,
  '*': 3,
  '/': 3,
  '+': 2,
  '-': 2,
};

const RIGHT_ASSOC = new Set(['^']);

export function shuntingYard(tokens: Token[]): RPNToken[] {
  const output: RPNToken[] = [];
  const stack: (Token | { type: 'op'; name: string; arity: 1 | 2 })[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    if (tok.type === 'num') {
      output.push({ type: 'num', value: tok.value });
    } else if (tok.type === 'var') {
      output.push({ type: 'var', name: tok.name });
    } else if (tok.type === 'func') {
      stack.push(tok);
    } else if (tok.type === 'comma') {
      while (stack.length && stack[stack.length - 1].type !== 'lparen') {
        popToOutput(stack, output);
      }
    } else if (tok.type === 'op') {
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.type === 'op') {
          const topPrec = PRECEDENCE[top.name];
          const curPrec = PRECEDENCE[tok.name];
          if (topPrec > curPrec || (topPrec === curPrec && !RIGHT_ASSOC.has(tok.name))) {
            popToOutput(stack, output);
            continue;
          }
        }
        break;
      }
      stack.push({ type: 'op', name: tok.name, arity: 2 });
    } else if (tok.type === 'lparen') {
      stack.push(tok);
    } else if (tok.type === 'rparen') {
      while (stack.length && stack[stack.length - 1].type !== 'lparen') {
        popToOutput(stack, output);
      }
      if (!stack.length) throw new Error('Mismatched parentheses');
      stack.pop(); // remove lparen
      if (stack.length && stack[stack.length - 1].type === 'func') {
        const fn = stack.pop() as { type: 'func'; name: string };
        output.push({ type: 'func', name: fn.name });
      }
    }
  }

  while (stack.length) {
    const top = stack.pop()!;
    if (top.type === 'lparen' || top.type === 'rparen') {
      throw new Error('Mismatched parentheses');
    }
    popToOutput([top], output);
  }

  return output;
}

function popToOutput(stack: (Token | { type: 'op'; name: string; arity: 1 | 2 })[], output: RPNToken[]) {
  const tok = stack.pop()!;
  if (tok.type === 'op') {
    output.push({ type: 'op', name: tok.name, arity: 2 });
  } else if (tok.type === 'func') {
    output.push({ type: 'func', name: tok.name });
  }
}
