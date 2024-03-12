import { SwankyConfig } from "../index.js";
import { FileError } from "./errors.js";

export function ensureSwankyNodeInstalled(config: SwankyConfig) {
    if (config.node.localPath === "") {
        throw new FileError('Swanky node is not installed. Please run `swanky node:install` first.');
    }
}
