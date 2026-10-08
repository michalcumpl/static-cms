// @webmio/model: the site document (schema and types), its validation and format upgrades, the
// collections, languages and page translation, and the catalogues (fonts, themes, image
// variants) both rendering and export rely on. Pure TypeScript, no filesystem.
export {
  type BlockInput,
  blocks,
  type HoursInput,
  type ImageInput,
  type LinkInput,
  type LocationInput,
  type PageInput,
  type ProjectInput,
  type ServiceInput,
  type SiteBuilder,
  siteBuilder,
  type ThemeInput,
} from "./builder.js";
export {
  blockItems,
  COLLECTION_BLOCK_TYPES,
  COLLECTION_NAMES,
  COLLECTIONS,
  type CollectionBlockNode,
  type CollectionBlockType,
  type CollectionItemNode,
  type CollectionItemType,
  type CollectionName,
  isCollectionBlockType,
  projectsShown,
  type SocialKind,
  socialKind,
} from "./collections.js";
// For the sibling packages (@webmio/render, @webmio/export), not for applications.
export {
  FONT_IDS,
  FONTS,
  type FontDef,
  type FontFile,
  type FontId,
  type FontKind,
  fontFile,
  fontLicenceFile,
  fontPackagePath,
  fontStack,
  isFontId,
  themeFontFiles,
  themeWebfonts,
  UNICODE_RANGES,
  usedFontFiles,
} from "./fonts.js";
export {
  ICON_SIZES,
  type IconSize,
  iconFile,
  imageFile,
  imageVariants,
  isDerivedImageProperty,
  shareFile,
  srcVariant,
  usedMediaFiles,
  WIDTH_LADDER,
} from "./images.js";
export { applySharedFields } from "./languages.js";
export { isSafeHref } from "./links.js";
export { migrateSite } from "./migrate.js";
export * from "./schema/index.js";
export { slugify, uniqueSlug } from "./slug.js";
export { graphemeLength, graphemes } from "./text.js";
export {
  CONTRAST_PAIRS,
  contrastRatio,
  MIN_CONTRAST,
  PRESET_PROPERTIES,
  THEME_PRESETS,
  type ThemeColor,
  type ThemePreset,
} from "./themes.js";
export {
  type CopyResult,
  copyPageInto,
  type TranslationPage,
  type TranslationStatus,
  translationStatus,
  translationSummary,
} from "./translations.js";
export { isValidBaseUrl } from "./validate/domain.js";
export {
  type Problem,
  type ProblemCategory,
  type ProblemCode,
  problem,
  problemCategory,
  type Severity,
  type ValidationResult,
  validateSite,
} from "./validate/index.js";
export { slideClip, type VideoEmbed, videoEmbed } from "./video.js";
