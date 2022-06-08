const { expect, test } = require("@oclif/test");
const fs = require("fs-extra");
const path = require("node:path");

describe("init", () => {
  test
    .stdout()
    .command([
      "init",
      "dirName",
      "--language",
      "ink",
      "--template",
      "psp22",
      "--node",
      "swanky",
    ])
    .stdout({ print: true })
    .it("runs init", async (ctx) => {
      console.log("AAAA", process.cwd());
      const isNodeThere = await fs.pathExists(
        path.resolve(process.cwd(), "dirName", "bin", "swanky-node")
      );
      expect(isNodeThere).to.be.true;
    });
});
