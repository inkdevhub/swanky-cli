import { Flags } from "@oclif/core";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { InputError } from "../../lib/errors.js";
import { installCliDevDeps } from "../../lib/tasks.js";
import { SUPPORTED_DEPS } from "../../lib/consts.js";
import { DependencyName, getSwankyConfig } from "../../index.js";
import { ConfigBuilder } from "../../lib/config-builder.js";

export class Install extends SwankyCommand<typeof Install> {
  static flags = {
    all: Flags.boolean({
      default: false,
      char: "a",
      description: "Install all dev dependencies from swanky config",
    }),
    deps: Flags.string({
      required: false,
      description: `Install the specified dev dependency name and version in the format <dependency@version>. The following options are supported: ${Object.keys(
        SUPPORTED_DEPS
      ).join(", ")}`,
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

    if (flags.deps.some((dep) => !Object.keys(SUPPORTED_DEPS).includes(dep.split("@")[0]))) {
      throw new InputError(
        `Unsupported dependency specified. Please use one of the following supported dependencies: ${Object.keys(
          SUPPORTED_DEPS
        ).join(", ")}`
      );
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

    if (Object.keys(newDeps).length > 0) {
      await this.spinner.runCommand(async () => {
        const newLocalConfig = new ConfigBuilder(getSwankyConfig("global"))
          .updateEnv(newDeps)
          .build();
        await this.storeConfig(newLocalConfig, "global");
      }, "Updating swanky config");
    }

    this.log("Dev Dependencies Installed successfully");
  }
}
