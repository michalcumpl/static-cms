export type Severity = "error" | "warning";

export type ProblemCode =
  // Structure (generic, schema-driven)
  | "invalid-document"
  | "invalid-id"
  | "id-mismatch"
  | "unknown-type"
  | "invalid-value"
  | "missing-reference"
  | "disallowed-type"
  | "invalid-range"
  | "overlapping-marks"
  | "cycle"
  | "unreachable-node"
  // Site rules (domain)
  | "root-not-site"
  | "unsupported-version"
  | "missing-site-name"
  | "missing-language"
  | "invalid-language"
  | "invalid-base-url"
  | "no-pages"
  | "missing-home"
  | "duplicate-reference"
  | "missing-title"
  | "invalid-slug"
  | "duplicate-slug"
  | "missing-page"
  | "duplicate-menu-item"
  | "hero-not-first"
  | "too-many-items"
  | "empty-heading"
  | "heading-skip"
  | "missing-alt"
  | "decorative-with-alt"
  | "invalid-media-key"
  | "missing-image-size"
  | "missing-image"
  | "empty-name"
  | "empty-block"
  | "empty-link-label"
  | "unsafe-link"
  | "invalid-color"
  | "invalid-theme-value"
  | "low-contrast"
  // Render and export options
  | "invalid-base-path"
  | "invalid-site-url"
  | "invalid-redirect"
  | "missing-media"
  | "no-base-url"
  | "no-description"
  | "small-share-image"
  | "small-favicon"
  | "invalid-phone"
  | "invalid-email"
  | "invalid-map-url"
  | "invalid-country"
  | "invalid-hours"
  | "nothing-to-show";

/** `structure`: the document's shape is broken. `site`: the content breaks a site rule. */
export type ProblemCategory = "structure" | "site";

const CATEGORIES: Record<ProblemCode, ProblemCategory> = {
  "invalid-document": "structure",
  "invalid-id": "structure",
  "id-mismatch": "structure",
  "unknown-type": "structure",
  "invalid-value": "structure",
  "missing-reference": "structure",
  "disallowed-type": "structure",
  "invalid-range": "structure",
  "overlapping-marks": "structure",
  cycle: "structure",
  "unreachable-node": "structure",
  "root-not-site": "site",
  "unsupported-version": "site",
  "missing-site-name": "site",
  "missing-language": "site",
  "invalid-language": "site",
  "invalid-base-url": "site",
  "no-pages": "site",
  "missing-home": "site",
  "duplicate-reference": "site",
  "missing-title": "site",
  "invalid-slug": "site",
  "duplicate-slug": "site",
  "missing-page": "site",
  "duplicate-menu-item": "site",
  "hero-not-first": "site",
  "too-many-items": "site",
  "empty-heading": "site",
  "heading-skip": "site",
  "missing-alt": "site",
  "decorative-with-alt": "site",
  "invalid-media-key": "site",
  "missing-image-size": "site",
  "missing-image": "site",
  "empty-name": "site",
  "empty-block": "site",
  "empty-link-label": "site",
  "unsafe-link": "site",
  "invalid-color": "site",
  "invalid-theme-value": "site",
  "low-contrast": "site",
  "invalid-base-path": "site",
  "invalid-site-url": "site",
  "invalid-redirect": "site",
  "missing-media": "site",
  "no-base-url": "site",
  "no-description": "site",
  "small-share-image": "site",
  "small-favicon": "site",
  "invalid-phone": "site",
  "invalid-email": "site",
  "invalid-map-url": "site",
  "invalid-country": "site",
  "invalid-hours": "site",
  "nothing-to-show": "site",
};

export function problemCategory(code: ProblemCode): ProblemCategory {
  return CATEGORIES[code];
}

export interface Problem {
  severity: Severity;
  category: ProblemCategory;
  code: ProblemCode;
  message: string;
  /** The node the problem concerns (the document ID for document-level problems). */
  nodeId: string;
  property?: string;
}

export interface ValidationResult {
  /** False when there is at least one error. Warnings alone keep a document valid. */
  valid: boolean;
  problems: Problem[];
}

export class Problems {
  readonly list: Problem[] = [];

  error(code: ProblemCode, nodeId: string, message: string, property?: string): void {
    this.list.push(problem("error", code, nodeId, message, property));
  }

  warning(code: ProblemCode, nodeId: string, message: string, property?: string): void {
    this.list.push(problem("warning", code, nodeId, message, property));
  }

  result(): ValidationResult {
    return { valid: !this.list.some((p) => p.severity === "error"), problems: this.list };
  }
}

/** Builds a problem; the category always follows from the code. */
export function problem(
  severity: Severity,
  code: ProblemCode,
  nodeId: string,
  message: string,
  property?: string,
): Problem {
  const base = { severity, category: problemCategory(code), code, message, nodeId };
  return property === undefined ? base : { ...base, property };
}
