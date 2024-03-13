import { execaCommand } from "execa";
import { copy, ensureDir, remove } from "fs-extra/esm";
import { readFile, rename, rm, writeFile } from "fs/promises";
import path from "node:path";
import { globby } from "globby";
import handlebars from "handlebars";
import { DownloadEndedStats, DownloaderHelper } from "node-downloader-helper";
import process from "node:process";
import semver from "semver";
import { nodeInfo } from "./nodeInfo.js";
import decompress from "decompress";
import { Spinner } from "./spinner.js";
import { DependencyName, Relaychain, SupportedArch, SupportedPlatforms, SwankyConfig, TestType, ZombienetConfig } from "../types/index.js";
import { ConfigError, NetworkError, ProcessError } from "./errors.js";
import { BinaryNames } from "./zombienetInfo.js";
import { zombienetConfig } from "../commands/zombienet/init.js";
import { readFileSync } from "fs";
import TOML from "@iarna/toml";
import { writeFileSync } from "node:fs";
import { chopsticksConfig } from "../commands/node/chopsticks/init.js";

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

export async function installCliDevDeps(spinner: Spinner, name: DependencyName, version: string) {
  switch (name) {
    case "rust": {
      spinner.text(`  Installing rust`);
      await execaCommand(`rustup toolchain install ${version}`);
      await execaCommand(`rustup default ${version}`);
      await execaCommand(`rustup component add rust-src --toolchain ${version}`);
      await execaCommand(`rustup target add wasm32-unknown-unknown --toolchain ${version}`);
      break;
    }
    case "cargo-dylint":
    case "cargo-contract": {
      spinner.text(`  Installing ${name}`);
      await execaCommand(
        `cargo +stable install ${name} ${
          version === "latest" ? "" : ` --force --version ${version}`
        }`
      );
      break;
    }
    default:
      spinner.fail(`Unsupported dependency. Skipping installation.`);
      return;
  }
}

export function osCheck() {
  const platform = process.platform;
  const arch = process.arch;

  const supportedConfigs = {
    darwin: ["x64", "arm64"],
    linux: ["x64", "arm64"],
  };

  if (!(platform in supportedConfigs)) {
    throw new ConfigError(`Platform '${platform}' is not supported!`);
  }

  const supportedArchs = supportedConfigs[platform as keyof typeof supportedConfigs];
  if (!supportedArchs.includes(arch)) {
    throw new ConfigError(
      `Architecture '${arch}' is not supported on platform '${platform}'.`
    );
  }

  return { platform, arch };
}

export async function copyCommonTemplateFiles(templatesPath: string, projectPath: string) {
  await ensureDir(projectPath);
  const commonFiles = await globby(`*`, { cwd: templatesPath });
  await Promise.all(
    commonFiles.map(async (file) => {
      await copy(path.resolve(templatesPath, file), path.resolve(projectPath, file));
    }),
  );
  await rename(path.resolve(projectPath, "gitignore"), path.resolve(projectPath, ".gitignore"));
  await rename(
    path.resolve(projectPath, "mocharc.json"),
    path.resolve(projectPath, ".mocharc.json"),
  );
  await copy(path.resolve(templatesPath, "github"), path.resolve(projectPath, ".github"));
}

