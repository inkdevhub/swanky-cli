import chalk from "chalk";
import { SwankyCommand } from "../../lib/swankyCommand.js";

export class ListAccounts extends SwankyCommand<typeof ListAccounts> {
  static description = "List dev accounts stored in config";
  static aliases = [`account:ls`];

  async run(): Promise<void> {
    this.log(`${chalk.greenBright("✔")} Stored dev accounts:`);

    for (const account of this.swankyConfig.accounts) {
      if(account.isDev){
        this.log(`\t${chalk.yellowBright("Alias: ")} ${account.alias}`);
      }
    }

    this.log(`${chalk.greenBright("✔")} Stored prod accounts:`);

    for (const account of this.swankyConfig.accounts) {
      if(!account.isDev){
        this.log(`\t${chalk.yellowBright("Alias: ")} ${account.alias}`);
      }
    }
  }
}
