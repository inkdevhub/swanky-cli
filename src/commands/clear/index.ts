import { Spinner } from "../../lib/index.js";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { ConfigError, FileError } from "../../lib/errors.js";
import fs from "fs-extra"
import path from "path"
import { Args, Flags } from "@oclif/core";
import { flagUsage } from "@oclif/core/lib/parser/help.js";

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

  static async deleteFolder(path: string): Promise<void> {
    try {
      await fs.remove(path);
    } catch (err) {
      throw new FileError(
        `Error while to delete the folder ${path}: ${err}Error while to delete the folder ${path}: ${err}`
      );
    }
  } 

  public async run(): Promise<any> {

    const spinner = new Spinner();

    const { flags, args } = await this.parse(Clear);

    if(!flags.all && !args.contractName) throw new ConfigError("You need to send any flag or argument.")

    if(flags.all && args.contractName) {
      throw new ConfigError("You can't sent the flag '-a' or '--all' and argument in the same time.")
    } 

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

      foldersToDelete.map(async (folder) => {

        this.log(`Deleting the ${folder.name} folder`)
  
        // await spinner.runCommand(async () => 
        await Clear.deleteFolder(folder.path)
        // , `Deleting the ${folder.name} folder`, `The folder has been deleted`);

      })
    } else if (args.contractName) {

      foldersToDelete.push({
        name: "Artifacts",
        contractName: args.contractName,
        path: path.join(workDirectory, './artifacts/', args.contractName)
      }, {
        name: "Target",
        path: path.join(workDirectory, './target')
      }, {
        name: "Test",
        contractName: args.contractName,
        path: path.join(workDirectory, './tests/', args.contractName, "/artifacts")
      })
  
      foldersToDelete.map(async (folder) => {
  
      if (fs.existsSync(folder.path)) {
  
        this.log(`Deleting the ${folder.name} folder`)
  
        // await spinner.runCommand(async () => 
        await Clear.deleteFolder(folder.path)
        // , `Deleting the ${folder.name} folder`, `The folder has been deleted`);
  
      } else {
        throw new FileError(
          `Path to contract ${args.contractName} does not exist: ${folder.path}`
        );
  }
      } )
    }
  }
}