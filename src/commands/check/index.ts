import { Listr } from "listr2";
import { commandStdoutOrNull } from "../../lib/index.js";
import { SwankyConfig } from "../../types/index.js";
import { pathExistsSync, readJSON } from "fs-extra/esm";
import { readFileSync } from "fs";
import path from "node:path";
import TOML from "@iarna/toml";
import semver from "semver";
import { SwankyCommand } from "../../lib/swankyCommand.js";

interface Ctx {
  versions: {
    tools: {
      rust?: string | null;
      cargo?: string | null;
      cargoNightly?: string | null;
      cargoDylint?: string | null;
      cargoContract?: string | null;
    };
    contracts: Record<string, Record<string, string>>;
    node?: string | null;
  };
  swankyConfig?: SwankyConfig;
  mismatchedVersions?: Record<string, string>;
  looseDefinitionDetected: boolean;
}

export default class Check extends SwankyCommand<typeof Check> {
  static description = "Check installed package versions and compatibility";

  public async run(): Promise<void> {
    const tasks = new Listr<Ctx>([
      {
        title: "Check Rust",
        task: async (ctx) => {
          ctx.versions.tools.rust = await commandStdoutOrNull("rustc --version");
        },
      },
      {
        title: "Check cargo",
        task: async (ctx) => {
          ctx.versions.tools.cargo = await commandStdoutOrNull("cargo -V");
        },
      },
      {
        title: "Check cargo nightly",
        task: async (ctx) => {
          ctx.versions.tools.cargoNightly = await commandStdoutOrNull("cargo +nightly -V");
        },
      },
      {
        title: "Check cargo dylint",
        task: async (ctx) => {
          ctx.versions.tools.cargoDylint = await commandStdoutOrNull("cargo dylint -V");
        },
      },
      {
        title: "Check cargo-contract",
        task: async (ctx) => {
          ctx.versions.tools.cargoContract = await commandStdoutOrNull("cargo contract -V");
        },
      },
      {
        title: "Check swanky node",
        task: async (ctx) => {
          ctx.versions.node = this.swankyConfig.node.version !== "" ? this.swankyConfig.node.version : null;
        },
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
              .filter((dependency) => dependency[0].includes("ink_"))
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
        task: async (ctx) => {
          const supportedInk = ctx.swankyConfig?.node.supportedInk;

          const mismatched: Record<string, string> = {};
          Object.entries(ctx.versions.contracts).forEach(([contract, inkPackages]) => {
            Object.entries(inkPackages).forEach(([inkPackage, version]) => {
              if (semver.gt(version, supportedInk!)) {
                mismatched[
                  `${contract}-${inkPackage}`
                ] = `Version of ${inkPackage} (${version}) in ${contract} is higher than supported ink version (${supportedInk})`;
              }

              if (!(version.startsWith("=") || version.startsWith("v"))) {
                ctx.looseDefinitionDetected = true;
              }
            });
          });

          ctx.mismatchedVersions = mismatched;
        },
      },
    ]);
    const context = await tasks.run({
      versions: { tools: {}, contracts: {} },
      looseDefinitionDetected: false,
    });
    console.log(context.versions);
    Object.values(context.mismatchedVersions as any).forEach((mismatch) =>
      console.error(`[ERROR] ${mismatch as string}`)
    );
    if (context.looseDefinitionDetected) {
      console.log(`\n[WARNING]Some of the ink dependencies do not have a fixed version.
      This can lead to accidentally installing version higher than supported by the node.
      Please use "=" to install a fixed version (Example: "=3.0.1")
      `);
    }
  }
}

interface Dependency {
  version?: string;
  tag?: string;
}
