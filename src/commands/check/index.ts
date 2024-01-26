import { Listr } from "listr2";
import { commandStdoutOrNull } from "../../lib/index.js";
import { SwankyConfig } from "../../types/index.js";
import { pathExistsSync, readJSON, writeJson } from "fs-extra/esm";
import { readFileSync } from "fs";
import path from "node:path";
import TOML from "@iarna/toml";
import semver from "semver";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { Flags } from "@oclif/core";
import chalk from "chalk";
import { cargoContractDeps } from "../../lib/cargoContractInfo.js";

interface Ctx {
  os: {
    platform: string;
    architecture: string;
  },
  versions: {
    tools: {
      rust?: string | null;
      cargo?: string | null;
      cargoNightly?: string | null;
      cargoDylint?: string | null;
      cargoContract?: string | null;
    };
    supportedInk?: string;
    missingTools: string[];
    contracts: Record<string, Record<string, string>>;
    node?: string | null;
  };
  swankyConfig?: SwankyConfig;
  mismatchedVersions?: Record<string, string>;
  looseDefinitionDetected: boolean;
}

export default class Check extends SwankyCommand<typeof Check> {
  static description = "Check installed package versions and compatibility";

  static flags = {
    file: Flags.string({
      char: "f",
      description: "File to write output to",
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Check);
    const tasks = new Listr<Ctx>([
      {
        title: "Check OS",
        task: async (ctx) => {
          ctx.os.platform = process.platform;
          ctx.os.architecture = process.arch;
          const supportedPlatforms = ["darwin", "linux"];
          const supportedArch = ["arm64", "x64"];

          if (!supportedPlatforms.includes(ctx.os.platform)) {
            throw new Error(`Platform ${ctx.os.platform} is not supported!`);
          }
          if (!supportedArch.includes(ctx.os.architecture)) {
            throw new Error(`Architecture ${ctx.os.architecture} is not supported!`);
          }
        },
        exitOnError: false,
      },
      {
        title: "Check Rust",
        task: async (ctx) => {
          ctx.versions.tools.rust = await commandStdoutOrNull("rustc --version");
          if (!ctx.versions.tools.rust) {
            throw new Error("Rust is not installed!");
          }
        },
        exitOnError: false,
      },
      {
        title: "Check cargo",
        task: async (ctx) => {
          ctx.versions.tools.cargo = await commandStdoutOrNull("cargo -V");
          if (!ctx.versions.tools.cargo) {
            throw new Error("Cargo is not installed!");
          }
        },
        exitOnError: false,
      },
      {
        title: "Check cargo nightly",
        task: async (ctx) => {
          ctx.versions.tools.cargoNightly = await commandStdoutOrNull("cargo +nightly -V");
          if (!ctx.versions.tools.cargoNightly) {
            throw new Error("Cargo nightly is not installed!");
          }
        },
        exitOnError: false,
      },
      {
        title: "Check cargo dylint",
        task: async (ctx) => {
          ctx.versions.tools.cargoDylint = await commandStdoutOrNull("cargo dylint -V");
          if (!ctx.versions.tools.cargoDylint) {
            throw new Error("Cargo dylint is not installed!");
          }
        },
        exitOnError: false,
      },
      {
        title: "Check cargo-contract",
        task: async (ctx) => {
          ctx.versions.tools.cargoContract = await commandStdoutOrNull("cargo contract -V");
          if (!ctx.versions.tools.cargoContract) {
            throw new Error("Cargo contract is not installed!");
          }
          const regex = /cargo-contract-contract (.*)-unknown-(.*)/;
          const match = ctx.versions.tools.cargoContract.match(regex);
          if (match) {
            ctx.versions.tools.cargoContract = match[1];
          } else {
            throw new Error("Cargo contract version not found!");
          }
        },
        exitOnError: false,
      },
      {
        title: "Check swanky node",
        task: async (ctx) => {
          ctx.versions.node = this.swankyConfig.node.version !== "" ? this.swankyConfig.node.version : null;
          if (!ctx.versions.node) {
            throw new Error("Swanky node version not found in swanky.config.json");
          }
        },
        exitOnError: false,
      },
      {
        title: "Read ink dependencies",
        task: async (ctx) => {
          const swankyConfig = await readJSON("swanky.config.json");
          ctx.swankyConfig = swankyConfig;

          for (const contract in swankyConfig.contracts) {
            const tomlPath = path.resolve(`contracts/${contract}/Cargo.toml`);
            const doesCargoTomlExist = pathExistsSync(tomlPath);
            if (!doesCargoTomlExist) {
              continue;
            }

            const cargoTomlString = readFileSync(tomlPath, {
              encoding: "utf8",
            });

            const cargoToml = TOML.parse(cargoTomlString);

            const inkDependencies = Object.entries(cargoToml.dependencies)
              .filter((dependency) => dependency[0].includes("ink"))
              .map(([depName, depInfo]) => {
                const dependency = depInfo as Dependency;
                return [depName, dependency.version ?? dependency.tag];
              });
            ctx.versions.contracts[contract] = Object.fromEntries(inkDependencies);
          }
        },
      },
      {
        title: "Verify ink version",
        skip: (ctx): boolean => {
          return !ctx.versions.tools.cargoContract;
        },
        task: async (ctx) => {
          let supportedInk = ctx.swankyConfig?.node.supportedInk;
          const versions = cargoContractDeps.get(ctx.versions.tools.cargoContract!);
          if (versions && semver.gt(versions[versions.length - 1], supportedInk!)) {
            supportedInk = versions[0];
          }

          ctx.versions.supportedInk = supportedInk;
          if (!supportedInk) {
            throw new Error("Supported ink version not found in swanky.config.json");
          }
        },
        exitOnError: false,
      },
      {
        title: "Verify ink dependencies",
        skip: (ctx) => !ctx.versions.supportedInk,
        task: async (ctx) => {
          const mismatched: Record<string, string> = {};
          Object.entries(ctx.versions.contracts).forEach(([contract, inkPackages]) => {
            Object.entries(inkPackages).forEach(([inkPackage, version]) => {
              if (semver.gt(version, ctx.versions.supportedInk!)) {
                mismatched[
                  `${contract}-${inkPackage}`
                  ] = `Version of ${inkPackage} (${version}) in ${contract} is higher than supported ink version (${ctx.versions.supportedInk})`;
              }

              if (!(version.startsWith("=") || version.startsWith("v"))) {
                ctx.looseDefinitionDetected = true;
              }
            });
          });

          ctx.mismatchedVersions = mismatched;
          if (Object.entries(mismatched).length > 0) {
            throw new Error("Ink version mismatch");
          }
        },
        exitOnError: false,
      },
      {
        title: "Check for missing tools",
        task: async (ctx) => {
          const missingTools: string[] = [];
          for (const [toolName, toolVersion] of Object.entries(ctx.versions.tools)) {
            if (!toolVersion) {
              missingTools.push(toolName);
            }
          }
          ctx.versions.missingTools = missingTools;
          if (Object.entries(missingTools).length > 0) {
            throw new Error("Missing tools");
          }
        },
        exitOnError: false,
      },
    ]);

    const context = await tasks.run({
      os: { platform: "", architecture: "" },
      versions: { tools: {}, missingTools: [], contracts: {} },
      looseDefinitionDetected: false,
    });

    Object.values(context.mismatchedVersions as any).forEach((mismatch) =>
      console.error(`[ERROR] ${mismatch as string}`),
    );
    if (context.looseDefinitionDetected) {
      console.log(`\n[WARNING]Some of the ink dependencies do not have a fixed version.
      This can lead to accidentally installing version higher than supported by the node.
      Please use "=" to install a fixed version (Example: "=3.0.1")
      `);
    }

    console.log(context.os);
    console.log(context.versions);

    const filePath = flags.file ?? null;
    if (filePath) {
      await this.spinner.runCommand(async () => {
        writeJson(filePath, [context.os, context.versions], { spaces: 2 });
      }, `Writing output to file ${chalk.yellowBright(filePath)}`);
    }
  }
}

interface Dependency {
  version?: string;
  tag?: string;
}
