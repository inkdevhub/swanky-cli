import { Command, Flags, Interfaces } from "@oclif/core";
import chalk from "chalk";
import { buildSwankyConfig,
  configName,
  getSwankyConfig,
  getSystemConfigDirectoryPath, Spinner } from "./index.js";
import { AccountData, SwankyConfig, SwankySystemConfig } from "../types/index.js";
import { writeJSON } from "fs-extra/esm";
import { existsSync, mkdirSync } from "fs";
import { BaseError, ConfigError, UnknownError } from "./errors.js";
import { swankyLogger } from "./logger.js";
import { Logger } from "winston";
import path from "node:path";
import { DEFAULT_CONFIG_FOLDER_NAME, DEFAULT_CONFIG_NAME } from "./consts.js";

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

    await this.loadAndMergeConfig();

    this.logger.info(`Running command: ${this.ctor.name}
      Args: ${JSON.stringify(this.args)}
      Flags: ${JSON.stringify(this.flags)}
      Full command: ${JSON.stringify(process.argv)}`);
  }

  protected async loadAndMergeConfig(): Promise<void> {
    try {
      const systemConfig = getSwankyConfig("global");
      this.swankyConfig = { ...this.swankyConfig, ...systemConfig };
    } catch (error) {
      this.warn(
        `No Swanky system config found; creating one in "/${DEFAULT_CONFIG_FOLDER_NAME}/${DEFAULT_CONFIG_NAME}}" at home directory`
      );
      await this.storeConfig(this.swankyConfig, "global");
    }

    try {
      const localConfig = getSwankyConfig("local") as SwankyConfig;
      this.mergeAccountsWithExistingConfig(this.swankyConfig, localConfig);
      const originalDefaultAccount = this.swankyConfig.defaultAccount;
      this.swankyConfig = { ...this.swankyConfig, ...localConfig };
      this.swankyConfig.defaultAccount = localConfig.defaultAccount ?? originalDefaultAccount;
    } catch (error) {
      this.handleLocalConfigError(error);
    }
  }

  private handleLocalConfigError(error: unknown): void {
    this.logger.warn("No local config found");
    if (
      error instanceof Error &&
      error.message.includes(configName()) &&
      (this.constructor as typeof SwankyCommand).ENSURE_SWANKY_CONFIG
    ) {
      throw new ConfigError(`Cannot find ${process.env.SWANKY_CONFIG ?? DEFAULT_CONFIG_NAME}`, {
        cause: error,
      });
    }
  }

  protected async storeConfig(
    newConfig: SwankyConfig | SwankySystemConfig,
    configType: "local" | "global",
    projectPath?: string
  ) {
    let configPath: string;

    if (configType === "local") {
      configPath =
        process.env.SWANKY_CONFIG ??
        path.resolve(projectPath ?? process.cwd(), DEFAULT_CONFIG_NAME);
    } else {
      // global
      configPath = getSystemConfigDirectoryPath() + `/${DEFAULT_CONFIG_NAME}`;
      if ("node" in newConfig) {
        // If it's a SwankyConfig, extract only the system relevant parts for the global SwankySystemConfig config
        newConfig = {
          defaultAccount: newConfig.defaultAccount,
          accounts: newConfig.accounts,
          networks: newConfig.networks,
        };
      }
      if (existsSync(configPath)) {
        const systemConfig = getSwankyConfig("global");
        this.mergeAccountsWithExistingConfig(systemConfig, newConfig);
      }
    }

    this.ensureDirectoryExists(configPath);
    await writeJSON(configPath, newConfig, { spaces: 2 });
  }

  private ensureDirectoryExists(filePath: string) {
    const directory = path.dirname(filePath);
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }
  }

  private mergeAccountsWithExistingConfig(
    existingConfig: SwankySystemConfig | SwankyConfig,
    newConfig: SwankySystemConfig
  ) {
    const accountMap = new Map<string, AccountData>(
      [...existingConfig.accounts, ...newConfig.accounts].map((account) => [account.alias, account])
    );

    newConfig.accounts = Array.from(accountMap.values());
  }

  protected findAccountByAlias(alias: string): AccountData {
    const accountData = this.swankyConfig.accounts.find(
      (account: AccountData) => account.alias === alias
    );

    if (!accountData) {
      throw new ConfigError(`Provided account alias ${chalk.yellowBright(alias)} not found in swanky.config.json`);
    }

    return accountData;
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
