import { execaCommand } from "execa";
import { ensureDir, copy, remove } from "fs-extra/esm";
import { rename, readFile, rm, writeFile } from "fs/promises";
import path from "node:path";
import { globby } from "globby";
import handlebars from "handlebars";
import { DownloadEndedStats, DownloaderHelper } from "node-downloader-helper";
import process from "node:process";
import { nodeInfo } from "./nodeInfo.js";
import decompress from "decompress";
import { Spinner } from "./spinner.js";
import { SupportedPlatforms, SupportedArch } from "../types/index.js";

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
    await execaCommand(dep.versionCommand);
  }
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
  await copy(path.resolve(templatesPath, "github"), path.resolve(projectPath, ".github"));
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
  await copy(
    path.resolve(contractTemplatePath, "test"),
    path.resolve(projectPath, "tests", contractName)
  );
}

export async function processTemplates(projectPath: string, templateData: Record<string, string>) {
  const templateFiles = await globby(projectPath, {
    expandDirectories: { extensions: ["hbs"] },
    gitignore: true,
  });

  handlebars.registerHelper("if_eq", function (a, b, options): boolean {
    if (a === b) {
      // @ts-ignore
      return options.fn(this);
    } else {
      // @ts-ignore
      return options.inverse(this);
    }
  });

  await Promise.all(
    templateFiles.map(async (tplFilePath) => {
      const rawTemplate = await readFile(tplFilePath, "utf8");
      const template = handlebars.compile(rawTemplate);
      const compiledFile = template(templateData);
      await rm(tplFilePath);
      await writeFile(tplFilePath.split(".hbs")[0], compiledFile);
    })
  );
}

export async function downloadNode(projectPath: string, nodeInfo: nodeInfo, spinner: Spinner) {
  const binPath = path.resolve(projectPath, "bin");
  await ensureDir(binPath);

  const platformDlUrls = nodeInfo.downloadUrl[process.platform as SupportedPlatforms];
  if (!platformDlUrls)
    throw new Error(`Could not download swanky-node. Platform ${process.platform} not supported!`);

  const dlUrl = platformDlUrls[process.arch as SupportedArch];
  if (!dlUrl)
    throw new Error(
      `Could not download swanky-node. Platform ${process.platform} Arch ${process.arch} not supported!`
    );

  const dlFileDetails = await new Promise<DownloadEndedStats>((resolve, reject) => {
    const dl = new DownloaderHelper(dlUrl, binPath);

    dl.on("progress", (event) => {
      spinner.text(`Downloading Swanky node ${event.progress.toFixed(2)}%`);
    });
    dl.on("end", (event) => {
      resolve(event);
    });
    dl.on("error", (error) => {
      reject(new Error(`Error downloading node: , ${error.message}`));
    });

    dl.start().catch((error) => reject(new Error(`Error downloading node: , ${error.message}`)));
  });

  if (dlFileDetails.incomplete) {
    throw new Error("Node download incomplete");
  }

  if (dlFileDetails.filePath.endsWith(".tar.gz")) {
    const compressedFilePath = path.resolve(binPath, dlFileDetails.filePath);
    const decompressed = await decompress(compressedFilePath, binPath);
    const nodePath = path.resolve(binPath, decompressed[0].path);
    await remove(compressedFilePath);
    await execaCommand(`chmod +x ${nodePath}`);

    return nodePath;
  }

  return path.resolve(binPath, dlFileDetails.filePath);
}

export async function installDeps(projectPath: string) {
  let installCommand = "npm install";

  try {
    await execaCommand("yarn --version");
    installCommand = "yarn install";
  } catch (_error) {
    console.log("\n\t >>Yarn not detected, using NPM");
  } finally {
    await execaCommand(installCommand, { cwd: projectPath });
  }
}
