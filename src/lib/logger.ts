import { createLogger, format, transports } from "winston";
import { BaseError } from "./errors.js";

const cliFormat = format.combine(BaseError.shortFormat({ stack: false }), format.cli());

const fileFormat = format.combine(BaseError.fullFormat(), format.prettyPrint());

export function initLogger(writeToFile = false) {
  return createLogger({
    format: writeToFile ? fileFormat : cliFormat,
    transports: [new transports.Console()],
  });
}
