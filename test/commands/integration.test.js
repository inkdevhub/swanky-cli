const { expect, test } = require("@oclif/test");
const path = require("node:path");
const childProcess = require("node:child_process");
const rimraf = require("rimraf");
const execa = require("execa");
const commandExists = require("command-exists").sync;
const mockSpawn = require("mock-spawn");
const fs = require("fs-extra");
const dirName = "test-project";
var fakeSpawn = mockSpawn();
fakeSpawn.setDefault(fakeSpawn.simple(0, "fake child process"));

describe("integration test", () => {
  const dirPath = path.join(process.cwd(), dirName);
  // eslint-disable-next-line no-undef
  before(async () => {
    // Make sure cargo command exists, otherwise, test exit here.
    if (!commandExists("cargo")) {
      throw new Error("cargo command not exist");
    }

    if (!commandExists("grep")) {
      throw new Error("grep command not exist");
    }

    // Make sure cargo contract subcommand exist, otherwise quit test.
    try {
      execa.commandSync("cargo --list | grep contract", { shell: true });
    } catch {
      throw new Error("cargo contract not exist");
    }
  });
  // eslint-disable-next-line no-undef
  after(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    rimraf(dirPath, () => {});
  });

  // test
  //   .stdout()
  //   .command([
  //     "init",
  //     dirName,
  //     "--language",
  //     "ink",
  //     "--template",
  //     "flipper",
  //     "--node",
  //     "swanky",
  //   ])
  //   .timeout(60_000)
  //   .it("init", async (ctx) => {
  //     expect(ctx.stdout).to.contain("Successfully Initialized");

  //     const dirExists = await fs.pathExists(
  //       path.resolve(process.cwd(), dirName)
  //     );
  //     expect(dirExists).to.be.true;

  //     const nodeBinExists = await fs.pathExists(
  //       path.resolve(process.cwd(), dirName, "bin", "swanky-node")
  //     );
  //     expect(nodeBinExists).to.be.true;

  //     const contractTemplateExists = await fs.pathExists(
  //       path.resolve(
  //         process.cwd(),
  //         dirName,
  //         "contracts",
  //         "flipper",
  //         "Cargo.toml"
  //       )
  //     );
  //     expect(contractTemplateExists).to.be.true;
  //   });

  // describe("inside project directory", () => {
  //   // eslint-disable-next-line no-undef
  //   before(() => {
  //     process.chdir(dirPath);
  //   });

  //   test
  //     .stdout()
  //     .stub(childProcess, "spawn", fakeSpawn)
  //     .command(["compile"])
  //     .it("compile", async (ctx) => {
  //       expect(ctx.stdout).to.contain("Compile successful!");
  //     });

  //   test
  //     .stdout()
  //     .stub(childProcess, "execSync", () => "Fake node command executed")
  //     .command(["node start"])
  //     .it("node start", async (ctx) => {
  //       expect(ctx.stdout).to.contain("Node started");
  //     });

  // Disable for now, as mocking everything isn't really testing integration
  // test
  //   .stdout()
  //   .stub(fs, "readJSONSync", () => ({ name: "" }))
  //   .stub(fs, "readFileSync", () => "")
  //   .stub("DeployApi", () => ({}))
  //   .stub("api.start", () => ({}))
  //   .command([
  //     "deploy",
  //     "--account",
  //     "alice",
  //     "--contract",
  //     "flipper",
  //     "--gas",
  //     "1000000000",
  //     "--args",
  //     "true",
  //   ])
  //   .it("deploy", async (ctx) => {
  //     // expect(ctx.stdout).to.contain("Deploy successful!");
  //     // expect(ctx.stdout).to.contain(
  //     //   "Code hash: 0x5b768209ac0f0e18748436d1e7dc2693aa9dc5ceff988d504b7a8ff25470234a"
  //     // );
  //     // expect(ctx.stdout).to.contain(
  //     //   "Contract address: 5Da73Cjaz1LJJq7h7Z15LerwpJTcv14b44XJZkzC6ZokxK2s"
  //     // );
  //   });
  // });
});
