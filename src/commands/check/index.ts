import { Listr } from "listr2";
import { commandStdoutOrNull, extractCargoContractVersion } from "../../lib/index.js";
import { SwankyConfig } from "../../types/index.js";
import { pathExistsSync, readJSON, writeJson } from "fs-extra/esm";
import { readFileSync } from "fs";
import path from "node:path";
import TOML from "@iarna/toml";
import semver from "semver";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { Flags } from "@oclif/core";
import chalk from "chalk";
import { CARGO_CONTRACT_INK_DEPS } from "../../lib/cargoContractInfo.js";
import { CLIError } from "@oclif/core/lib/errors/index.js";
import Warn = CLIError.Warn;

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
    swankyNode: string | null;
  };
  swankyConfig?: SwankyConfig;
  mismatchedVersions: Record<string, string>;
  looseDefinitionDetected: boolean;
}

export default class Check extends SwankyCommand<typeof Check> {
  static description = "Check installed package versions and compatibility";

  static flags = {
    print: Flags.string({
      char: "o",
      description: "File to write output to",
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Check);
    const swankyNodeVersion = this.swankyConfig.node.version;
    const isSwankyNodeInstalled = !!swankyNodeVersion;
    const anyContracts = Object.keys(this.swankyConfig?.contracts).length > 0;
    const tasks = new Listr<Ctx>([
      {
        title: "Check OS",
        task: async (ctx, task) => {
          ctx.os.platform = process.platform;
          ctx.os.architecture = process.arch;
          const supportedPlatforms = ["darwin", "linux"];
          const supportedArch = ["arm64", "x64"];

          if (!supportedPlatforms.includes(ctx.os.platform)) {
            throw new Error(`Platform ${ctx.os.platform} is not supported`);
          }
          if (!supportedArch.includes(ctx.os.architecture)) {
            throw new Error(`Architecture ${ctx.os.architecture} is not supported`);
          }

          task.title = `Check OS: '${ctx.os.platform}-${ctx.os.architecture}'`;
        },
        exitOnError: false,
      },
      {
        title: "Check Rust",
        task: async (ctx, task) => {
          ctx.versions.tools.rust = commandStdoutOrNull("rustc --version")?.match(/rustc (.*) \((.*)/)?.[1];
          if (!ctx.versions.tools.rust) {
            throw new Error("Rust is not installed");
          }
          task.title = `Check Rust: ${ctx.versions.tools.rust}`;
        },
        exitOnError: false,
      },
      {
        title: "Check cargo",
        task: async (ctx, task) => {
          ctx.versions.tools.cargo = commandStdoutOrNull("cargo -V")?.match(/cargo (.*) \((.*)/)?.[1];
          if (!ctx.versions.tools.cargo) {
            throw new Error("Cargo is not installed");
          }
          task.title = `Check cargo: ${ctx.versions.tools.cargo}`;
        },
        exitOnError: false,
      },
      {
        title: "Check cargo nightly",
        task: async (ctx, task) => {
          ctx.versions.tools.cargoNightly = commandStdoutOrNull("cargo +nightly -V")?.match(/cargo (.*)-nightly \((.*)/)?.[1];
          if (!ctx.versions.tools.cargoNightly) {
            throw new Error("Cargo nightly is not installed");
          }
          task.title = `Check cargo nightly: ${ctx.versions.tools.cargoNightly}`;
        },
        exitOnError: false,
      },
      {
        title: "Check cargo dylint",
        task: async (ctx, task) => {
          ctx.versions.tools.cargoDylint = commandStdoutOrNull("cargo dylint -V")?.match(/cargo-dylint (.*)/)?.[1];
          if (!ctx.versions.tools.cargoDylint) {
            throw new Warn("Cargo dylint is not installed");
          }
          task.title = `Check cargo dylint: ${ctx.versions.tools.cargoDylint}`;
        },
        exitOnError: false,
      },
      {
        title: "Check cargo-contract",
        task: async (ctx, task) => {
          const cargoContractVersion = extractCargoContractVersion();
          ctx.versions.tools.cargoContract = cargoContractVersion;
          if (!cargoContractVersion) {
            throw new Error("Cargo contract is not installed");
          }
          task.title = `Check cargo-contract: ${cargoContractVersion}`;
        },
        exitOnError: false,
      },
      {
        title: "Check swanky node",
        task: async (ctx) => {
          ctx.versions.swankyNode = this.swankyConfig.node.version !== "" ? this.swankyConfig.node.version : null;
        },
      },
      {
        title: "Read ink dependencies",
        enabled: anyContracts,
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
              .filter(([depName]) => /^ink($|_)/.test(depName))
              .map(([depName, depInfo]) => {
                const dependency = depInfo as Dependency;
                return [depName, dependency.version ?? dependency.tag];
              });
            ctx.versions.contracts[contract] = Object.fromEntries(inkDependencies);
          }
        },
      },
      {
        title: "Verify ink version compatibility with Swanky node",
        skip: (ctx) => Object.keys(ctx.versions.contracts).length === 0,
        enabled: anyContracts && isSwankyNodeInstalled,
        task: async (ctx) => {
          const supportedInk = ctx.swankyConfig!.node.supportedInk;
          const mismatched: Record<string, string> = {};
          Object.entries(ctx.versions.contracts).forEach(([contract, inkDependencies]) => {
            Object.entries(inkDependencies).forEach(([depName, version]) => {
              if (semver.gt(version, supportedInk)) {
                mismatched[
                  `${contract}-${depName}`
                ] = `Version of ${depName} (${version}) in ${chalk.yellowBright(contract)} is higher than supported ink version (${supportedInk}) in current Swanky node version (${swankyNodeVersion}). A Swanky node update can fix this warning.`;
              }

              if (version.startsWith(">") || version.startsWith("<") || version.startsWith("^") || version.startsWith("~")) {
                ctx.looseDefinitionDetected = true;
              }
            });
          });

          ctx.mismatchedVersions = mismatched;
          if (Object.entries(mismatched).length > 0) {
            throw new Warn("Ink versions in contracts don't match the Swanky node's supported version.");
          }
        },
        exitOnError: false,
      },
      {
        title: "Verify cargo contract compatibility",
        skip: (ctx) => !ctx.versions.tools.cargoContract,
        enabled: anyContracts,
        task: async (ctx) => {
          const cargoContractVersion = ctx.versions.tools.cargoContract!;
          const dependencyIdx = CARGO_CONTRACT_INK_DEPS.findIndex((dep) =>
            semver.satisfies(cargoContractVersion.replace(/-.*$/, ""), `>=${dep.minCargoContractVersion}`)
          );

          if (dependencyIdx === -1) {
            throw new Warn(`cargo-contract version ${cargoContractVersion} is not supported`);
          }
      
          const validInkVersionRange = CARGO_CONTRACT_INK_DEPS[dependencyIdx].validInkVersionRange;
          const minCargoContractVersion = dependencyIdx === 0
            ? CARGO_CONTRACT_INK_DEPS[dependencyIdx].minCargoContractVersion
            : CARGO_CONTRACT_INK_DEPS[dependencyIdx - 1].minCargoContractVersion

          const mismatched: Record<string, string> = {};
          Object.entries(ctx.versions.contracts).forEach(([contract, inkPackages]) => {
            Object.entries(inkPackages).forEach(([inkPackage, version]) => {
              if (!semver.satisfies(version, validInkVersionRange)) {
                mismatched[
                  `${contract}-${inkPackage}`
                ] = `Version of ${inkPackage} (${version}) in ${chalk.yellowBright(contract)} requires cargo-contract version >=${minCargoContractVersion}, but version ${cargoContractVersion} is installed`;
              }
            });
          });

          ctx.mismatchedVersions = { ...ctx.mismatchedVersions, ...mismatched };
          if (Object.entries(mismatched).length > 0) {
            throw new Warn("cargo-contract version mismatch");
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
              if (toolName === "cargoDylint") this.warn("Cargo dylint is not installed");
              else this.error(`${toolName} is not installed`);
            }
          }
          ctx.versions.missingTools = missingTools;
          if (Object.entries(missingTools).length > 0) {
            throw new Warn(`Missing tools: ${missingTools.join(", ")}`);
          }
        },
        exitOnError: false,
      },
    ]);

    const context = await tasks.run({
      os: { platform: "", architecture: "" },
      versions: {
        tools: {},
        missingTools: [],
        contracts: {},
        swankyNode: swankyNodeVersion || null,
      },
      looseDefinitionDetected: false,
      mismatchedVersions: {}
    });

    Object.values(context.mismatchedVersions).forEach((mismatch) => this.warn(mismatch));

    if (context.looseDefinitionDetected) {
      this.warn(`Some of the ink dependencies do not have a fixed version.
      This can lead to accidentally installing version higher than supported by the node.
      Please use "=" to install a fixed version (Example: "=3.0.1")
      `);
    }

    const output = {
      ...context.os,
      ...context.versions
    }

    const filePath = flags.print;
    if (filePath !== undefined) {
      await this.spinner.runCommand(async () => {
        writeJson(filePath, output, { spaces: 2 });
      }, `Writing output to file ${chalk.yellowBright(filePath)}`);
    }
  }
}

interface Dependency {
  version?: string;
  tag?: string;
}
