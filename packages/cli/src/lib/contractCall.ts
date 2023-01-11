import { Command, Flags, Interfaces } from "@oclif/core";
import { BaseCommand } from "./baseCommand";

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<
  typeof BaseCommand["globalFlags"] & typeof ContractCall["callFlags"] & T["flags"]
>;

export abstract class ContractCall<T extends typeof Command> extends BaseCommand<
  typeof ContractCall
> {
  // define flags that can be inherited by any command that extends BaseCommand
  static callFlags = {
    params: Flags.string({
      required: false,
      description: "Arguments supplied to the message",
      multiple: true,
      default: [],
      char: "p",
    }),
  };

  static callArgs = [
    { name: "contractName", description: "Contract to call", required: true },
    {
      name: "messageName",
      required: true,
      description: "What message to call",
    },
  ];

  protected flags!: Flags<T>;
  protected args!: {
    [name: string]: any;
  };

  public async init(): Promise<void> {
    await super.init();
    const { flags, args } = await this.parse(this.constructor as Interfaces.Command.Class);
    this.flags = flags;
    this.args = args;
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
