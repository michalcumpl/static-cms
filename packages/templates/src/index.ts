// @webmio/templates: the website systems we own (template-system): each template's design
// tokens, styles, default looks and layouts, the registry, making a page from a layout, and
// upgrading sites to a template's current release. Pure TypeScript, no filesystem; it depends
// only on @webmio/model, and @webmio/render builds on it.
export { isTokenValue, templateProblems } from "./checks.js";
export { SHARED_LAYOUTS } from "./layouts.js";
export {
  type LayoutNode,
  type PageFromLayoutOptions,
  pageFromLayout,
} from "./page-from-layout.js";
export { TEMPLATE_RELEASES, TEMPLATES, templateById } from "./registry.js";
export { STANDARD } from "./standard.js";
export {
  type Layout,
  type LayoutBlock,
  type Localized,
  type SiteDocumentJson,
  type Template,
  type TemplateLooks,
  type TemplateTokens,
  TOKEN_NAMES,
  type TokenName,
  type UpgradeStep,
} from "./types.js";
export { upgradeSite } from "./upgrade.js";
