/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CustomShader — user-defined procedural shader/effect written in a
 * simple expression-based DSL. Users write code in the ShaderEditor
 * and the result is rendered via Canvas2D in the demo CRT viewport.
 *
 * The DSL supports:
 *   - Variable declarations (let x = expr)
 *   - Math: +, -, *, /, sin(), cos(), sqrt(), abs(), pow(), mod()
 *   - Time: `t` = elapsed frames, `s` = sin(t * speed), `c` = cos(t)
 *   - Colors: rgba(r,g,b,a), hsla(h,s,l,a), #hex
 *   - Drawing: fillRect, strokeRect, fillCircle, strokeCircle, fillGradient
 *   - Pixel ops: pixel(x, y) to read, setPixel(x, y, color) to write
 *   - Loops: for, while with limits
 *   - RNG: random(), seed(val)
 */
export interface CustomShader {
  /** Unique identifier. */
  id: string;
  /** Display name shown in the effect grid. */
  name: string;
  /** Short description of what this shader does. */
  description: string;
  /** The shader source code. */
  code: string;
  /** Timestamp when this shader was created/modified. */
  updatedAt: number;
  /** Rough complexity estimate (lines of code, operations) for scoring. */
  complexity: number;
  /** Visual impact estimate (1-100) derived from color/pattern complexity. */
  visualImpact: number;
}
