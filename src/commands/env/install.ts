import { Flags } from "@oclif/core";
import path from "node:path";
import { writeJSON } from "fs-extra/esm";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { InputError } from "../../lib/errors.js";
import { installCliDevDeps } from "../../lib/tasks.js";
import { SUPPORTED_DEPS } from "../../lib/consts.js";
import { DependencyName } from "../../index.js";

export class Install extends SwankyCommand<typeof Install> {
  static flags = {
    all: Flags.boolean({
      default: false,
      char: "a",
      description: "Install all dev dependencies from swanky config",
    }),
    deps: Flags.string({
      required: false,
      description:
        "Install the specified dev dependency name and version in the format <dependency@version>",
      options: Object.keys(SUPPORTED_DEPS),
      multiple: true,
      default: [],
      char: "d",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Install);

    if (flags.deps.length === 0 && !flags.all) {
      throw new InputError("No dependency to install was specified");
    }

    const newDeps: Record<string, string> = {};
    for (const item of flags.deps) {
      const [key, value] = item.split("@");
      newDeps[key] = value || "latest";
    }

    const newEnv = { ...this.swankyConfig.env, ...newDeps };
    const deps = Object.entries(newEnv);
    for (const [dep, version] of deps) {
      const typedDep = dep as DependencyName;
      await this.spinner.runCommand(
        () => installCliDevDeps(this.spinner, typedDep, version),
        `Installing ${dep}`
      );
    }

    if (Object.keys(newDeps).length) {
      await this.spinner.runCommand(async () => {
        this.swankyConfig.env = newEnv;
        await writeJSON(path.resolve("swanky.config.json"), this.swankyConfig, {
          spaces: 2,
        });
      }, "Updating swanky config");
    }

    this.log("Dev Dependencies Installed successfully");
  }
}
