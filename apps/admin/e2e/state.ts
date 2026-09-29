// What the global setup created, shared with the tests through a file in the data folder.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface E2eState {
  owner: { id: string; email: string };
  outsider: { id: string; email: string };
  workspaceId: string;
  projectId: string;
}

const file = () => join(process.env.E2E_DATA_DIR ?? "", "e2e.json");

export function writeState(state: E2eState): void {
  writeFileSync(file(), JSON.stringify(state, null, 2));
}

export function readState(): E2eState {
  return JSON.parse(readFileSync(file(), "utf8")) as E2eState;
}
