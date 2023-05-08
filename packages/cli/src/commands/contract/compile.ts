import { Args, Command, Flags } from "@oclif/core";
import path = require("node:path");
import Files from "fs";
import fs = require("fs-extra");
import {
  storeArtifacts,
  ensureSwankyProject,
  ContractData,
  getSwankyConfig,
  BuildData,
  Spinner,
  generateTypes,
} from "@astar-network/swanky-core";
import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { writeJSON, existsSync } from "fs-extra";

function getBuildCommandFor(
  language: ContractData["language"],
  contractPath: string,
  release: boolean,
) : ChildProcessWithoutNullStreams {
  if (language === "ink") {
    const args = ["contract", "build", "--manifest-path", `${contractPath}/Cargo.toml`]
    if (release) {
      args.push("--release")
    }
    return spawn(
      "cargo",
      args
    )
  }
  if (language === "ask") {
    const args = ["asc", "--config", `${contractPath}/asconfig.json`, `${contractPath}/index.ts`];
    if (release) {
      args.push("-O");
      args.push("--noAssert");
    }
    return spawn(
      "npx",
      args,
      { env: { ...process.env, ASK_CONFIG: `${contractPath}/askconfig.json` } }
    );
  }
  throw new Error("Unsupported language!");
}


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

    if (args.contractName === undefined && !flags.all) {
      this.error("No contracts were selected to compile")
    }

    await ensureSwankyProject();
    const config = await getSwankyConfig();

    const contractNames = [];
    if (flags.all) {
      for (const contractName of Object.keys(config.contracts)) {
        console.log(`${contractName} contract is found`);
        contractNames.push(contractName);
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

      // Depends on which language was used, the artifacts will be generated in different places at compile step.
      let artifactsPath: string;
      if (contractInfo.language === "ink") {
        artifactsPath = path.resolve("target", "ink", `${contractName}`);
      } else if (contractInfo.language === "ask") {
        artifactsPath = path.resolve(contractPath, "build");
      } else {
        throw new Error("Unsupported language!");
      }

      // Ask! build artifacts don't have `.contract` file which is just an combination of abi json and wasm blob
      // `.contract` will have .source.wasm field whose value is wasm blob hex representation.
      // Once Ask! support .contract file, this part will be removed.
      if (contractInfo.language == "ask") {
        // Unlike ink!, ask! names metadata file `metadata.json`. So, renaming it to contract name here needed for following tasks.
        await fs.copyFile(
          path.resolve(artifactsPath, "metadata.json"),
          path.resolve(artifactsPath, `${contractName}.json`),
        )
        const contract = JSON.parse(Files.readFileSync(path.resolve(artifactsPath, `${contractName}.json`)).toString());
        const wasmBuf = Files.readFileSync(path.resolve(artifactsPath, `${contractName}.wasm`));
        const prefix = "0x"
        contract.source.wasm = prefix + wasmBuf.toString("hex");
        fs.writeFileSync(path.resolve(artifactsPath, `${contractName}.contract`), JSON.stringify(contract));
        await fs.remove(path.resolve(artifactsPath, `${contractName}.wasm`));
      }

      const typedContractDestPath = path.resolve("test", contractName, "typedContract");
      await spinner.runCommand(
        async () => await generateTypes(artifactsPath, contractName, typedContractDestPath),
        `Generating ${contractName} contract ts types`,
        `${contractName} contract's TS types Generated successfully`
      );

      const buildData = (await spinner.runCommand(async () => {
        return storeArtifacts(artifactsPath, contractInfo.name);
      }, "Storing artifacts")) as BuildData;

      contractInfo.build = buildData;
    }

    await spinner.runCommand(async () => {
      await writeJSON(path.resolve("swanky.config.json"), config, {
        spaces: 2,
      });
    }, "Writing config");
  }
}
