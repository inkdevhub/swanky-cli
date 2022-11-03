import execa from "execa";
import { ensureDir, rename, copy, readFile, rm, writeFile, remove } from "fs-extra";
import path from "node:path";
import globby from "globby";
import handlebars from "handlebars";
import { DownloadEndedStats, DownloaderHelper } from "node-downloader-helper";
import process from "node:process";
import { NodeInfo } from "./nodeInfo";
import decompress from "decompress";
import { Spinner } from "./spinner";

export async function checkCliDependencies(spinner: Spinner) {
  const dependencyList = [
    { dependencyName: "rust", versionCommand: "rustc --version" },
    { dependencyName: "cargo", versionCommand: "cargo -V" },
    {
      dependencyName: "cargo contract",
      versionCommand: "cargo contract -V",
    },
  ];

  for (const dep of dependencyList) {
    spinner.text(`  Checking ${dep.dependencyName}`);
    await execa.command(dep.versionCommand);
  }
}

export async function copyTemplateFiles(
  templatesPath: string,
  contractTemplatePath: string,
  contractName: string,
  projectPath: string
) {
  await ensureDir(projectPath);
  const commonFiles = await globby(`*`, { cwd: templatesPath });
  await Promise.all(
    commonFiles.map(async (file) => {
      await copy(path.resolve(templatesPath, file), path.resolve(projectPath, file));
    })
  );
  await rename(path.resolve(projectPath, "gitignore"), path.resolve(projectPath, ".gitignore"));
  await copyContractTemplateFiles(contractTemplatePath, contractName, projectPath);
}

export async function copyContractTemplateFiles(
  contractTemplatePath: string,
  contractName: string,
  projectPath: string
) {
  await copy(contractTemplatePath, path.resolve(projectPath, "contracts", contractName));
}

export async function processTemplates(projectPath: string, templateData: Record<string, string>) {
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
}

export async function downloadNode(projectPath: string, nodeInfo: NodeInfo, spinner: Spinner) {
  const binPath = path.resolve(projectPath, "bin");
  await ensureDir(binPath);
  const dlUrl = nodeInfo.downloadUrl[process.platform];

  if (!dlUrl)
    throw new Error(`Could not download ${nodeInfo.name}. Platform ${process.platform} not supported!`);
  const compressedFileDetails = await new Promise<DownloadEndedStats>((resolve, reject) => {
    const dl = new DownloaderHelper(dlUrl, binPath);

    dl.on("progress", (event) => {
      spinner.text(`Downloading ${nodeInfo.name} ${event.progress}%`);
    });
    dl.on("end", (event) => {
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

  return nodePath;
}

export async function installDeps(projectPath: string) {
  let installCommand = "npm install";

  try {
    await execa.command("yarn --version");
    installCommand = "yarn install";
  } finally {
    await execa.command(installCommand, { cwd: projectPath });
  }
}
