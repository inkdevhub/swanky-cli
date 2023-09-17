import { createLogger, format, transports } from "winston";
import { BaseError } from "./errors.js";
import { env } from "node:process";

export const swankyLogger = createLogger({
  format: format.combine(BaseError.shortFormat({ stack: true }), format.cli()),

  transports: [new transports.Console({ level: "error" })],
});

if (!env.CI) {
  swankyLogger.add(
    new transports.File({
      format: format.combine(
        format.uncolorize(),
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        BaseError.fullFormat({ stack: true }),
        format.printf(
          (info) => `[${info.timestamp}] ${info.level}:\n ${info.message}\n${"=".repeat(80)}`
        )
      ),
      filename: "swanky.log",
      options: {
        flags: "w",
      },
      level: "info",
    })
  );
}
