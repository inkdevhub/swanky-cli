import { readdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getTemplates() {
  const templatesPath = path.resolve(__dirname, "..", "templates");
  const contractTemplatesPath = path.resolve(templatesPath, "contracts");
  const zombienetTemplatesPath = path.resolve(templatesPath, "zombienet");
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
    zombienetTemplatesPath,
  };
}
