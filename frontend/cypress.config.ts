import { defineConfig } from "cypress";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { registerFunctionalTasks } from "./cypress/node/fixtures";

const runId = (process.env.E2E_RUN_ID || new Date().toISOString()).replace(/[^a-zA-Z0-9_-]/g, "-");
const resultDirectory = `cypress/results/${runId}`;

export default defineConfig({
  experimentalInteractiveRunEvents: true,
  viewportWidth: 1440,
  viewportHeight: 1000,
  defaultCommandTimeout: 15000,
  video: true,
  screenshotsFolder: `cypress/screenshots/${runId}`,
  videosFolder: `cypress/videos/${runId}`,
  reporter: "junit",
  reporterOptions: {
    mochaFile: `${resultDirectory}/junit-[hash].xml`,
    toConsole: true,
  },
  e2e: {
    setupNodeEvents(on) {
      registerFunctionalTasks(on);
      on("before:run", () => {
        mkdirSync(resultDirectory, { recursive: true });
        writeFileSync(`${resultDirectory}/environment.json`, JSON.stringify({
          runId,
          startedAt: new Date().toISOString(),
          commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
          workingTreeDirty: Boolean(execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()),
          platform: process.platform,
          node: process.version,
        }, null, 2));
      });
      on("after:run", (results) => {
        if (!results || !("totalTests" in results)) return;
        writeFileSync(`${resultDirectory}/summary.json`, JSON.stringify({
          runId,
          browser: `${results.browserName} ${results.browserVersion}`,
          cypress: results.cypressVersion,
          startedAt: results.startedTestsAt,
          endedAt: results.endedTestsAt,
          totalTests: results.totalTests,
          passed: results.totalPassed,
          failed: results.totalFailed,
          pending: results.totalPending,
          skipped: results.totalSkipped,
        }, null, 2));
      });
    },
    baseUrl: "http://127.0.0.1:5173",
    testIsolation: true,
  },
});
