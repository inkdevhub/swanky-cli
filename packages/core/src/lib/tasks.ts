import execa from "execa";
import { ensureDir, rename, copy, readFile, rm, writeFile, remove, pathExists } from "fs-extra";
import path from "node:path";
import globby from "globby";
import handlebars from "handlebars";
import { DownloadEndedStats, DownloaderHelper } from "node-downloader-helper";
import process from "node:process";
import { nodeInfo } from "./nodeInfo";
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
  await copy(path.resolve(templatesPath, "patches"), path.resolve(projectPath, "patches"));
  await rename(path.resolve(projectPath, "gitignore"), path.resolve(projectPath, ".gitignore"));
  await copyContractTemplateFiles(contractTemplatePath, contractName, projectPath);
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
    path.resolve(projectPath, "test", contractName)
  );
}

export async function processTemplates(projectPath: string, templateData: Record<string, string>) {
  const templateFiles = await globby(projectPath, {
    expandDirectories: { extensions: ["hbs"] },
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
  const dlUrl = nodeInfo.downloadUrl[process.platform];

  if (!dlUrl)
    throw new Error(`Could not download swanky-node. Platform ${process.platform} not supported!`);
  const dlFileDetails = await new Promise<DownloadEndedStats>((resolve, reject) => {
    const dl = new DownloaderHelper(dlUrl, binPath);

    dl.on("progress", (event) => {
      spinner.text(`Downloading Swanky node ${event.progress}%`);
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
    await execa.command(`chmod +x ${nodePath}`);

    return nodePath;
  }

  return path.resolve(binPath, dlFileDetails.filePath);
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

export async function generateTypes(artifactsPath: string, destinationPath: string) {
  try {
    const targetPath = path.resolve(destinationPath, "typedContract");
    const targetPathExists = await pathExists(targetPath);
    if (targetPathExists) {
      await remove(targetPath);
    }

    await execa.command(`npx typechain-polkadot --in . --out typedContract`, {
      cwd: artifactsPath,
    });

    await copy(path.resolve(artifactsPath, "typedContract"), targetPath);
  } catch (error) {
    console.error(error);
  }
}
