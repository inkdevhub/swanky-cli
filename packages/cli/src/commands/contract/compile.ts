import { Command, Flags } from "@oclif/core";
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
import { writeJSON, readdirSync } from "fs-extra";

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
    })
  };

  static args = [
    {
      name: "contractName",
      required: false,
      default: "",
      description: "Name of the contract to compile, compile all contracts if not specified.",
    },
  ];

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CompileContract);

    await ensureSwankyProject();

    const config = await getSwankyConfig();

    let contractList = readdirSync(path.resolve("contracts"));
    if (args.contractName !== "") {
      if (!config.contracts[args.contractName]) {
        this.error(`Cannot find a contract named ${args.contractName} in swanky.config.json`);
      }

      if (!contractList.includes(args.contractName)) {
        this.error(`Path to contract ${args.contractName} does not exist: ${path.resolve("contracts", args.contractName)}`);
      }

      // remove unselected contracts from contractList to compile
      contractList = contractList.filter(contractName => contractName === args.contractName);
    } else {
      if (contractList.length === 0) {
        this.error("Nothing to compile");
      }
      for (const contractName of contractList) {
        console.log(`${contractName} contract is found`)
      }
    }

    const spinner = new Spinner();

    for (const contractName of contractList) {
      const contractInfo = config.contracts[contractName];
      const contractPath = path.resolve("contracts", contractName);

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
