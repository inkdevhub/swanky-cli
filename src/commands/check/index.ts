import { Command } from "@oclif/core";
import { Listr } from "listr2";
import {
  commandStdoutOrNull,
  ensureSwankyProject,
} from "../../lib/command-utils";
import fs = require("fs-extra");
import path = require("node:path");
import toml = require("toml");
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
              encoding: "utf-8",
            });

            const cargoToml = toml.parse(cargoTomlString);

            const inkDependencies = Object.entries(cargoToml.dependencies)
              .filter((dependency) => dependency[0].includes("ink_"))
              .map(([depName, depInfo]) => {
                const dependency = <Dependency>depInfo;
                return [depName, dependency.tag];
              });
            ctx.versions.contracts[contract] =
              Object.fromEntries(inkDependencies);
          }
        },
      },
      // {
      //   title: "Check cargo-contract",
      //   task: async (ctx) => {
      //     ctx.versions.tools.cargoContract = await commandStdoutOrNull(
      //       "cargo contract -V"
      //     );
      //   },
      // },
    ]);
    const context = await tasks.run({
      versions: { tools: {}, contracts: {} },
    });
    console.log(context);
  }
}

interface Dependency {
  tag: string;
}
