import execa from "execa";
import task from "tasuku";
import { ensureDir, rename, copy, readFile, rm, writeFile, mkdir, remove } from "fs-extra";
import path from "node:path";
import globby from "globby";
import handlebars from "handlebars";
import { DownloadEndedStats, DownloaderHelper } from "node-downloader-helper";
import process from "node:process";
import { nodeInfo } from "./nodeInfo";
import decompress from "decompress";
export async function checkCliDependencies() {
  const dependencyList = [
    { dependencyName: "rust", versionCommand: "rustc --version" },
    { dependencyName: "cargo", versionCommand: "cargo -V" },
    {
      dependencyName: "cargo contract",
      versionCommand: "cargo contract -V",
    },
  ];
  return task("Checking CLI dependencies", async ({ task, setTitle }) => {
    for (const dep of dependencyList) {
      task(`Checking ${dep.dependencyName}`, async ({ setTitle }) => {
        await execa.command(dep.versionCommand);
        setTitle(`${dep.dependencyName} OK!`);
      });
    }
    setTitle("Dependencies OK!");
  });
  // return task.group((task) =>
  //   dependencyList.map(({ dependencyName, versionCommand }) =>
  //     task(`Checking ${dependencyName}`, async ({ setTitle }) => {
  //       await execa.command(versionCommand);
  //       setTitle(`${dependencyName} OK!`);
  //     })
  //   )
  // );
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
    setTitle("Template files copied");
  });
}

export async function processTemplates(projectPath: string, templateData: Record<string, string>) {
  return task("Processing templates", async ({ setTitle }) => {
    const templateFiles = await globby(projectPath, {
      expandDirectories: { extensions: ["tpl"] },
    });
    await Promise.all(
      templateFiles.map(async (tplFilePath) => {
        const rawTemplate = await readFile(tplFilePath, "utf8");
        const template = handlebars.compile(rawTemplate);
        const compiledFile = template(templateData);
        await rm(tplFilePath);
        await writeFile(tplFilePath.split(".tpl")[0], compiledFile);
      })
    );
    setTitle("Templates processed");
  });
}

export async function downloadNode(projectPath: string, nodeInfo: nodeInfo) {
  return task("Downloading Swanky node", async ({ setTitle, setOutput }) => {
    const binPath = path.resolve(projectPath, "bin");
    await ensureDir(binPath);
    const dlUrl = nodeInfo.downloadUrl[process.platform];

    if (!dlUrl)
      throw new Error(
        `Could not download swanky-node. Platform ${process.platform} not supported!`
      );
    const compressedFileDetails = await new Promise<DownloadEndedStats>((resolve, reject) => {
      const dl = new DownloaderHelper(dlUrl, binPath);

      dl.on("progress", (event) => {
        setOutput(`Downloaded ${event.progress}% @ ${event.speed}`);
      });
      dl.on("end", (event) => {
        setOutput("");
        resolve(event);
      });
      dl.on("error", (error) => {
        reject(new Error(`Error downloading node: , ${error.message}`));
      });

      dl.start().catch((error) => reject(new Error(`Error downloading node: , ${error.message}`)));
    });

    if (compressedFileDetails.incomplete) {
      throw new Error("Node download incomplete");
    }

    const compressedFilePath = path.resolve(binPath, compressedFileDetails.filePath);
    const decompressed = await decompress(compressedFilePath, binPath);
    const nodePath = path.resolve(binPath, decompressed[0].path);
    await remove(compressedFilePath);
    await execa.command(`chmod +x ${nodePath}`);
    setTitle("Swanky node downloaded");
    return nodePath;
  });
}

export async function installDeps(projectPath: string) {
  return task("Installing dependencies", async ({ setTitle }) => {
    let installCommand = "npm install";

    try {
      await execa.command("yarn --version");
      installCommand = "yarn install";
    } finally {
      await execa.command(installCommand, { cwd: projectPath });
    }

    setTitle("Dependencies installed");
  });
}
