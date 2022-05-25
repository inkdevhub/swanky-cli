import { Flags } from "@oclif/core";
import { GeneratorBase } from "../../generator-base";

export class Generate extends GeneratorBase {
  static description = "Generate a new Ink based smart contract";

  static flags = {
    language: Flags.string({
      char: "l",
      default: "ink",
      options: ["ink", "ask"],
    }),
  };

  static args = [
    {
      name: "name",
      required: true,
      description: "directory name of new project",
    },
  ];

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Generate);

    if (flags.language !== "ink") {
      this.error(`Sorry, ${flags.language} is not supported yet`, { exit: 0 });
    }

    super.generate(flags.language, {
      name: args.name,
      force: true,
    });
  }
}
