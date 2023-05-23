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
      const templatesList = ["TemplateOne", "TemplateTwo"];
      const result = pickTemplate(templatesList);
      console.log("AAAAAA", result);
      expect(result).to.have.nested.property("choices[0]", "TemplateOne");
      expect(result).to.have.nested.property("choices[1]", "TemplateTwo");
    });
  });

  describe("Name", function () {
    describe("Default call", function () {
      const result = name("subject");
      it("Uses subject in the name", function () {
        expect(result).to.have.property("name", "subjectName");
      });
      it("Uses default question", function () {
        expect(result).to.have.property("message", "What name should we use for subject?");
      });
    });
    describe("Optional params", function () {
      const result = name("subject", () => "myName", "What's your name?");
      it("Uses passed in initial value", function () {
        expect(result.default()).to.eq("myName");
      });
      it("Uses passed in question", function () {
        expect(result).to.have.property("message", "What's your name?");
      });
    });
  });

  describe("Email", function () {
    describe("Default call", function () {
      const result = email();
      it("Uses default question", function () {
        expect(result).to.have.property("message", "What is your email?");
      });
      it("Has no default value", function () {
        expect(result).to.not.have.property("default");
      });
    });

    describe("Optional params", function () {
      const question = "What yer email be?";
      const initial = "my@e.mail";
      const result = email(initial, question);
      it("Uses passed in intial value", function () {
        expect(result).to.have.property("default", initial);
      });
      it("Uses passed in question", function () {
        expect(result).to.have.property("message", question);
      });
    });
  });

  describe("Choice", function () {
    const subject = "Who";
    const questionText = "What?";
    const result = choice(subject, questionText);

    it("Returns a correct question", function () {
      expect(result).to.have.property("name", subject);
      expect(result).to.have.property("message", questionText);
    });
  });
});
