const { expect, test } = require("@oclif/test");
const fs = require("fs-extra");
const path = require("node:path");
const sh = require("shelljs");
const rimraf = require("rimraf");
const commandExists = require("command-exists").sync;

sh.set("-ev");

const dirName = "test-project";

describe("e2e test", () => {
  const dirPath = path.join(process.cwd(), dirName);
  before(() => {
    // Make sure cargo command exists, otherwise, test exit here.
    if (!commandExists("cargo")) {
      throw new Error("cargo command not exist. quit test.");
    }

    if (!commandExists("grep")) {
      throw new Error("grep command not exist. quit test.");
    }

    // Make sure cargo contract subcommand exist, otherwise quit test.
    // Quit if Exit code 1.
    sh.exec("cargo --list | grep contract");
  })
  after(() => {
    rimraf(dirPath, () => {});
  })

  test
    .stdout()
    .command([
      "init",
      dirName,
      "--language",
      "ink",
      "--template",
      "flipper",
      "--node",
      "swanky",
    ])
    .it("init", async (ctx) => {
      // TODO: ask CLI to emit meaningful stdout, and use it here for checking
      expect(ctx.stdout).to.contain("Installing");

      const dirExists = await fs.pathExists(
        path.resolve(process.cwd(), dirName)
      );
      expect(dirExists).to.be.true;

      const nodeBinExists = await fs.pathExists(
        path.resolve(process.cwd(), dirName, "bin", "swanky-node")
      );
      expect(nodeBinExists).to.be.true;

      const contractTemplateExists = await fs.pathExists(
        path.resolve(
          process.cwd(),
          dirName,
          "contracts",
          "flipper",
          "Cargo.toml"
        )
      );
      expect(contractTemplateExists).to.be.true;
    });

  // following command need to be executed in the project root
  test
    .stdout({ print: true })
    .stub()
    // .command(["node", "start"])
    .it("node start", async (ctx) => {
      console.log(ctx.stdout);
      console.log("here!");
    });
});
