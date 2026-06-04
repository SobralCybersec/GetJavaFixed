import { describe, expect, it } from "vitest";
import { resolveTerminalInjectionTarget } from "./injection";

describe("resolveTerminalInjectionTarget", () => {
  it("uses the active non-private terminal when one is focused", () => {
    expect(
      resolveTerminalInjectionTarget(
        [
          { id: 1, kind: "terminal", activeLeafId: 11 },
          { id: 2, kind: "terminal", activeLeafId: 22, private: true },
        ],
        1,
        "C:/repo",
      ),
    ).toEqual({ kind: "existing", tabId: 1, leafId: 11 });
  });

  it("reuses the most recent non-private terminal when the active tab is not usable", () => {
    expect(
      resolveTerminalInjectionTarget(
        [
          { id: 1, kind: "terminal", activeLeafId: 11 },
          { id: 2, kind: "terminal", activeLeafId: 22, private: true },
          { id: 3, kind: "terminal", activeLeafId: 33 },
        ],
        2,
        "C:/repo",
      ),
    ).toEqual({ kind: "existing", tabId: 3, leafId: 33 });
  });

  it("opens a new terminal when only private terminals exist", () => {
    expect(
      resolveTerminalInjectionTarget(
        [{ id: 2, kind: "terminal", activeLeafId: 22, private: true }],
        2,
        "C:/repo",
      ),
    ).toEqual({ kind: "new", cwd: "C:/repo" });
  });
});
