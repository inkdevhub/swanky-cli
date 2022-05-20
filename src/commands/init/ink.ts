import { GeneratorBase } from "../../generator-base";

export class GenerateInk extends GeneratorBase {
  static description = "Generate a new Ink based smart contract";

  static flags = {};

  static args = [
    {
      name: "name",
      required: true,
      description: "directory name of new project",
    },
  ];

  async run(): Promise<void> {
    const { args } = await this.parse(GenerateInk);

    super.generate("ink", {
      name: args.name,
      force: true,
    });
  }
}
