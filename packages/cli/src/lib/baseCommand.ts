import { Command, Flags, Interfaces } from "@oclif/core";
import { getSwankyConfig, Spinner, SwankyConfig } from "@astar-network/swanky-core";

export abstract class BaseCommand<T extends typeof Command> extends Command {
  protected spinner!: Spinner;
  protected swankyConfig!: SwankyConfig;

  public async init(): Promise<void> {
    await super.init();
    this.spinner = new Spinner();

    this.swankyConfig = await getSwankyConfig();
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
BaseCommand.baseFlags = {
  verbose: Flags.boolean({
    required: false,
    description: "Display more info in the result logs",
    char: "v",
  }),
};
