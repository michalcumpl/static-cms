// @webmio/import: reading a public website into a Webmio site (site-import). Pure TypeScript: the
// caller fetches the pages, stylesheets and images, and this package turns them into a site
// document, the images it needs, each page's old address and a report of what was left out.
export { oldPath, pageKey, sameSite, siteHost, withoutFragment } from "./addresses.js";
export { type ImageReference, type ImageRole, MAX_WIDTH } from "./images.js";
export {
  type MenuEntry,
  type MenuLink,
  menuLinks,
  type Navigation,
  pageStyles,
  sitemapLinks,
} from "./links.js";
export type {
  ImportedPageSummary,
  ImportReport,
  LeftOut,
  LeftOutReason,
} from "./report.js";
export { type RobotsRules, robotsRules } from "./robots.js";
export { looksBuiltByScript } from "./script.js";
export {
  type ImportedSite,
  pageLanguage,
  type ReadSiteOptions,
  readSite,
  type SourcePage,
  siteLanguage,
} from "./site.js";
