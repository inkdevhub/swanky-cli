import { execaCommand } from "execa";
import { ensureDir, copy, remove } from "fs-extra/esm";
import { rename, readFile, rm, writeFile } from "fs/promises";
import path from "node:path";
import { globby } from "globby";
import handlebars from "handlebars";
import { DownloadEndedStats, DownloaderHelper } from "node-downloader-helper";
import process from "node:process";
import semver from "semver";
import { nodeInfo } from "./nodeInfo.js";
import decompress from "decompress";
import { Spinner } from "./spinner.js";
import { SupportedPlatforms, SupportedArch, TestType } from "../types/index.js";
import { ConfigError, NetworkError, ProcessError } from "./errors.js";
import { commandStdoutOrNull } from "./command-utils.js";

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
  await rename(
    path.resolve(projectPath, "mocharc.json"),
    path.resolve(projectPath, ".mocharc.json")
  );
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
}

export async function prepareTestFiles(
  testType: TestType,
  templatePath: string,
  projectPath: string,
  templateName?: string,
  contractName?: string
) {
  switch (testType) {
    case "e2e": {
      await copy(
        path.resolve(templatePath, "test_helpers"),
        path.resolve(projectPath, "tests", "test_helpers")
      );
      break;
    }
    case "mocha": {
      if (!templateName) {
        throw new ProcessError("'templateName' argument is required for mocha tests");
      }
      if (!contractName) {
        throw new ProcessError("'contractName' argument is required for mocha tests");
      }
      await copy(
        path.resolve(templatePath, "contracts", templateName, "test"),
        path.resolve(projectPath, "tests", contractName)
      );
      break;
    }
    default: {
      // This case will make the switch exhaustive
      throw new ProcessError("Unhandled test type");
    }
  }
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

export async function downloadNode(projectPath: string, nodeInfo: nodeInfo, spinner: Spinner) {
  const binPath = path.resolve(projectPath, "bin");
  await ensureDir(binPath);

  const platformDlUrls = nodeInfo.downloadUrl[process.platform as SupportedPlatforms];
  if (!platformDlUrls)
    throw new ConfigError(
      `Could not download swanky-node. Platform ${process.platform} not supported!`
    );

  const dlUrl = platformDlUrls[process.arch as SupportedArch];
  if (!dlUrl)
    throw new ConfigError(
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

    dl.start().catch((error: Error) =>
      reject(new Error(`Error downloading node: , ${error.message}`))
    );
  });

  if (dlFileDetails.incomplete) {
    throw new NetworkError("Node download incomplete");
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

export function extractCargoContractVersion() {
  const regex = /cargo-contract-contract (\d+\.\d+\.\d+(?:-[\w.]+)?)(?:-unknown-[\w-]+)/;
  const cargoContractVersionOutput = commandStdoutOrNull("cargo contract -V");
  if (!cargoContractVersionOutput) {
    return null
  }

  const match = cargoContractVersionOutput.match(regex);
  if (!match) {
    throw new ProcessError(
      `Unable to determine cargo-contract version. Please verify its installation.`
    );
  }

  return match[1];
}

export function ensureCargoContractVersionCompatibility(
  cargoContractVersion: string,
  minimalVersion: string,
  invalidVersionsList?: string[]
) {
  if (invalidVersionsList?.includes(cargoContractVersion)) {
    throw new ProcessError(
      `The cargo-contract version ${cargoContractVersion} is not supported. Please update or change the version.`
    );
  }

  if (!semver.satisfies(cargoContractVersion.replace(/-.*$/, ""), `>=${minimalVersion}`)) {
    throw new ProcessError(
      `cargo-contract version >= ${minimalVersion} required, but found version ${cargoContractVersion}. Please update to a compatible version.`
    );
  }
}
