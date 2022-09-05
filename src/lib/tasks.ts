import execa from "execa";
import task from "tasuku";
import { ensureDir, copyFileSync, rename } from "fs-extra";
import path from "node:path";

export async function checkCliDependencies(dependencyList: { dependencyName: string; versionCommand: string }[]) {
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
