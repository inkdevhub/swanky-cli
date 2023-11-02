import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ConfigError, FileError } from "../../lib/errors.js";
import fs from "fs-extra"
import path from "node:path"
import { Args, Flags } from "@oclif/core";

type Folder = {name: string, contractName?: string, path: string}

export default class Clear extends SwankyCommand<typeof Clear> {

  static flags = {
    all: Flags.boolean({
      char: "a",
      description: "Select all the project artifacts for delete"
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
    } catch (err) {
      throw new FileError(
        `Error deleting the folder ${path}.`, {cause: err}
      );
    }
  } 

  public async run(): Promise<any> {

    const { flags, args } = await this.parse(Clear);

    if(args.contractName === undefined && !flags.all) throw new ConfigError("You need to send any flag or argument.")

    const workDirectory = process.cwd();
    let foldersToDelete: Folder[] = []

    if(flags.all) {

      foldersToDelete.push({
        name: "Artifacts",
        path: path.join(workDirectory, './artifacts')
      }, {
        name: "Target",
        path: path.join(workDirectory, './target')
      })

      for await (const folder of foldersToDelete) {
        let resultSpinner = await this.spinner.runCommand( async () => this.deleteFolder(folder.path),
         `Deleting the ${folder.name} folder`
      )
      } 
    } else if (args.contractName) {

      foldersToDelete.push({
        name: "Artifacts",
        contractName: args.contractName,
        path: path.join(workDirectory, './artifacts/', args.contractName)
      }, {
        name: "Target",
        path: path.join(workDirectory, './target')
      }, {
        name: "TestArtifacts",
        contractName: args.contractName,
        path: path.join(workDirectory, './tests/', args.contractName, "/artifacts")
      })

      for await (const folder of foldersToDelete) {
        let resultSpinner = await this.spinner.runCommand( async () => this.deleteFolder(folder.path),
         `Deleting the ${folder.name} folder`
      )
      }
    }
  }
}