import { Flags } from "@oclif/core";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { InputError } from "../../lib/errors.js";
import { installCliDevDeps } from "../../lib/tasks.js";
import { SUPPORTED_DEPS } from "../../lib/consts.js";
import { DependencyName, SwankyConfig, getSwankyConfig } from "../../index.js";
import { ConfigBuilder } from "../../lib/config-builder.js";

export class Install extends SwankyCommand<typeof Install> {
  static flags = {
    deps: Flags.string({
      description: `Install the specified dev dependency name and version in the format <dependency@version>. The following options are supported: ${Object.keys(
        SUPPORTED_DEPS
      ).join(", ")}. For installing rust nightly version run: env install --deps rust@nightly`,
      multiple: true,
      char: "d",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Install);
    const depsArray = flags.deps ?? [];

    const localConfig = getSwankyConfig('local') as SwankyConfig;
    const depsToInstall = depsArray.length > 0 ? this.parseDeps(depsArray) : localConfig.env;

    if (Object.keys(depsToInstall).length === 0) {
      this.log("No dependencies to install.");
      return;
    }

    await this.installDeps(depsToInstall);

    if (depsArray.length > 0) {
      await this.updateLocalConfig(depsToInstall);
    }

    this.log("Swanky Dev Dependencies Installed successfully");
  }

  parseDeps(deps: string[]): Record<string, string> {
    return deps.reduce((acc, dep) => {
      const [key, value] = dep.split('@');
      if (!Object.keys(SUPPORTED_DEPS).includes(key)) {
        throw new InputError(`Unsupported dependency '${key}'. Supported: ${Object.keys(SUPPORTED_DEPS).join(", ")}`);
      }
      acc[key] = value || 'latest';
      return acc;
    }, {} as Record<string, string>);
  }

  async installDeps(dependencies: Record<string, string>) {
    for (const [dep, version] of Object.entries(dependencies)) {
      await this.spinner.runCommand(
        () => installCliDevDeps(this.spinner, dep as DependencyName, version),
        `Installing ${dep}@${version}`
      );
    }
  }

  async updateLocalConfig(newDeps: Record<string, string>): Promise<void> {
    await this.spinner.runCommand(async () => {
      const newLocalConfig = new ConfigBuilder(getSwankyConfig('local'))
        .updateEnv(newDeps)
        .build();
      await this.storeConfig(newLocalConfig, 'local');
    }, "Updating Swanky config with new Dev Dependencies...");
  }
}
