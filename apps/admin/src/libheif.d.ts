// libheif-js's browser bundle: a factory that resolves to the Emscripten module.
declare module "libheif-js/libheif-wasm/libheif-bundle.mjs" {
  const factory: (options?: Record<string, unknown>) => Promise<unknown>;
  export default factory;
}
