import { Command, Flags } from "@oclif/core";
import { getSwankyConfig, Spinner } from "./index.js";
import { SwankyConfig } from "../types/index.js";
import { writeJSON } from "fs-extra/esm";

export abstract class SwankyCommand extends Command {
  protected spinner!: Spinner;
  protected swankyConfig!: SwankyConfig;
  static ENSURE_SWANKY_CONFIG = true;

  public async init(): Promise<void> {
    await super.init();
    this.spinner = new Spinner();

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
    return super.catch(err);
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
