import { Args, Command, Flags } from "@oclif/core";
import path = require("node:path");
import {
  moveArtifacts,
  ensureSwankyProject,
  getBuildCommandFor,
  getSwankyConfig,
  BuildData,
  Spinner,
  generateTypesFor,
} from "@astar-network/swanky-core";
import { writeJSON, readdirSync, existsSync } from "fs-extra";

export class CompileContract extends Command {
  static description = "Compile the smart contract(s) in your contracts directory";

  static flags = {
    verbose: Flags.boolean({
      default: false,
      char: "v",
      description: "Display additional compilation output",
    }),
    release: Flags.boolean({
      default: false,
      char: "r",
      description: "A production contract should always be build in `release` mode for building optimized wasm"
    }),
    all: Flags.boolean({
      default: false,
      char: "a",
      description: "Set all to true to compile all contracts"
    })
  };

  static args = {
    contractName: Args.string({
      name: "contractName",
      required: false,
      default: "",
      description: "Name of the contract to compile",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CompileContract);

    if (args.contractName == "" && !flags.all) {
      this.error("No contracts were selected to compile")
    }

    await ensureSwankyProject();
    const config = await getSwankyConfig();

    const contractNames = [];
    if (flags.all) {
      const contractList = readdirSync(path.resolve("contracts"), { withFileTypes: true });
      for (const contract of contractList) {
        if (contract.isDirectory()) {
          console.log(`${contract.name} contract is found`);
          contractNames.push(contract.name);
        }
      }
    } else {
      contractNames.push(args.contractName);
    }

    const spinner = new Spinner();

    for (const contractName of contractNames) {
      const contractInfo = config.contracts[contractName];
      if (!contractInfo) {
        this.error(`Cannot find contract info for ${contractName} contract in swanky.config.json`);
      }
      const contractPath = path.resolve("contracts", contractName);
      if (!existsSync(contractPath)) {
        this.error(`Contract folder not found at expected path`);
      }

      await spinner.runCommand(
        async () => {
          return new Promise<void>((resolve, reject) => {
            const compile = getBuildCommandFor(contractInfo.language, contractPath, flags.release);
            compile.stdout.on("data", () => spinner.ora.clear());
            compile.stdout.pipe(process.stdout);
            if (flags.verbose) {
              compile.stderr.on("data", () => spinner.ora.clear());
              compile.stderr.pipe(process.stdout);
            }
            compile.on("exit", (code) => {
              if (code === 0) resolve();
              else reject();
            });
          });
        },
        `Compiling ${contractName} contract`,
        `${contractName} Contract compiled successfully`,
      );

      await spinner.runCommand(
        async () => await generateTypesFor(contractInfo.language, contractInfo.name, contractPath),
        `Generating ${contractName} contract ts types`,
        `${contractName} contract's TS types Generated successfully`
      );

      const buildData = (await spinner.runCommand(async () => {
        return moveArtifacts(contractInfo.name);
      }, "Moving artifacts")) as BuildData;

      contractInfo.build = buildData;
    }

    await spinner.runCommand(async () => {
      await writeJSON(path.resolve("swanky.config.json"), config, {
        spaces: 2,
      });
    }, "Writing config");
  }
}
