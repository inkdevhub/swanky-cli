import { Command } from "@oclif/core";
import { createEnv } from "yeoman-environment";

export abstract class GeneratorBase extends Command {
  protected generate(
    type: string,
    generatorOptions: Record<string, unknown> = {}
  ): void {
    const env = createEnv();

    env.register(require.resolve(`./generators/${type}`), `init:${type}`);

    env.run(`init:${type}`, generatorOptions);
  }

  async catch(_error: any) {
    console.log("error.message", _error);
  }
}
