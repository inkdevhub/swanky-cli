import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ConfigError, FileError } from "../../lib/errors.js";
import fs from "fs-extra";
import path from "node:path";
import { Args, Flags } from "@oclif/core";

interface Folder {
  name: string,
  contractName?: string,
  path: string
}

export default class Clear extends SwankyCommand<typeof Clear> {

  static flags = {
    all: Flags.boolean({
      char: "a",
      description: "Select all the project artifacts for delete",
    }),
  };

  static args = {
    contractName: Args.string({
      name: "contractName",
      required: false,
      description: "Name of the contract artifact to clear",
    }),
  };

  async deleteFolder(path: string): Promise<void> {
    try {
      await fs.remove(path);
      this.log(`Successfully deleted ${path}`);
    } catch (err: any) {
      if (err.code === "ENOENT") {
        this.log(`Folder ${path} does not exist, skipping.`);
      } else {
        throw new FileError(`Error deleting the folder ${path}.`, { cause: err });
      }
    }
  }

  public async run(): Promise<any> {

    const { flags, args } = await this.parse(Clear);

    if (args.contractName === undefined && !flags.all) {
      throw new ConfigError("Specify a contract name or use the --all flag to delete all artifacts.");
    }

    const workDirectory = process.cwd();
    const foldersToDelete: Folder[] = flags.all ?
      [
        { name: "Artifacts", path: path.join(workDirectory, "./artifacts") },
        { name: "Target", path: path.join(workDirectory, "./target") }
      ]
      : args.contractName ?
        [
          { name: "Artifacts", contractName: args.contractName, path: path.join(workDirectory, "./artifacts/", args.contractName) },
          { name: "Target", path: path.join(workDirectory, "./target") },
          { name: "TestArtifacts", contractName: args.contractName, path: path.join(workDirectory, "./tests/", args.contractName, "/artifacts") }
        ]
      : [];
    for (const folder of foldersToDelete) {
      await this.spinner.runCommand(async () => this.deleteFolder(folder.path),
        `Deleting the ${folder.name} folder ${folder.contractName ? `for ${folder.contractName} contract` : ""}`,
        `Successfully deleted the ${folder.name} folder ${folder.contractName ? `for ${folder.contractName} contract` : ""}\n at ${folder.path}`
      );
    }
  }
}