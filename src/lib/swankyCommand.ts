import { Command, Flags, Interfaces } from "@oclif/core";
import chalk from "chalk";
import { getSwankyConfig, Spinner } from "./index.js";
import { AccountData, SwankyConfig } from "../types/index.js";
import { writeJSON } from "fs-extra/esm";
import { BaseError, ConfigError, UnknownError } from "./errors.js";
import { swankyLogger } from "./logger.js";
import { Logger } from "winston";
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
    try {
      this.swankyConfig = await getSwankyConfig();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("swanky.config.json") &&
        (this.constructor as typeof SwankyCommand).ENSURE_SWANKY_CONFIG
      )
        throw new ConfigError("Cannot find swanky.config.json", { cause: error });
    }

    this.logger.info(`Running command: ${this.ctor.name}
      Args: ${JSON.stringify(this.args)}
      Flags: ${JSON.stringify(this.flags)}
      Full command: ${JSON.stringify(process.argv)}`);
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

  protected async storeConfig() {
    await writeJSON("swanky.config.json", this.swankyConfig, { spaces: 2 });
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
