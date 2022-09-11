import { expect } from "chai";
import { Spinner } from "../../src/lib/spinner";

import { checkCliDependencies } from "../../src/lib/tasks";

describe("Tasks", function () {
  describe("checkCliDependencies", function () {
    it("runs", async function () {
      const res = await checkCliDependencies(new Spinner());
      console.log(res);
    });
  });
});
