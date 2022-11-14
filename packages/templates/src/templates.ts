import { readdirSync } from "fs-extra";
import path = require("node:path");

export function getTemplates(language: "ink" | "ask") {
  const templatesPath = path.resolve(__dirname, "../templates");
  const contractTemplatesPath = path.resolve(templatesPath, "contracts", language);
  const fileList = readdirSync(contractTemplatesPath, {
    withFileTypes: true,
  });
  const contractTemplatesQueryPairs = fileList
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      message: entry.name,
      value: entry.name,
    }));
  const contractTemplateNames = contractTemplatesQueryPairs.map((pair) => pair.value);

  return {
    templatesPath,
    contractTemplatesPath,
    contractTemplatesQueryPairs,
    contractTemplateNames,
  };
}

export function getAllTemplateNames() {
  return [
    ...getTemplates("ask").contractTemplateNames,
    ...getTemplates("ink").contractTemplateNames,
  ];
}
