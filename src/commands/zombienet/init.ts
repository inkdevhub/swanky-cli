import path from "node:path";
import { Flags } from "@oclif/core";
import { SwankyCommand } from "../../lib/swankyCommand.js";
import { getSwankyConfig, Spinner } from "../../lib/index.js";
import { existsSync } from "fs-extra";
import inquirer from "inquirer";
import { copy, ensureDir } from "fs-extra/esm";
import { DownloadEndedStats, DownloaderHelper } from "node-downloader-helper";
import { execaCommand } from "execa";


export const zombienetConfig = "zombienet.config.toml";
export const templatePath = path.resolve(__dirname, "../../templates");

export const providerChoices = ["native", "k8s"];

export class InitZombienet extends SwankyCommand<typeof InitZombienet> {
  static description = "Initialize Zomnienet";

  static flags = {
    verbose: Flags.boolean({ char: "v", description: "Verbose output" }),
    provider: Flags.string({ char: "p", description: "Provider to use" }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(InitZombienet);
    await getSwankyConfig();

    const spinner = new Spinner(flags.verbose);

    const projectPath = path.resolve();
    if (existsSync(path.resolve(projectPath, "zombienet", "bin", "zombienet"))) {
      this.error("Zombienet config already initialized");
    }

    let provider = flags.provider;
    if (provider === undefined) {
      const answer = await inquirer.prompt([{
        name: "provider",
        type: "list",
        choices: providerChoices,
        message: "Select a provider to use",
      }])
      provider = answer.provider;
    }

    const configPath = path.resolve(projectPath, "zombienet", "config")
    // Copy templates
    await spinner.runCommand(
      () =>
        copyTemplateFile(path.resolve(templatePath, provider!), path.resolve(configPath, provider!)),
      "Copying template files"
    );

    // Install binaries based on zombie config
    await spinner.runCommand(
      async () => new Promise<void>(async (resolve, reject) => {
        const binPath = path.resolve(projectPath, "zombienet", "bin");
        await ensureDir(binPath);
        const platform = process.platform.toString();
        const dlUrl = zombieNetBinInfo.downloadUrl[platform];
        if (!dlUrl)
          reject(`Could not download Zombienet. Platform ${process.platform} not supported!`);
        
        const dlFileDetails = await new Promise<DownloadEndedStats>((resolve, reject) => {
          const dl = new DownloaderHelper(dlUrl, binPath);
          
          dl.on("progress", (event) => {
            spinner.text(`Downloading Zombienet binary ${event.progress.toFixed(2)}%`);
          });
          dl.on("end", (event) => {
            resolve(event);
          });
          dl.on("error", (error) => {
            reject(new Error(`Error downloading Zombienet binary: , ${error.message}`));
          });
          
          dl.start().catch((error) => reject(new Error(`Error downloading Zombienet: , ${error.message}`)));
        });
      
        if (dlFileDetails.incomplete) {
          reject("Zombienet binary download incomplete");
        }
      
        await execaCommand(`mv ${binPath}/${dlFileDetails.fileName} ${binPath}/zombienet`)
        await execaCommand(`chmod +x ${binPath}/zombienet`);
        resolve();
      }),
      "Download Zombienet binary",
    );

    this.log("ZombieNet config Installed successfully");
  }
}

export async function copyTemplateFile(templatePath: string, projectPath: string) {
  await ensureDir(projectPath);
  await copy(
    path.resolve(templatePath, zombienetConfig),
    path.resolve(projectPath, zombienetConfig)
  );
}

type downloadUrl = Record<string, string>;

const zombieNetBinInfo = {
  version: "v1.3.42",
  downloadUrl: {
    darwin:
      "https://github.com/paritytech/zombienet/releases/download/v1.3.42/zombienet-macos",
    linux:
      "https://github.com/paritytech/zombienet/releases/download/v1.3.42/zombienet-linux-x64",
  } as downloadUrl,
};
