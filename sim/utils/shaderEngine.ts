/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ShaderEngine — interprets the CustomShader DSL and renders to Canvas2D.
 *
 * The DSL is a simple expression-based language designed for demoscene
 * procedural effects. It's NOT a full GLSL compiler — instead it maps
 * to Canvas2D drawing operations optimized for the CRT demo viewport.
 *
 * ## DSL Syntax
 *
 * ### Variables
 *   let x = 10;
 *   let color = rgba(255, 0, 0, 1);
 *   let hue = t * 0.5;
 *
 * ### Math expressions
 *   sin(x), cos(x), sqrt(x), abs(x), pow(x, y), mod(x, y)
 *   +, -, *, / (standard precedence)
 *
 * ### Built-in variables
 *   t  — frame counter (elapsed frames since start)
 *   w  — canvas width
 *   h  — canvas height
 *   mx — mouse X (normalized 0..1)
 *   my — mouse Y (normalized 0..1)
 *
 * ### Drawing commands
 *   fillRect(x, y, w, h, color)
 *   strokeRect(x, y, w, h, color)
 *   fillCircle(x, y, r, color)
 *   strokeCircle(x, y, r, color)
 *   fillGradient(x1, y1, x2, y2, color1, color2)
 *   clear(color)
 *   setPixel(x, y, color)
 *
 * ### Control flow
 *   for (let i = 0; i < count; i++) { ... }
 *   while (condition) { ... }
 *   if (cond) { ... } else { ... }
 *
 * ### RNG
 *   random()  — returns 0..1
 *   seed(val) — reseed the RNG
 *
 * ### Color helpers
 *   rgba(r, g, b, a)  — all 0..255, a 0..1
 *   hsla(h, s, l, a)  — h 0..360, s/l 0..100, a 0..1
 *
 * ## Example: Plasma effect
 * ```
 * let speed = t * 0.05;
 * for (let y = 0; y < h; y += 4) {
 *   for (let x = 0; x < w; x += 4) {
 *     let v1 = sin(x * 0.03 + speed);
 *     let v2 = sin(y * 0.03 + speed * 0.7);
 *     let v3 = sin((x + y) * 0.02 + speed * 0.5);
 *     let v = (v1 + v2 + v3) / 3;
 *     let hue = v * 180 + 180;
 *     setPixel(x, y, hsla(hue, 80, 50, 0.6));
 *   }
 * }
 * ```
 *
 * ## Example: Ripple effect
 * ```
 * let cx = w / 2;
 * let cy = h / 2;
 * for (let y = 0; y < h; y += 2) {
 *   for (let x = 0; x < w; x += 2) {
 *     let dist = sqrt(pow(x - cx, 2) + pow(y - cy, 2));
 *     let wave = sin(dist * 0.05 - t * 0.08);
 *     let brightness = (wave + 1) * 0.5 * 255;
 *     setPixel(x, y, rgba(brightness, brightness * 0.5, brightness * 0.8, 1));
 *   }
 * }
 * ```
 */

// ---- AST Node Types ----
type ShaderValue = number | string;

interface Env {
  [key: string]: ShaderValue;
}

type Color4 = [number, number, number, number]; // r,g,b,a 0-255, a 0-1

/**
 * Compiled shader — a function that draws a frame given a Canvas2D context
 * and frame counter.
 */
export type ShaderFn = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  mouseX?: number,
  mouseY?: number,
) => void;

