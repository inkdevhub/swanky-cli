import { expect } from "chai";

import { checkCliDependencies } from "../../src/lib/tasks";

describe("Tasks", function () {
  describe("checkCliDependencies", function () {
    it("runs", async function () {
      const res = await checkCliDependencies();
      console.log(res);
    });
  });
});
