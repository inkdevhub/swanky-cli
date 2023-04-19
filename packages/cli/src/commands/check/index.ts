import { BaseCommand } from "../../lib/baseCommand";
import { Listr } from "listr2";
import { commandStdoutOrNull, ensureSwankyProject, SwankyConfig } from "@astar-network/swanky-core";
import fs = require("fs-extra");
import path = require("node:path");
import toml = require("toml");
import semver = require("semver");

interface Ctx {
  platform: string;
  architecture: string;
  versions: {
    tools: {
      rust?: string | null;
      cargo?: string | null;
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

export default class Check extends BaseCommand<typeof Check>  {
  static description = "Check installed package versions and compatibility";

  public async run(): Promise<void> {
    await ensureSwankyProject();
    const tasks = new Listr<Ctx>([
      {
        title: "Check platform and architecture",
        task: async (ctx) => {
          ctx.platform = process.platform;
          ctx.architecture = process.arch;
        },
      },
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
        title: "Check cargo-contract",
        task: async (ctx) => {
          ctx.versions.tools.cargoContract = await commandStdoutOrNull("cargo contract -V");
        },
      },
      {
        title: "Read ink dependencies",
        task: async (ctx) => {
          ctx.swankyConfig = this.swankyConfig;
          const contractInkVersions = {};
          for (const contract in this.swankyConfig.contracts) {
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
              .filter((dependency) => dependency[0].includes("ink"))
              .map(([depName, depInfo]) => {
                const dependency = <Dependency>depInfo;
                return [depName, dependency.version || dependency.tag];
              });
            ctx.versions.contracts[contract] = Object.fromEntries(inkDependencies);
          }
        },
      },
      {
        title: "Verify ink version",
        task: async (ctx) => {
          const supportedInk = ctx.swankyConfig?.node.supportedInk;

          const mismatched = {};
          Object.entries(ctx.versions.contracts).forEach(([contract, inkPackages]) => {
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
          });

          ctx.mismatchedVersions = mismatched;
        },
      },
    ]);

    const context = await tasks.run({
      platform: "",
      architecture: "",
      versions: { tools: {}, contracts: {} },
      looseDefinitionDetected: false,
    });

    console.log("Platform: " + context.platform);
    console.log("Architecture: " + context.architecture);
    console.log(context.versions);

    const supportedPlatform = ["darwin", "linux"];
    const supportedOS = ["arm64", "x64"];
    if (!supportedPlatform.includes(context.platform)) {
      console.error("[ERROR] Unsupported platform: " + context.platform);
    }
    if (!supportedOS.includes(context.architecture)) {
      console.error("[ERROR] Unsupported architecture: " + context.architecture);
    }

    Object.values(context.mismatchedVersions as any).forEach((mismatch) =>
      console.error(`[ERROR] ${mismatch}`)
    );
    if (context.looseDefinitionDetected) {
      console.log(`\n[WARNING] Some of the ink dependencies do not have a fixed version.
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
