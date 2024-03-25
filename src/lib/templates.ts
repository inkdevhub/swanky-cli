import { readdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "node:path";
import { globby } from "globby";
import handlebars from "handlebars";
import { ensureDir, copy } from "fs-extra";
import { readFile, rename, rm, writeFile } from "fs/promises";
import { chopsticksConfig } from "../commands/node/chopsticks/init.js";
import { zombienetConfig } from "../commands/zombienet/init.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getTemplates() {
  const templatesPath = path.resolve(__dirname, "..", "templates");
  const contractTemplatesPath = path.resolve(templatesPath, "contracts");
  const zombienetTemplatesPath = path.resolve(templatesPath, "zombienet");
  const chopsticksTemplatesPath = path.resolve(templatesPath, "chopsticks");
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
    chopsticksTemplatesPath,
  };
}

export async function copyContractTemplateFiles(
  contractTemplatePath: string,
  contractName: string,
  projectPath: string
) {
  await copy(
    path.resolve(contractTemplatePath, "contract"),
    path.resolve(projectPath, "contracts", contractName)
  );
}

export async function copyZombienetTemplateFile(templatePath: string, configPath: string) {
  await ensureDir(configPath);
  await copy(
    path.resolve(templatePath, zombienetConfig),
    path.resolve(configPath, zombienetConfig)
  );
}

export async function copyChopsticksTemplateFile(templatePath: string, configPath: string) {
  await ensureDir(configPath);
  await copy(
    path.resolve(templatePath, chopsticksConfig),
    path.resolve(configPath, chopsticksConfig)
  );
}

export async function copyCommonTemplateFiles(templatesPath: string, projectPath: string) {
  await ensureDir(projectPath);
  const commonFiles = await globby(`*`, { cwd: templatesPath });
  await Promise.all(
    commonFiles.map(async (file) => {
      await copy(path.resolve(templatesPath, file), path.resolve(projectPath, file));
    })
  );
  await rename(path.resolve(projectPath, "gitignore"), path.resolve(projectPath, ".gitignore"));
  await rename(
    path.resolve(projectPath, "mocharc.json"),
    path.resolve(projectPath, ".mocharc.json")
  );
  await copy(path.resolve(templatesPath, "github"), path.resolve(projectPath, ".github"));
}

export async function processTemplates(projectPath: string, templateData: Record<string, string>) {
  const templateFiles = await globby(projectPath, {
    expandDirectories: { extensions: ["hbs"] },
  });

  for (const tplFilePath of templateFiles) {
    const rawTemplate = await readFile(tplFilePath, "utf8");
    const template = handlebars.compile(rawTemplate);
    const compiledFile = template(templateData);
    await rm(tplFilePath);
    await writeFile(tplFilePath.split(".hbs")[0], compiledFile);
  }
}
