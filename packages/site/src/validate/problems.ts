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
  | "duplicate-reference"
  | "missing-title"
  | "home-slug"
  | "invalid-slug"
  | "duplicate-slug"
  | "missing-page"
  | "hero-not-first"
  | "too-many-items"
  | "empty-heading"
  | "heading-skip"
  | "missing-alt"
  | "decorative-with-alt"
  | "invalid-media-key"
  | "empty-link-label"
  | "unsafe-link"
  | "invalid-color"
  | "invalid-theme-value"
  | "low-contrast"
  // Render and export options
  | "invalid-base-path"
  | "missing-media"
  | "no-base-url";

export interface Problem {
  severity: Severity;
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

function problem(
  severity: Severity,
  code: ProblemCode,
  nodeId: string,
  message: string,
  property: string | undefined,
): Problem {
  return property === undefined
    ? { severity, code, message, nodeId }
    : { severity, code, message, nodeId, property };
}
