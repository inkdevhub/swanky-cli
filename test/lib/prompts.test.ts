import { expect } from "chai";
import { choice, email, name, pickTemplate } from "../../src/lib/prompts";

describe("Prompts", function () {
  describe("Template", function () {
    it("Throws on no arg", function () {
      expect(pickTemplate).to.throw("Template list is empty!");
    });
    it("Throws on empty array", function () {
      expect(() => pickTemplate([])).to.throw("Template list is empty!");
    });
    it("Returns a question object", function () {
      const templatesList = [
        { message: "Template 1", value: "temp1" },
        { message: "Template 2", value: "temp2" },
      ];
      const result = pickTemplate(templatesList);
      expect(result).to.have.nested.property("choices[0].message", "Template 1");
      expect(result).to.have.nested.property("choices[0].value", "temp1");
    });
  });
});
