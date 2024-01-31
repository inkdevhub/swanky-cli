import { Command, Flags, Interfaces } from "@oclif/core";
import {
  buildSwankyConfig,
  configName,
  findSwankySystemConfigPath,
  getSwankyConfig,
  getSwankySystemConfig,
  Spinner,
} from "./index.js";
import { SwankyConfig, SwankySystemConfig } from "../types/index.js";
import { writeJSON } from "fs-extra/esm";
import { existsSync, mkdirSync } from "fs";
import { BaseError, ConfigError, UnknownError } from "./errors.js";
import { swankyLogger } from "./logger.js";
import { Logger } from "winston";
import path from "node:path";

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<
  (typeof SwankyCommand)["baseFlags"] & T["flags"]
>;
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T["args"]>;

export abstract class SwankyCommand<T extends typeof Command> extends Command {
  static ENSURE_SWANKY_CONFIG = true;

  protected spinner!: Spinner;
  protected swankyConfig!: SwankyConfig;
  protected logger!: Logger;

  protected flags!: Flags<T>;
  protected args!: Args<T>;

  public async init(): Promise<void> {
    await super.init();
    this.spinner = new Spinner();

    const { args, flags } = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof SwankyCommand).baseFlags,
      args: this.ctor.args,
      strict: this.ctor.strict,
    });
    this.flags = flags as Flags<T>;
    this.args = args as Args<T>;

    this.logger = swankyLogger;
    this.swankyConfig = buildSwankyConfig();

    try {
      const systemConfig = await getSwankySystemConfig();

      Object.entries(systemConfig).forEach((entry) => {
        this.swankyConfig[entry[0] as keyof SwankyConfig] = entry[1];
      });
    } catch (error) {
      await this.storeSystemConfig();
    }

    try {
      const localConfig = await getSwankyConfig();

      Object.entries(localConfig).forEach((entry) => {
        this.swankyConfig[entry[0] as keyof SwankyConfig] = entry[1];
      });
    } catch (error) {
      this.logger.warn("No local config found");
      if (error instanceof Error &&
        error.message.includes(configName()) &&
        (this.constructor as typeof SwankyCommand).ENSURE_SWANKY_CONFIG
      )
        throw new ConfigError(`Cannot find ${process.env.SWANKY_CONFIG ?? "swanky.config.json"}`, { cause: error });
    }

    this.logger.info(`Running command: ${this.ctor.name}
      Args: ${JSON.stringify(this.args)}
      Flags: ${JSON.stringify(this.flags)}
      Full command: ${JSON.stringify(process.argv)}`);
  }

  protected async storeConfig(
    config: SwankyConfig | SwankySystemConfig,
    configType: "local" | "global",
    projectPath?: string
  ) {
    let configPath: string;

    if (configType === "local") {
      configPath =
        process.env.SWANKY_CONFIG ?? path.resolve(projectPath ?? ".", "swanky.config.json");
    } else {
      // global
      configPath = findSwankySystemConfigPath() + "/swanky.config.json";
      if ("node" in config) {
        // If it's a SwankyConfig, extract only the system relevant parts for the global SwankySystemConfig config
        config = {
          defaultAccount: config.defaultAccount,
          accounts: config.accounts,
          networks: config.networks,
        };
      }
      this.mergeWithExistingSystemConfig(config, configPath);
    }

    this.ensureDirectoryExists(configPath);
    await writeJSON(configPath, config, { spaces: 2 });
  }

  private ensureDirectoryExists(filePath: string) {
    const directory = path.dirname(filePath);
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }
  }

  private async mergeWithExistingSystemConfig(newConfig: SwankySystemConfig, configPath: string) {
    if (existsSync(configPath)) {
      const oldConfig = await getSwankySystemConfig();
      newConfig.accounts = [...new Set([...oldConfig.accounts, ...newConfig.accounts])];
    }
  }

  protected async catch(err: Error & { exitCode?: number }): Promise<any> {
    // add any custom logic to handle errors from the command
    // or simply return the parent class error handling
    const error = BaseError.normalize(err, UnknownError);
    this.logger.error(error);
  }

  protected async finally(_: Error | undefined): Promise<any> {
    // called after run and catch regardless of whether or not the command errored
    return super.finally(_);
  }
}

// Static property baseFlags needs to be defined like this (for now) because of the way TS transpiles ESNEXT code
// https://github.com/oclif/oclif/issues/1100#issuecomment-1454910926
SwankyCommand.baseFlags = {
  verbose: Flags.boolean({
    required: false,
    description: "Display more info in the result logs",
    char: "v",
  }),
};
