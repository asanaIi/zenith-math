import { tokenize } from './tokenizer';
import { shuntingYard, type RPNToken } from './shuntingYard';

export type CompiledFunction = (x: number) => number;

const FUNCS: Record<string, (args: number[]) => number> = {
  sin: (a) => Math.sin(a[0]),
  cos: (a) => Math.cos(a[0]),
  tan: (a) => Math.tan(a[0]),
  asin: (a) => Math.asin(a[0]),
  acos: (a) => Math.acos(a[0]),
  atan: (a) => Math.atan(a[0]),
  sinh: (a) => Math.sinh(a[0]),
  cosh: (a) => Math.cosh(a[0]),
  tanh: (a) => Math.tanh(a[0]),
  log: (a) => Math.log10(a[0]),
  ln: (a) => Math.log(a[0]),
  log2: (a) => Math.log2(a[0]),
  sqrt: (a) => Math.sqrt(a[0]),
  cbrt: (a) => Math.cbrt(a[0]),
  abs: (a) => Math.abs(a[0]),
  exp: (a) => Math.exp(a[0]),
  floor: (a) => Math.floor(a[0]),
  ceil: (a) => Math.ceil(a[0]),
  round: (a) => Math.round(a[0]),
  sign: (a) => Math.sign(a[0]),
  min: (a) => Math.min(...a),
  max: (a) => Math.max(...a),
  mod: (a) => a[0] % a[1],
  pow: (a) => Math.pow(a[0], a[1]),
};

const FUNC_ARG_COUNT: Record<string, number> = {
  min: 2, max: 2, mod: 2, pow: 2,
};

export function compile(expr: string): CompiledFunction {
  const tokens = tokenize(expr);
  const rpn = shuntingYard(tokens);

  return (xVal: number): number => {
    const stack: number[] = [];

    for (const tok of rpn) {
      if (tok.type === 'num') {
        stack.push(tok.value);
      } else if (tok.type === 'var') {
        stack.push(xVal);
      } else if (tok.type === 'op') {
        const b = stack.pop()!;
        const a = stack.pop()!;
        switch (tok.name) {
          case '+': stack.push(a + b); break;
          case '-': stack.push(a - b); break;
          case '*': stack.push(a * b); break;
          case '/': stack.push(a / b); break;
          case '^': stack.push(Math.pow(a, b)); break;
        }
      } else if (tok.type === 'func') {
        const argCount = FUNC_ARG_COUNT[tok.name] ?? 1;
        const args: number[] = [];
        for (let k = 0; k < argCount; k++) args.unshift(stack.pop()!);
        const fn = FUNCS[tok.name];
        if (!fn) throw new Error(`Unknown function: ${tok.name}`);
        stack.push(fn(args));
      }
    }

    return stack.length === 1 ? stack[0] : NaN;
  };
}

export function tryCompile(expr: string): { fn: CompiledFunction | null; error: string | null } {
  try {
    const fn = compile(expr);
    fn(0); // test eval
    return { fn, error: null };
  } catch (e) {
    return { fn: null, error: e instanceof Error ? e.message : 'Invalid expression' };
  }
}
