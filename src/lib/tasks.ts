import execa from "execa";
import task from "tasuku";
import { ensureDir, copyFileSync, rename, copy, readFile, rm, writeFile } from "fs-extra";
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
    setTitle("Dependencies OK!");
    nestedTasks.clear();
  });
}

export async function copyCoreTemplates(templatesPath: string, projectName: string) {
  return task("Copying core templates", async () => {
    await ensureDir(projectName);
    // TODO: use glob
    const files = ["gitignore", "package.json.tpl", "tsconfig.json"];
    files.forEach((file) => {
      copyFileSync(path.resolve(templatesPath, file), path.resolve(projectName, file));
    });
    await rename(path.resolve(projectName, "gitignore"), path.resolve(projectName, ".gitignore"));
  });
}

export async function copyContractTemplates(
  templatePath: string,
  projectPath: string,
  contractName: string
) {
  return task("Copying contract templates", async () => {
    await copy(templatePath, path.resolve(projectPath, "contracts", contractName));
  });
}

export async function processTemplates(
  templatePath: string,
  projectPath: string,
  templateData: Record<string, string>
) {
  if (!templatePath) throw new Error("No template selected!");
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
}
