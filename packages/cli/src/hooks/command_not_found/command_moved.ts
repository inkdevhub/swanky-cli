import { Hook } from "@oclif/core";
import chalk = require("chalk");

const hook: Hook<"command_not_found"> = async function (opts) {
  if (opts.id === "compile" || opts.id === "deploy") {
    process.stdout.write(
      chalk.redBright(`The "${opts.id}" command is now a subcommand of "contract" \n`)
    );
    process.stdout.write(
      `You can use it like: ${chalk.greenBright(`swanky contract ${opts.id} contract_name`)}\n`
    );
  }
};

export default hook;
