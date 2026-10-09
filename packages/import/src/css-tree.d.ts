// css-tree's self-contained ESM bundle has the same API as its main entry, which @types/css-tree
// describes; css.ts gives it those types.
declare module "css-tree/dist/csstree.esm" {
  const csstree: unknown;
  export = csstree;
}
