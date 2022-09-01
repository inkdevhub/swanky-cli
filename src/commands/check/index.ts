import { Command } from "@oclif/core";
import { Listr } from "listr2";
import {
  commandStdoutOrNull,
  ensureSwankyProject,
} from "../../lib/command-utils";
import fs = require("fs-extra");
import path = require("node:path");
import toml = require("toml");
import semver = require("semver");
import { SwankyConfig } from "../init";

interface Ctx {
  versions: {
    tools: {
      rust?: string | null;
      cargo?: string | null;
      cargoNightly?: string | null;
      cargoDylint?: string | null;
      cargoContract?: string | null;
    };
    contracts: { [key: string]: { [key: string]: string } };
  };
  swankyConfig?: SwankyConfig;
  mismatchedVersions?: {
    [key: string]: string;
  };
  looseDefinitionDetected: boolean;
}

export default class Check extends Command {
  static description = "Check installed package versions and compatibility";

  static flags = {};

  static args = [];

  public async run(): Promise<void> {
    await ensureSwankyProject();
    const tasks = new Listr<Ctx>([
      {
        title: "Check Rust",
        task: async (ctx) => {
          ctx.versions.tools.rust = await commandStdoutOrNull(
            "rustc --version"
          );
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
          ctx.versions.tools.cargoNightly = await commandStdoutOrNull(
            "cargo +nightly -V"
          );
        },
      },
      {
        title: "Check cargo dylint",
        task: async (ctx) => {
          ctx.versions.tools.cargoDylint = await commandStdoutOrNull(
            "cargo dylint -V"
          );
        },
      },
      {
        title: "Check cargo-contract",
        task: async (ctx) => {
          ctx.versions.tools.cargoContract = await commandStdoutOrNull(
            "cargo contract -V"
          );
        },
      },
      {
        title: "Read ink dependencies",
        task: async (ctx) => {
          const swankyConfig = await fs.readJSON("swanky.config.json");
          ctx.swankyConfig = swankyConfig;
          const contractInkVersions = {};
          for (const contract of swankyConfig.contracts) {
            const tomlPath = path.resolve(`contracts/${contract}/Cargo.toml`);
            const doesCargoTomlExist = fs.pathExistsSync(tomlPath);
            if (!doesCargoTomlExist) {
              contractInkVersions[contract] = null;
              continue;
            }

            const cargoTomlString = fs.readFileSync(tomlPath, {
              encoding: "utf8",
            });

            const cargoToml = toml.parse(cargoTomlString);

            const inkDependencies = Object.entries(cargoToml.dependencies)
              .filter((dependency) => dependency[0].includes("ink_"))
              .map(([depName, depInfo]) => {
                const dependency = <Dependency>depInfo;
                return [depName, dependency.version || dependency.tag];
              });
            ctx.versions.contracts[contract] =
              Object.fromEntries(inkDependencies);
          }
        },
      },
      {
        title: "Verify ink version",
        task: async (ctx) => {
          const supportedInk = ctx.swankyConfig?.node.supportedInk;

          const mismatched = {};
          Object.entries(ctx.versions.contracts).forEach(
            ([contract, inkPackages]) => {
              Object.entries(inkPackages).forEach(([inkPackage, version]) => {
                if (semver.gt(version, supportedInk as string)) {
                  mismatched[
                    `${contract}-${inkPackage}`
                  ] = `Version of ${inkPackage} (${version}) in ${contract} is higher than supported ink version (${supportedInk})`;
                }

                if (!(version.charAt(0) === "=" || version.charAt(0) === "v")) {
                  ctx.looseDefinitionDetected = true;
                }
              });
            }
          );

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
      console.error(`[ERROR] ${mismatch}`)
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
