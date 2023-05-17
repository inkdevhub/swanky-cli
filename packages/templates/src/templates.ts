import { readdir } from "fs-extra";
import path = require("node:path");

export async function getTemplates(language: "ink" = "ink") {
  const templatesPath = path.resolve(__dirname, "templates");
  const contractTemplatesPath = path.resolve(templatesPath, "contracts", language);
  const fileList = await readdir(contractTemplatesPath, {
    withFileTypes: true,
  });
  const contractTemplatesList = fileList
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  return {
    templatesPath,
    contractTemplatesPath,
    contractTemplatesList,
  };
}
