const { expect, test } = require("@oclif/test");
const fs = require("fs-extra");
const path = require("node:path");
const childProcess = require("node:child_process");
const rimraf = require("rimraf");
const execa = require("execa");
const commandExists = require("command-exists").sync;

const dirName = "test-project";

const contractInstantiateStubStr = `
======
        Event Balances ➜ Withdraw
          who: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
          amount: 4908702745
        Event System ➜ NewAccount
          account: 5Da73Cjaz1LJJq7h7Z15LerwpJTcv14b44XJZkzC6ZokxK2s
        Event Balances ➜ Endowed
          account: 5Da73Cjaz1LJJq7h7Z15LerwpJTcv14b44XJZkzC6ZokxK2s
          free_balance: 82000000000
        Event Balances ➜ Transfer
          from: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
          to: 5Da73Cjaz1LJJq7h7Z15LerwpJTcv14b44XJZkzC6ZokxK2s
          amount: 82000000000
        Event Balances ➜ Reserved
          who: 5Da73Cjaz1LJJq7h7Z15LerwpJTcv14b44XJZkzC6ZokxK2s
          amount: 82000000000
        Event Balances ➜ Reserved
          who: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
          amount: 48759000000000
        Event Contracts ➜ CodeStored
          code_hash: 0x5b768209ac0f0e18748436d1e7dc2693aa9dc5ceff988d504b7a8ff25470234a
        Event Contracts ➜ Instantiated
          deployer: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
          contract: 5Da73Cjaz1LJJq7h7Z15LerwpJTcv14b44XJZkzC6ZokxK2s
        Event Balances ➜ Transfer
          from: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
          to: 5Da73Cjaz1LJJq7h7Z15LerwpJTcv14b44XJZkzC6ZokxK2s
          amount: 2000000000
        Event Balances ➜ Reserved
          who: 5Da73Cjaz1LJJq7h7Z15LerwpJTcv14b44XJZkzC6ZokxK2s
          amount: 2000000000
        Event Balances ➜ Deposit
          who: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
          amount: 845951854
        Event System ➜ ExtrinsicSuccess
          dispatch_info: DispatchInfo { weight: 3937728146, class: Normal, pays_fee: Yes }

    Code hash 0x5b768209ac0f0e18748436d1e7dc2693aa9dc5ceff988d504b7a8ff25470234a
     Contract 5Da73Cjaz1LJJq7h7Z15LerwpJTcv14b44XJZkzC6ZokxK2s

======
`;

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
    .timeout(60_000)
    .it("init", async (ctx) => {
      expect(ctx.stdout).to.contain("Successfully Initialized");

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

  describe("inside project directory", () => {
    // eslint-disable-next-line no-undef
    before(() => {
      process.chdir(dirPath);
    });

    test
      .stdout()
      // .stub(ChildProcess, "spawn", fakeSpawn)
      .command(["compile"])
      .it("compile", async (ctx) => {
        expect(ctx.stdout).to.contain("Compile successful!");
      });

    test
      .stdout()
      .stub(childProcess, "execSync", () => "Fake node command executed")
      .command(["node start"])
      .it("node start", async (ctx) => {
        expect(ctx.stdout).to.contain("Node started");
      });

    test
      .stdout()
      .stub(childProcess, "execSync", () => {
        var buffer = Buffer.from(contractInstantiateStubStr);
        return buffer;
      })
      .command(["deploy", "--gas", "1000000000", "--args", "true"])
      .it("deploy", async (ctx) => {
        expect(ctx.stdout).to.contain("Deploy successful!");
        expect(ctx.stdout).to.contain(
          "Code hash: 0x5b768209ac0f0e18748436d1e7dc2693aa9dc5ceff988d504b7a8ff25470234a"
        );
        expect(ctx.stdout).to.contain(
          "Contract address: 5Da73Cjaz1LJJq7h7Z15LerwpJTcv14b44XJZkzC6ZokxK2s"
        );
      });
  });
});
