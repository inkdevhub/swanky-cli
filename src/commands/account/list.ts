import chalk from "chalk";
import { SwankyCommand } from "../../lib/swankyCommand.js";

export class ListAccounts extends SwankyCommand<typeof ListAccounts> {
  static description = "List dev accounts stored in config";
  static aliases = [`account:ls`];

  constructor(argv: string[], baseConfig: any) {
    super(argv, baseConfig);
    (this.constructor as typeof SwankyCommand).ENSURE_SWANKY_CONFIG = false;
  }

  async run(): Promise<void> {
    const countOfDevAccounts = this.swankyConfig.accounts.filter((account) => account.isDev).length;

    if(countOfDevAccounts !== 0) {
      this.log(`${chalk.greenBright("✔")} Stored dev accounts:`);

      for (const account of this.swankyConfig.accounts) {
        if(account.isDev){
          this.log(`\t${chalk.yellowBright("Alias: ")} ${account.alias}  \
${chalk.yellowBright("Address: ")} ${account.address} ${this.swankyConfig.defaultAccount === account.alias ? chalk.greenBright("<- Default") : ""}`);
        }
      }
    }

    const countOfProdAccounts = this.swankyConfig.accounts.length - countOfDevAccounts;

    if(countOfProdAccounts !== 0) {
      this.log(`${chalk.greenBright("✔")} Stored prod accounts:`);

      for (const account of this.swankyConfig.accounts) {
        if(!account.isDev){
          this.log(`\t${chalk.yellowBright("Alias: ")} ${account.alias}  \
${chalk.yellowBright("Address: ")} ${account.address} ${this.swankyConfig.defaultAccount === account.alias ? chalk.greenBright("<- Default") : ""}`);
        }
      }
    }
  }
}
