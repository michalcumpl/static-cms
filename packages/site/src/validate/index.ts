import { checkSiteRules } from "./domain.js";
import { checkStructure } from "./generic.js";
import { Problems, type ValidationResult } from "./problems.js";

export type {
  Problem,
  ProblemCategory,
  ProblemCode,
  Severity,
  ValidationResult,
} from "./problems.js";
export { problem, problemCategory } from "./problems.js";

/**
 * Checks a site document (any JSON value) against the schema and the site rules.
 * Reports every problem found; the document is valid when none of them is an error.
 */
export function validateSite(input: unknown): ValidationResult {
  const problems = new Problems();
  const check = checkStructure(input, problems);
  if (check) {
    checkSiteRules((input as { document_id: string }).document_id, check, problems);
  }
  return problems.result();
}
