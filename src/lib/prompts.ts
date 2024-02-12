import { Answers, ListQuestion, Question } from "inquirer";
import { ConfigError } from "./errors.js";

export function pickTemplate(templateList: string[]): ListQuestion<Answers> {
  if (!templateList?.length) throw new ConfigError("Template list is empty!");
  return {
    name: "contractTemplate",
    type: "list",
    choices: templateList,
    message: "Which contract template should we use initially?",
  };
}

export function pickNodeVersion(nodeVersions: string[]): ListQuestion<Answers> {
  if (!nodeVersions?.length) throw new ConfigError("Node version list is empty!");
  return {
    name: "version",
    type: "list",
    choices: nodeVersions,
    message: "Which node version should we use?",
  };
}

export function name(
  subject: string,
  initial?: (answers: Answers) => string,
  questionText?: string
): Question<Answers> {
  const question: Question = {
    name: `${subject}Name`,
    type: "input",
    message: questionText ?? `What name should we use for ${subject}?`,
  };
  if (initial) question.default = initial;
  return question;
}

export function email(initial?: string, questionText?: string): Question<Answers> {
  const question: Question = {
    name: "email",
    type: "input",
    message: questionText ?? "What is your email?",
  };
  if (initial) question.default = initial;
  return question;
}

export function choice(subject: string, questionText: string): Question<Answers> {
  return {
    name: subject,
    type: "confirm",
    message: questionText,
  };
}
