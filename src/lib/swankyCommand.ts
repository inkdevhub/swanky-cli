import { Command, Flags, Interfaces } from "@oclif/core";
import { getSwankyConfig, Spinner } from "./index.js";
import { SwankyConfig } from "../types/index.js";
import { writeJSON } from "fs-extra/esm";
import ModernError from "modern-errors";
import modernErrorsBugs from "modern-errors-bugs";
import modernErrorsClean from "modern-errors-clean";
import modernErrorWinston from "modern-errors-winston";
import { createLogger, format, transports } from "winston";

export const BaseError = ModernError.subclass("BaseError", {
  plugins: [modernErrorsBugs, modernErrorsClean, modernErrorWinston],
});

export const InputError = BaseError.subclass("InputError");

export const UnknownError = BaseError.subclass("UnknownError", {
  bugs: "https://github.com/swankyhub/swanky-cli/issues",
});

// const logger = createLogger({
//   format: ,
//   transports: [new transports.Http(httpOptions)],
// })

const winstonCliFormat = format.combine(BaseError.shortFormat(), format.cli());
const winstonFileFormat = format.combine(BaseError.fullFormat(), format.json());
const logger = createLogger({
  format: winstonCliFormat,
  transports: [new transports.Console()],
});

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<
  (typeof SwankyCommand)["baseFlags"] & T["flags"]
>;
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T["args"]>;

export abstract class SwankyCommand<T extends typeof Command> extends Command {
  protected spinner!: Spinner;
  protected swankyConfig!: SwankyConfig;
  static ENSURE_SWANKY_CONFIG = true;
  static LOG_MODE = "PROD";

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
    console.log("AAAAAAA", flags);
    try {
      this.swankyConfig = await getSwankyConfig();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("swanky.config.json") &&
        (this.constructor as typeof SwankyCommand).ENSURE_SWANKY_CONFIG
      )
        throw error;
    }
  }

  protected async storeConfig() {
    await writeJSON("swanky.config.json", this.swankyConfig, { spaces: 2 });
  }

  protected async catch(err: Error & { exitCode?: number }): Promise<any> {
    // add any custom logic to handle errors from the command
    // or simply return the parent class error handling
    const error = BaseError.normalize(err, UnknownError);
    logger.error(error);
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
