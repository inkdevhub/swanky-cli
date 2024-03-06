import { SwankyCommand } from "../../lib/swankyCommand.js";
import path from "node:path";
import { pathExistsSync } from "fs-extra/esm";
import { execaCommand } from "execa";


export class StartFrontend extends SwankyCommand<typeof StartFrontend> {
  static description = "Start Frontend";

  async run(): Promise<void> {
    const projectPath = path.resolve();

    const frontendPath = path.resolve(projectPath, "frontend")

    if (!pathExistsSync(frontendPath)) {
      this.error("Frontend has not initialized");
    }

    await execaCommand(
      `pnpm run dev`,
      {
        stdio: "inherit",
      }
    );

    this.log("Frontend dev server started successfully");
  }
}