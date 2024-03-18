import { configName, SwankyConfig } from "../index.js";
import { FileError } from "./errors.js";

export function ensureSwankyNodeInstalled(config: SwankyConfig) {
    if (config.node.localPath === "") {
        throw new FileError('Swanky node is not installed. Please run `swanky node:install` first.');
    }
}

// //deploy
// if (!contractRecord) {
//   throw new ConfigError(
//     `Cannot find a contract named ${args.contractName} in "${configName()}"`
//   );
// }
//
// //explain
// if (!contractRecord) {
//   throw new ConfigError(
//     `Cannot find a contract named ${args.contractName} in "${configName()}"`
//   );
// }
//
// //test
// if (!contractRecord) {
//   throw new ConfigError(
//     `Cannot find a contract named ${args.contractName} in "${configName()}"`
//   );
// }
//
// //contractCall
// if (!contractRecord) {
//   throw new ConfigError(
//     `Cannot find a contract named ${args.contractName} in "${configName()}"`,
//   );
// }

export function findContractRecord(config: SwankyConfig, contractName: string) {
    const contractRecord = config.contracts[contractName];
    if (!contractRecord) {
        throw new FileError(`Cannot find a contract named ${contractName} in "${configName()}"`);
    }
    return contractRecord;
}
