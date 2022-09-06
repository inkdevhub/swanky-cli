import execa from "execa";
import task from "tasuku";
import { ensureDir, rename, copy, readFile, rm, writeFile, copySync } from "fs-extra";
import path from "node:path";
import globby from "globby";
import handlebars from "handlebars";
export async function checkCliDependencies(
  dependencyList: { dependencyName: string; versionCommand: string }[]
) {
  return task("Checking dependencies", async ({ task, setTitle }) => {
    const nestedTasks = await task.group(
      (task) =>
        dependencyList.map(({ dependencyName, versionCommand }) =>
          task(`Checking ${dependencyName}`, async ({ setTitle }) => {
            await execa.command(versionCommand);
            setTitle(`${dependencyName} OK!`);
          })
        ),
      { concurrency: 3 }
    );
    setTitle("Dependencies [OK]");
    nestedTasks.clear();
  });
}

export async function copyTemplateFiles(
  templatesPath: string,
  contractTemplatePath: string,
  contractName: string,
  projectPath: string
) {
  return task("Copying template files", async ({ setTitle }) => {
    await ensureDir(projectPath);
    const commonFiles = await globby(`*`, { cwd: templatesPath });
    await Promise.all(
      commonFiles.map(async (file) => {
        await copy(path.resolve(templatesPath, file), path.resolve(projectPath, file));
      })
    );
    await rename(path.resolve(projectPath, "gitignore"), path.resolve(projectPath, ".gitignore"));
    await copy(contractTemplatePath, path.resolve(projectPath, "contracts", contractName));
    setTitle("Template files copied [OK]");
  });
}

export async function processTemplates(projectPath: string, templateData: Record<string, string>) {
  return task("Processing templates", async ({ setTitle }) => {
    const templateFiles = await globby(projectPath, {
      expandDirectories: { extensions: ["tpl"] },
    });
    templateFiles.forEach(async (tplFilePath) => {
      const rawTemplate = await readFile(tplFilePath, "utf8");
      const template = handlebars.compile(rawTemplate);
      const compiledFile = template(templateData);
      await rm(tplFilePath);
      await writeFile(tplFilePath.split(".tpl")[0], compiledFile);
    });
    setTitle("Templates processed [OK]");
  });
}
