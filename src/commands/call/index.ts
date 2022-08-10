import { Command, Flags } from "@oclif/core";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path = require("node:path");
export class CallContract extends Command {
  static description = "Call a method on a smart contract";

  static flags = {
    args: Flags.string({
      required: false,
      char: "a",
    }),
    message: Flags.string({
      required: true,
      char: "m",
    }),
    dry: Flags.boolean({
      char: "d",
    }),
    gas: Flags.string({
      char: "g",
    }),
  };

  static args = [];

  async run(): Promise<void> {
    const { flags } = await this.parse(CallContract);
    let config: { contracts: string[] | Record<string, string> } = {
      contracts: [""],
    };
    try {
      const file = readFileSync("swanky.config.json", { encoding: "utf8" });
      config = JSON.parse(file);
    } catch {
      throw new Error("No 'swanky.config.json' detected in current folder!");
    }

    execSync(
      `cargo contract call --contract ${
        config.contracts[0].address
      } --message ${flags.message} --suri //Alice --gas ${
        flags.gas ?? "100000000000"
      } ${flags.dry ? "--dry-run" : ""}`,
      {
        stdio: "inherit",
        cwd: path.resolve(
          "contracts",
          typeof config.contracts[0] === "string"
            ? config.contracts[0]
            : config.contracts[0].name
        ),
      }
    );
  }
}
