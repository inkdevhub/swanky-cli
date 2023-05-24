import { readdirSync } from "fs";
import path from "node:path";

export function getTemplates() {
  const templatesPath = path.resolve(__dirname, "templates");
  const contractTemplatesPath = path.resolve(templatesPath, "contracts");
  const fileList = readdirSync(contractTemplatesPath, {
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
