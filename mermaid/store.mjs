import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const MAX_TABS = 10;
export const MAX_SOURCE = 100_000;
export const EXAMPLE = `flowchart LR
    idea([An idea]) --> draft[Put it into words]
    draft --> diagram[See the diagram]
    diagram --> share{Ready to share?}
    share -- A little more work --> draft
    share -- Yes --> together([Think together])
`;

export class WorkspaceError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const fail = (status, message) => {
  throw new WorkspaceError(status, message);
};

const validName = (name) =>
  typeof name === "string" && name.trim().length > 0 && name.trim().length <= 60;

const validSource = (source) => typeof source === "string" && source.length <= MAX_SOURCE;

export const createStore = async (directory) => {
  await mkdir(directory, { recursive: true });
  const file = join(directory, "workspace.json");
  let state;
  try {
    state = JSON.parse(await readFile(file, "utf8"));
    if (
      typeof state.id !== "string" ||
      !Number.isSafeInteger(state.version) ||
      state.version < 0 ||
      !Array.isArray(state.tabs) ||
      state.tabs.length < 1 ||
      state.tabs.length > MAX_TABS ||
      new Set(state.tabs.map((tab) => tab.id)).size !== state.tabs.length ||
      !state.tabs.every(
        (tab) =>
          typeof tab.id === "string" &&
          /^[a-f0-9-]{36}$/.test(tab.id) &&
          validName(tab.name) &&
          validSource(tab.source) &&
          Number.isSafeInteger(tab.revision) &&
          tab.revision >= 0,
      )
    ) {
      throw new Error("Invalid workspace data; refusing to overwrite it.");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    state = {
      id: randomUUID(),
      version: 0,
      tabs: [
        {
          id: randomUUID(),
          name: "First diagram",
          source: EXAMPLE,
          revision: 0,
        },
      ],
    };
    await writeFile(file, JSON.stringify(state));
  }
  let queue = Promise.resolve();

  const snapshot = () => structuredClone(state);

  return {
    snapshot,
    mutate: (action, id, input = {}) => {
      const commit = async () => {
        const next = snapshot();
        if (action === "create") {
          if (next.tabs.length >= MAX_TABS) fail(409, "The workspace already has 10 tabs.");
          const number = Array.from({ length: MAX_TABS }, (_, i) => i + 1).find(
            (n) => !next.tabs.some((tab) => tab.name === `Diagram ${n}`),
          );
          next.tabs.push({
            id: randomUUID(),
            name: `Diagram ${number}`,
            source: "flowchart LR\n    A[Start here] --> B[What happens next?]\n",
            revision: 0,
          });
        } else {
          const tab = next.tabs.find((tab) => tab.id === id);
          if (!tab) fail(404, "This tab was deleted. Copy your source before continuing.");
          if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0)
            fail(400, "A tab revision is required.");
          if (tab.revision !== input.expectedRevision)
            fail(409, "Someone else updated this tab. Choose which version to keep.");
          if (action === "delete") {
            if (next.tabs.length === 1) fail(409, "Keep at least one tab in the workspace.");
            next.tabs = next.tabs.filter((item) => item.id !== id);
          } else if (action === "update") {
            if (!Object.hasOwn(input, "name") && !Object.hasOwn(input, "source"))
              fail(400, "Provide a name or Mermaid source.");
            if (Object.hasOwn(input, "name")) {
              if (!validName(input.name)) fail(400, "Use a tab name between 1 and 60 characters.");
              tab.name = input.name.trim();
            }
            if (Object.hasOwn(input, "source")) {
              if (!validSource(input.source))
                fail(400, "Mermaid source must be at most 100,000 characters.");
              tab.source = input.source;
            }
            tab.revision += 1;
          } else fail(400, "Unknown action.");
        }
        next.version += 1;

        await writeFile(`${file}.tmp`, JSON.stringify(next));
        await rename(`${file}.tmp`, file);
        state = next;
        return snapshot();
      };

      const operation = queue.then(commit, commit);
      queue = operation;
      return operation;
    },
  };
};
