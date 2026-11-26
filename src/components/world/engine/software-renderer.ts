/** Renderer strings of CPU rasterizers (no GPU, a blocklisted GPU, or CI runners). */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render driver|microsoft basic render/i;

export function isSoftwareRendererName(name: string) {
  return SOFTWARE_RENDERER.test(name);
}

/** True when the context is drawn by a CPU rasterizer, where full quality runs at about 1–3 fps. */
export function isSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const name = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  return typeof name === "string" && isSoftwareRendererName(name);
}