// ---- Simple seeded RNG (mulberry32) ----
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let tt = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    tt = (tt + Math.imul(tt ^ (tt >>> 7), 61 | tt)) ^ tt;
    return ((tt ^ (tt >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Tokenizer ----
type TokenType =
  | "ident" | "number" | "string"
  | "let" | "for" | "while" | "if" | "else"
  | "lparen" | "rparen" | "lbrace" | "rbrace" | "lbracket" | "rbracket"
  | "semicolon" | "comma" | "dot" | "equals" | "plus" | "minus" | "star" | "slash"
  | "less" | "greater" | "lesseq" | "greatereq" | "eqeq" | "noteq"
  | "ampamp" | "pipepipe" | "exclaim"
  | "plusplus" | "minusminus"
  | "eof";

interface Token {
  type: TokenType;
  value?: string | number;
  pos: number;
}

const KEYWORDS: Record<string, TokenType> = {
  let: "let",
  for: "for",
  while: "while",
  if: "if",
  else: "else",
};

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    // Whitespace
    if (/\s/.test(ch)) { i++; continue; }
    // Single-line comments
    if (ch === '/' && code[i + 1] === '/') {
      while (i < code.length && code[i] !== '\n') i++;
      continue;
    }
    // Multi-line comments
    if (ch === '/' && code[i + 1] === '*') {
      i += 2;
      while (i < code.length - 1 && !(code[i] === '*' && code[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    // Numbers
    if (/[0-9.]/.test(ch) && (i === 0 || !/[a-zA-Z_]/.test(code[i - 1]))) {
      let num = '';
      while (i < code.length && /[0-9.eE]/.test(code[i])) { num += code[i]; i++; }
      // Check for hex
      if (num === '0' && (code[i] === 'x' || code[i] === 'X')) {
        num += code[i]; i++;
        while (i < code.length && /[0-9a-fA-F]/.test(code[i])) { num += code[i]; i++; }
        tokens.push({ type: "number", value: parseInt(num, 16), pos: i - num.length });
      } else {
        tokens.push({ type: "number", value: parseFloat(num), pos: i - num.length });
      }
      continue;
    }
    // Identifiers and keywords
    if (/[a-zA-Z_$]/.test(ch)) {
      let id = '';
      while (i < code.length && /[a-zA-Z0-9_$]/.test(code[i])) { id += code[i]; i++; }
      const kw = KEYWORDS[id];
      tokens.push({ type: kw ?? "ident", value: id, pos: i - id.length });
      continue;
    }
    // Strings
    if (ch === '"' || ch === "'") {
      const quote = ch; i++;
      let str = '';
      while (i < code.length && code[i] !== quote) {
        if (code[i] === '\\') { i++; if (i < code.length) str += code[i]; }
        else str += code[i];
        i++;
      }
      if (i < code.length) i++; // skip closing quote
      tokens.push({ type: "string", value: str, pos: i - str.length - 2 });
      continue;
    }
    // Multi-char operators
    const twoChar = code.substring(i, i + 2);
    const opMap: Record<string, TokenType> = {
      "==": "eqeq", "!=": "noteq", "<=": "lesseq", ">=": "greatereq",
      "&&": "ampamp", "||": "pipepipe",
      "++": "plusplus", "--": "minusminus",
    };
    if (opMap[twoChar]) {
      tokens.push({ type: opMap[twoChar], pos: i });
      i += 2;
      continue;
    }
    // Single-char operators
    const singleMap: Record<string, TokenType> = {
      "(": "lparen", ")": "rparen", "{": "lbrace", "}": "rbrace",
      "[": "lbracket", "]": "rbracket",
      ";": "semicolon", ",": "comma", ".": "dot",
      "=": "equals", "+": "plus", "-": "minus", "*": "star", "/": "slash",
      "<": "less", ">": "greater", "!": "exclaim",
    };
    if (singleMap[ch]) {
      tokens.push({ type: singleMap[ch], pos: i });
      i++;
      continue;
    }
    // Unknown — skip
    i++;
  }
  tokens.push({ type: "eof", pos: i });
  return tokens;
}

// ---- Parser (Recursive Descent) ----
class Parser {
  tokens: Token[];
  pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  peek(): Token { return this.tokens[this.pos] ?? { type: "eof", pos: -1 }; }
  consume(): Token { return this.tokens[this.pos++] ?? { type: "eof", pos: -1 }; }
  match(...types: TokenType[]): boolean {
    if (types.includes(this.peek().type)) { this.pos++; return true; }
    return false;
  }
  expect(type: TokenType): Token {
    const t = this.consume();
    if (t.type !== type) throw new Error(`Expected ${type} at pos ${t.pos}, got ${t.type}`);
    return t;
  }

  parseAll(): Stmt[] {
    const stmts: Stmt[] = [];
    while (this.peek().type !== "eof") {
      stmts.push(this.parseStmt());
    }
    return stmts;
  }

  parseStmt(): Stmt {
    const tok = this.peek();
    if (tok.type === "let") return this.parseLet();
    if (tok.type === "for") return this.parseFor();
    if (tok.type === "while") return this.parseWhile();
    if (tok.type === "if") return this.parseIf();
    if (tok.type === "lbrace") return { type: "block", stmts: this.parseBlock() };
    return this.parseExprStmt();
  }

  parseLet(): Stmt {
    this.consume(); // let
    const id = this.expect("ident").value as string;
    this.expect("equals");
    const expr = this.parseExpr();
    this.expect("semicolon");
    return { type: "let", id, expr };
  }

  parseFor(): Stmt {
    this.consume(); // for
    this.expect("lparen");
    const init = this.parseStmt();
    const cond = this.parseExpr();
    this.expect("semicolon");
    const incr = this.parseExpr();
    this.expect("rparen");
    const body = this.parseBlock();
    return { type: "for", init, cond, incr, body };
  }

  parseWhile(): Stmt {
    this.consume(); // while
    this.expect("lparen");
    const cond = this.parseExpr();
    this.expect("rparen");
    const body = this.parseBlock();
    return { type: "while", cond, body };
  }

  parseIf(): Stmt {
    this.consume(); // if
    this.expect("lparen");
    const cond = this.parseExpr();
    this.expect("rparen");
    const then = this.parseBlock();
    let els: Stmt[] | undefined;
    if (this.peek().type === "ident" && this.peek().value === "else") {
      this.consume();
      els = this.peek().type === "lbrace" ? this.parseBlock() : [this.parseStmt()];
    }
    return { type: "if", cond, then, else: els };
  }

  parseBlock(): Stmt[] {
    const stmts: Stmt[] = [];
    if (this.peek().type !== "lbrace") {
      // Single statement
      stmts.push(this.parseStmt());
      return stmts;
    }
    this.consume(); // {
    while (this.peek().type !== "rbrace" && this.peek().type !== "eof") {
      stmts.push(this.parseStmt());
    }
    if (this.peek().type === "rbrace") this.consume();
    return stmts;
  }

  parseExprStmt(): Stmt {
    const expr = this.parseExpr();
    // Optional semicolon
    if (this.peek().type === "semicolon") this.consume();
    // Handle ++/-- postfix
    if (this.peek().type === "plusplus" || this.peek().type === "minusminus") {
      const op = this.consume().type;
      return { type: "update", id: (expr as any).name, op: op === "plusplus" ? "++" : "--" };
    }
    return { type: "expr", expr };
  }

  parseExpr(): Expr {
    return this.parseAssignment();
  }

  parseAssignment(): Expr {
    let left = this.parseLogicalOr();
    if (this.peek().type === "equals") {
      this.consume();
      const right = this.parseExpr();
      if (left.type === "var") {
        return { type: "assign", name: left.name, expr: right };
      }
      throw new Error(`Invalid assignment target`);
    }
    return left;
  }

  parseLogicalOr(): Expr {
    let left = this.parseLogicalAnd();
    while (this.peek().type === "pipepipe") {
      this.consume();
      left = { type: "binop", op: "||", left, right: this.parseLogicalAnd() };
    }
    return left;
  }

  parseLogicalAnd(): Expr {
    let left = this.parseComparison();
    while (this.peek().type === "ampamp") {
      this.consume();
      left = { type: "binop", op: "&&", left, right: this.parseComparison() };
    }
    return left;
  }

  parseComparison(): Expr {
    let left = this.parseAddSub();
    const cmpOps: Record<string, string> = {
      "<": "<", ">": ">", "<=": "<=", ">=": ">=",
      "eqeq": "==", "noteq": "!=",
    };
    const t = this.peek().type;
    if (cmpOps[t]) {
      this.consume();
      return { type: "binop", op: cmpOps[t], left, right: this.parseAddSub() };
    }
    return left;
  }

  parseAddSub(): Expr {
    let left = this.parseMulDiv();
    while (this.peek().type === "plus" || this.peek().type === "minus") {
      const op = this.consume().type === "plus" ? "+" : "-";
      left = { type: "binop", op, left, right: this.parseMulDiv() };
    }
    return left;
  }

  parseMulDiv(): Expr {
    let left = this.parseUnary();
    while (this.peek().type === "star" || this.peek().type === "slash") {
      const op = this.consume().type === "star" ? "*" : "/";
      left = { type: "binop", op, left, right: this.parseUnary() };
    }
    return left;
  }

  parseUnary(): Expr {
    if (this.peek().type === "minus") {
      this.consume();
      return { type: "unary", op: "-", expr: this.parseUnary() };
    }
    if (this.peek().type === "exclaim") {
      this.consume();
      return { type: "unary", op: "!", expr: this.parseUnary() };
    }
    // ++ or -- prefix
    if (this.peek().type === "plusplus" || this.peek().type === "minusminus") {
      const op2 = this.consume().type === "plusplus" ? "++" : "--";
      const operand = this.parsePrimary();
      if (operand.type === "var") {
        return { type: "preupdate", name: operand.name, op: op2 };
      }
      throw new Error("Invalid increment target");
    }
    return this.parsePrimary();
  }

  parsePrimary(): Expr {
    const tok = this.peek();

    // Function call or grouped expression
    if (tok.type === "lparen") {
      this.consume();
      const expr = this.parseExpr();
      this.expect("rparen");
      return expr;
    }

    if (tok.type === "number") {
      this.consume();
      return { type: "number", value: tok.value as number };
    }

    if (tok.type === "string") {
      this.consume();
      return { type: "string", value: tok.value as string };
    }

    if (tok.type === "ident") {
      this.consume();
      const name = tok.value as string;

      // Function call
      if (this.peek().type === "lparen") {
        this.consume();
        const args: Expr[] = [];
        while (this.peek().type !== "rparen" && this.peek().type !== "eof") {
          args.push(this.parseExpr());
          if (this.peek().type === "comma") this.consume();
        }
        this.expect("rparen");
        return { type: "call", name, args };
      }

      return { type: "var", name };
    }

    throw new Error(`Unexpected token at pos ${tok.pos}: ${tok.type}`);
  }
}

// ---- AST Types ----
type Stmt =
  | { type: "let"; id: string; expr: Expr }
  | { type: "for"; init: Stmt; cond: Expr; incr: Expr; body: Stmt[] }
  | { type: "while"; cond: Expr; body: Stmt[] }
  | { type: "if"; cond: Expr; then: Stmt[]; else?: Stmt[] }
  | { type: "expr"; expr: Expr }
  | { type: "update"; id: string; op: "++" | "--" }
  | { type: "block"; stmts: Stmt[] };

type Expr =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "var"; name: string }
  | { type: "assign"; name: string; expr: Expr }
  | { type: "binop"; op: string; left: Expr; right: Expr }
  | { type: "unary"; op: string; expr: Expr }
  | { type: "call"; name: string; args: Expr[] }
  | { type: "preupdate"; name: string; op: "++" | "--" };

// ---- Interpreter ----
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { [r, g, b] = [c, x, 0]; }
  else if (h < 120) { [r, g, b] = [x, c, 0]; }
  else if (h < 180) { [r, g, b] = [0, c, x]; }
  else if (h < 240) { [r, g, b] = [0, x, c]; }
  else if (h < 300) { [r, g, b] = [x, 0, c]; }
  else { [r, g, b] = [c, 0, x]; }
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function parseColorStr(str: string): Color4 {
  if (str.startsWith("#")) {
    const hex = str.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return [r, g, b, 1];
    }
    if (hex.length === 6) {
      return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 1];
    }
  }
  return [255, 255, 255, 1];
}

function colorToStyle(color: Color4): string {
  return `rgba(${Math.round(color[0])},${Math.round(color[1])},${Math.round(color[2])},${color[3]})`;
}

/**
 * Compile shader source code into an executable ShaderFn.
 * Returns the function OR an error message string.
 */
export function compileShader(code: string): ShaderFn | string {
  try {
    const tokens = tokenize(code);
    const parser = new Parser(tokens);
    const stmts = parser.parseAll();

    // Generate the render function
    const renderFn: ShaderFn = (ctx, width, height, frame, mouseX = 0.5, mouseY = 0.5) => {
      const env: Env = { t: frame, w: width, h: height, mx: mouseX, my: mouseY };
      let rng = mulberry32(42);

      const evalExpr = (e: Expr): ShaderValue => {
        switch (e.type) {
          case "number": return e.value;
          case "string": return e.value;
          case "var": {
            if (e.name in env) return env[e.name];
            throw new Error(`Undefined variable: ${e.name}`);
          }
          case "assign": {
            const val = evalExpr(e.expr);
            env[e.name] = val;
            return val;
          }
          case "binop": {
            const l = evalExpr(e.left);
            const r2 = evalExpr(e.right);
            const ln = typeof l === "number" ? l : 0;
            const rn = typeof r2 === "number" ? r2 : 0;
            switch (e.op) {
              case "+": return ln + rn;
              case "-": return ln - rn;
              case "*": return ln * rn;
              case "/": return rn !== 0 ? ln / rn : 0;
              case "<": return ln < rn ? 1 : 0;
              case ">": return ln > rn ? 1 : 0;
              case "<=": return ln <= rn ? 1 : 0;
              case ">=": return ln >= rn ? 1 : 0;
              case "==": return ln === rn ? 1 : 0;
              case "!=": return ln !== rn ? 1 : 0;
              case "&&": return (ln !== 0) && (rn !== 0) ? 1 : 0;
              case "||": return (ln !== 0) || (rn !== 0) ? 1 : 0;
              default: return 0;
            }
          }
          case "unary": {
            const v = evalExpr(e.expr);
            const n = typeof v === "number" ? v : 0;
            if (e.op === "-") return -n;
            if (e.op === "!") return n === 0 ? 1 : 0;
            return n;
          }
          case "preupdate": {
            const curr = typeof env[e.name] === "number" ? (env[e.name] as number) : 0;
            env[e.name] = e.op === "++" ? curr + 1 : curr - 1;
            return e.op === "++" ? curr + 1 : curr - 1;
          }
          case "call": {
            const args = e.args.map(a => {
              const v = evalExpr(a);
              return typeof v === "number" ? v : 0;
            });
            switch (e.name) {
              case "sin": return Math.sin(args[0] ?? 0);
              case "cos": return Math.cos(args[0] ?? 0);
              case "sqrt": return Math.sqrt(Math.abs(args[0] ?? 0));
              case "abs": return Math.abs(args[0] ?? 0);
              case "pow": return Math.pow(args[0] ?? 0, args[1] ?? 0);
              case "mod": return (args[0] ?? 0) % (args[1] ?? 1);
              case "atan2": return Math.atan2(args[0] ?? 0, args[1] ?? 0);
              case "min": return Math.min(args[0] ?? 0, args[1] ?? 0);
              case "max": return Math.max(args[0] ?? 0, args[1] ?? 0);
              case "floor": return Math.floor(args[0] ?? 0);
              case "ceil": return Math.ceil(args[0] ?? 0);
              case "random": return rng();
              case "seed": rng = mulberry32(args[0] ?? 42); return 0;
              case "rgba":
                return `rgba(${Math.round(args[0])},${Math.round(args[1])},${Math.round(args[2])},${args[3] ?? 1})`;
              case "hsla": {
                const [rr, gg, bb] = hslToRgb(args[0] ?? 0, args[1] ?? 50, args[2] ?? 50);
                return `rgba(${Math.round(rr)},${Math.round(gg)},${Math.round(bb)},${args[3] ?? 1})`;
              }
              // Drawing commands
              case "clear": {
                const color = typeof args[0] === "string" ? args[0] as unknown as string : "rgba(0,0,0,1)";
                ctx.fillStyle = color;
                ctx.fillRect(0, 0, width, height);
                return 0;
              }
              case "fillRect": {
                const color = args.length >= 5 ? args[4] as unknown as string : "rgba(255,255,255,1)";
                ctx.fillStyle = color;
                ctx.fillRect(args[0] ?? 0, args[1] ?? 0, args[2] ?? 10, args[3] ?? 10);
                return 0;
              }
              case "strokeRect": {
                const color = args.length >= 5 ? args[4] as unknown as string : "rgba(255,255,255,1)";
                ctx.strokeStyle = color;
                ctx.strokeRect(args[0] ?? 0, args[1] ?? 0, args[2] ?? 10, args[3] ?? 10);
                return 0;
              }
              case "fillCircle": {
                const color = args.length >= 4 ? args[3] as unknown as string : "rgba(255,255,255,1)";
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(args[0] ?? 0, args[1] ?? 0, args[2] ?? 10, 0, Math.PI * 2);
                ctx.fill();
                return 0;
              }
              case "strokeCircle": {
                const color = args.length >= 4 ? args[3] as unknown as string : "rgba(255,255,255,1)";
                ctx.strokeStyle = color;
                ctx.beginPath();
                ctx.arc(args[0] ?? 0, args[1] ?? 0, args[2] ?? 10, 0, Math.PI * 2);
                ctx.stroke();
                return 0;
              }
              case "fillGradient": {
                if (args.length < 6) return 0;
                const grad = ctx.createLinearGradient(args[0], args[1], args[2], args[3]);
                const c1 = args[4] as unknown as string;
                const c2 = args[5] as unknown as string;
                grad.addColorStop(0, c1);
                grad.addColorStop(1, c2);
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
                return 0;
              }
              case "setPixel": {
                const color = args.length >= 3 ? args[2] as unknown as string : "rgba(255,255,255,1)";
                ctx.fillStyle = color;
                ctx.fillRect(Math.round(args[0] ?? 0), Math.round(args[1] ?? 0), 1, 1);
                return 0;
              }
              default:
                throw new Error(`Unknown function: ${e.name}`);
            }
          }
        }
        return 0;
      };

      const execStmt = (s: Stmt): void => {
        switch (s.type) {
          case "let": {
            const val = evalExpr(s.expr);
            env[s.id] = val;
            break;
          }
          case "for": {
            execStmt(s.init);
            while (true) {
              const cond = evalExpr(s.cond);
              if (typeof cond === "number" && cond === 0) break;
              // Execute body
              for (const st of s.body) execStmt(st);
              // Execute increment
              if (s.incr) evalExpr(s.incr);
              // Safety limit: max 10000 iterations per execution
              const limitCheck = (env.$loopCount as number) ?? 0;
              if (limitCheck > 10000) break;
              env.$loopCount = ((env.$loopCount as number) ?? 0) + 1;
            }
            delete env.$loopCount;
            break;
          }
          case "while": {
            let limit = 0;
            while (true) {
              const cond = evalExpr(s.cond);
              if (typeof cond === "number" && cond === 0) break;
              for (const st of s.body) execStmt(st);
              limit++;
              if (limit > 10000) break;
            }
            break;
          }
          case "if": {
            const cond = evalExpr(s.cond);
            if (typeof cond === "number" && cond !== 0) {
              for (const st of s.then) execStmt(st);
            } else if (s.else) {
              for (const st of s.else) execStmt(st);
            }
            break;
          }
          case "expr": {
            evalExpr(s.expr);
            break;
          }
          case "update": {
            const curr = typeof env[s.id] === "number" ? (env[s.id] as number) : 0;
            env[s.id] = s.op === "++" ? curr + 1 : curr - 1;
            break;
          }
          case "block":
            for (const st of s.stmts) execStmt(st);
            break;
        }
      };

      // Execute all statements per frame
      for (const stmt of stmts) {
        execStmt(stmt);
      }
    };

    return renderFn;
  } catch (err) {
    return err instanceof Error ? err.message : `Compilation error: ${String(err)}`;
  }
}

/**
 * Estimate complexity of shader code for scoring purposes.
 * Returns a value 1-100 based on code structure.
 */
export function estimateShaderComplexity(code: string): number {
  const lines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('//')).length;
  const hasLoops = /for\s*\(|while\s*\(/.test(code);
  const hasNestedLoops = /for\s*\([^)]*\)\s*\{[^{}]*for\s*\(/.test(code);
  const hasMath = /sin|cos|sqrt|pow/.test(code);
  const hasColor = /rgba|hsla/.test(code);
  const hasRandom = /random/.test(code);

  let complexity = 10; // base
  complexity += Math.min(lines * 2, 20);
  if (hasLoops) complexity += 15;
  if (hasNestedLoops) complexity += 15;
  if (hasMath) complexity += 10;
  if (hasColor) complexity += 10;
  if (hasRandom) complexity += 5;
  complexity += Math.min(Math.floor(code.length / 50), 15);

  return Math.min(complexity, 100);
}

/**
 * Estimate visual impact of shader code for scoring purposes.
 */
export function estimateShaderVisualImpact(code: string): number {
  const hasColor = /rgba|hsla/.test(code);
  const hasCircle = /fillCircle|strokeCircle/.test(code);
  const hasGradient = /fillGradient/.test(code);
  const hasPixel = /setPixel/.test(code);
  const has3D = /sqrt.*pow|pow.*sqrt/.test(code); // 3D-style distance calculations
  const hasMath = /sin|cos/.test(code);

  let impact = 15;
  if (hasMath) impact += 15;
  if (hasColor) impact += 15;
  if (hasCircle) impact += 10;
  if (hasGradient) impact += 15;
  if (hasPixel) impact += 20; // per-pixel effects are very impressive
  if (has3D) impact += 15;

  return Math.min(impact, 100);
}

/**
 * Default starter shader — a colorful plasma effect.
 */
export const DEFAULT_SHADER_CODE = `// Plasma Wave — classic demoscene procedural effect
let speed = t * 0.03;
for (let y = 0; y < h; y += 4) {
  for (let x = 0; x < w; x += 4) {
    let v1 = sin(x * 0.03 + speed);
    let v2 = sin(y * 0.035 + speed * 0.7);
    let v3 = sin((x + y) * 0.015 + speed * 0.4);
    let v = (v1 + v2 + v3) / 3;
    let hue = v * 150 + 200;
    setPixel(x, y, hsla(hue, 85, 55, 0.7));
  }
}
`;

/**
 * Second example — rotating tunnel.
 */
export const TUNNEL_SHADER_CODE = `// Psychedelic Tunnel
let cx = w / 2;
let cy = h / 2;
for (let y = 0; y < h; y += 2) {
  for (let x = 0; x < w; x += 2) {
    let dx = x - cx;
    let dy = y - cy;
    let dist = sqrt(dx * dx + dy * dy);
    let angle = atan2(dy, dx);
    let warp = sin(dist * 0.03 - t * 0.05) * 0.5 + 0.5;
    let spin = angle * 3 + t * 0.02;
    let hue = (dist * 0.3 + spin * 40 + t * 0.5) % 360;
    let bright = (sin(dist * 0.04 - t * 0.06) + 1) * 0.45;
    setPixel(x, y, hsla(hue, 80, 45 + bright * 30, 0.8));
  }
}
`;
