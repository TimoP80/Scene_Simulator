/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * sim/utils barrel — pure utility functions, no React/DOM.
 */

export {
  compileShader,
  estimateShaderComplexity,
  estimateShaderVisualImpact,
  DEFAULT_SHADER_CODE,
  TUNNEL_SHADER_CODE,
} from "./shaderEngine";
export type { ShaderFn } from "./shaderEngine";
