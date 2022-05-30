import { Command, Flags } from "@oclif/core";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path = require("node:path");
export class DeployContract extends Command {
  static description = "Deploy contract to a running node";

  static flags = {
    gas: Flags.string({
      required: true,
      char: "g",
    }),
    args: Flags.string({
      required: true,
      char: "a",
    }),
  };

  static args = [];

  async run(): Promise<void> {
    const { flags } = await this.parse(DeployContract);
    let config: { contracts: string[] | Record<string, string> } = {
      contracts: [""],
    };
    try {
      const file = readFileSync("swanky.config.json", { encoding: "utf-8" });
      config = JSON.parse(file);
    } catch {
      throw new Error("No 'swanky.config.json' detected in current folder!");
    }

    const output = execSync(
      `cargo contract instantiate --constructor new --args ${flags.args} --suri //Alice --gas ${flags.gas}`,
      {
        stdio: "pipe",
        cwd: path.resolve(
          "contracts",
          typeof config.contracts[0] === "string"
            ? config.contracts[0]
            : config.contracts[0].name
        ),
      }
    ).toString("utf-8");

    const codeHash = output
      .split("\n")
      .find((line) => line.trim().startsWith("Code hash "))
      ?.split("Code hash ")
      .pop();

    const contractAddress = output
      .split("\n")
      .find((line) => line.trim().startsWith("Contract "))
      ?.split("Contract ")
      .pop();

    config.contracts[0] = {
      name: config.contracts[0].name || config.contracts[0],
      hash: codeHash,
      address: contractAddress,
    };

    writeFileSync(
      path.resolve("swanky.config.json"),
      JSON.stringify(config, null, 2)
    );
    this.log(`Deploy successful!`);
    this.log(`Code hash: ${codeHash}`);
    this.log(`Contract address: ${contractAddress}`);
  }
}
