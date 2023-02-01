import { Command, Flags, Interfaces } from "@oclif/core";
import { getSwankyConfig, Spinner, SwankyConfig } from "@astar-network/swanky-core";

export type BaseCommandFlags<T extends typeof Command> = Interfaces.InferredFlags<
  typeof BaseCommand["globalFlags"] & T["flags"]
>;

export abstract class BaseCommand<T extends typeof Command> extends Command {
  // define flags that can be inherited by any command that extends BaseCommand
  static globalFlags = {
    verbose: Flags.boolean({
      required: false,
      description: "Display more info in the result logs",
      char: "v",
    }),
  };

  protected flags!: BaseCommandFlags<T>;
  protected spinner!: Spinner;
  protected swankyConfig!: SwankyConfig;

  public async init(): Promise<void> {
    await super.init();
    const { flags } = await this.parse(this.constructor as Interfaces.Command.Class);
    this.flags = flags;
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