export async function copyContractTemplateFiles(
  contractTemplatePath: string,
  contractName: string,
  projectPath: string,
) {
  await copy(
    path.resolve(contractTemplatePath, "contract"),
    path.resolve(projectPath, "contracts", contractName),
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
      `Could not download swanky-node. Platform ${process.platform} not supported!`,
    );

  const dlUrl = platformDlUrls[process.arch as SupportedArch];
  if (!dlUrl)
    throw new ConfigError(
      `Could not download swanky-node. Platform ${process.platform} Arch ${process.arch} not supported!`,
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
      reject(new Error(`Error downloading node: , ${error.message}`)),
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

export async function copyZombienetTemplateFile(templatePath: string, configPath: string) {
  await ensureDir(configPath);
  await copy(
    path.resolve(templatePath, zombienetConfig),
    path.resolve(configPath, zombienetConfig),
  );
}

export async function copyChopsticksTemplateFile(templatePath: string, configPath: string) {
  await ensureDir(configPath);
  await copy(
    path.resolve(templatePath, chopsticksConfig),
    path.resolve(configPath, chopsticksConfig),
  );
}

export async function downloadZombienetBinaries(binaries: string[], projectPath: string, swankyConfig: SwankyConfig, spinner: Spinner) {
  const binPath = path.resolve(projectPath, "zombienet", "bin");
  await ensureDir(binPath);

  const zombienetInfo = swankyConfig.zombienet;

  if (!zombienetInfo) {
    throw new ConfigError("No zombienet config found");
  }

  const dlUrls = new Map<string, string>();
  if (zombienetInfo.version) {
    const version = zombienetInfo.version;
    const binaryName = "zombienet";
    const platformDlUrls = zombienetInfo.downloadUrl[process.platform as SupportedPlatforms];
    if (!platformDlUrls)
      throw new ConfigError(
        `Could not download ${binaryName}. Platform ${process.platform} not supported!`,
      );
    let dlUrl = platformDlUrls[process.arch as SupportedArch];
    if (!dlUrl)
      throw new ConfigError(
        `Could not download ${binaryName}. Platform ${process.platform} Arch ${process.arch} not supported!`,
      );
    dlUrl = dlUrl.replace("${version}", version);
    dlUrls.set(binaryName, dlUrl);
  }

  for (const binaryName of Object.keys(zombienetInfo.binaries).filter((binaryName) => binaries.includes(binaryName))) {
    const binaryInfo = zombienetInfo.binaries[binaryName as BinaryNames];
    const version = binaryInfo.version;
    const platformDlUrls = binaryInfo.downloadUrl[process.platform as SupportedPlatforms];
    if (!platformDlUrls)
      throw new ConfigError(
        `Could not download ${binaryName}. Platform ${process.platform} not supported!`,
      );
    let dlUrl = platformDlUrls[process.arch as SupportedArch];
    if (!dlUrl)
      throw new ConfigError(
        `Could not download ${binaryName}. Platform ${process.platform} Arch ${process.arch} not supported!`,
      );
    dlUrl = dlUrl.replace(/\$\{version}/gi, version);
    dlUrls.set(binaryName, dlUrl);
  }

  for (const [binaryName, dlUrl] of dlUrls) {
    const dlFileDetails = await new Promise<DownloadEndedStats>((resolve, reject) => {
      const dl = new DownloaderHelper(dlUrl, binPath);

      dl.on("progress", (event) => {
        spinner.text(`Downloading ${binaryName} ${event.progress.toFixed(2)}%`);
      });
      dl.on("end", (event) => {
        resolve(event);
      });
      dl.on("error", (error) => {
        reject(new Error(`Error downloading ${binaryName}: , ${error.message}`));
      });

      dl.start().catch((error: Error) =>
        reject(new Error(`Error downloading ${binaryName}: , ${error.message}`)),
      );
    });

    if (dlFileDetails.incomplete) {
      throw new NetworkError("${binaryName} download incomplete");
    }

    let fileName = dlFileDetails.fileName;

    if (dlFileDetails.filePath.endsWith(".tar.gz")) {
      const compressedFilePath = path.resolve(binPath, dlFileDetails.filePath);
      const decompressed = await decompress(compressedFilePath, binPath);
      await remove(compressedFilePath);
      fileName = decompressed[0].path;
    }

    if (fileName !== binaryName) {
      await execaCommand(`mv ${binPath}/${fileName} ${binPath}/${binaryName}`);
    }
    await execaCommand(`chmod +x ${binPath}/${binaryName}`);
  }
}

export async function buildZombienetConfigFromBinaries(binaries: string[], templatePath: string, configPath: string) {
  await ensureDir(configPath);
  const configBuilder = {
    settings: {
      timeout: 1000,
    },
    relaychain: {
      default_command: "",
      chain: "",
      nodes: [],
    },
    parachains: [],
  } as ZombienetConfig;

  for (const binaryName of binaries) {
    const template = TOML.parse(readFileSync(path.resolve(templatePath, binaryName + ".toml"), "utf8"));
    if (template.parachains !== undefined) {
      (template.parachains as any).forEach((parachain: any) => {
        configBuilder.parachains.push(parachain);
      });
    }
    if (template.hrmp_channels !== undefined) {
      configBuilder.hrmp_channels = [];
      (template.hrmp_channels as any).forEach((hrmp_channel: any) => {
        configBuilder.hrmp_channels!.push(hrmp_channel);
      });
    }
    if (template.relaychain !== undefined) {
      configBuilder.relaychain = template.relaychain as unknown as Relaychain;
    }

  }

  writeFileSync(path.resolve(configPath, zombienetConfig), TOML.stringify(configBuilder as any));
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
