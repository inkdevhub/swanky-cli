import ora, { Ora } from "ora";
import { ProcessError } from "./errors.js";

export class Spinner {
  ora: Ora;
  verbose: boolean;
  constructor(verbose = false) {
    this.ora = ora();
    this.verbose = verbose;
  }

  start(text: string) {
    this.ora = ora(text).start();
    return Promise.resolve();
  }

  succeed(text: string) {
    this.ensureSpinner();
    this.ora.succeed(text);
  }

  fail(text: string) {
    this.ensureSpinner();
    this.ora.fail(text);
  }

  output(text: string) {
    this.ora.info(text).start();
  }

  text(text: string) {
    this.ora.text = text;
  }

  async runCommand(
    command: () => Promise<unknown>,
    runningMessage: string,
    successMessage?: string,
    failMessage?: string,
    shouldExitOnError = false
  ) {
    try {
      await this.start(runningMessage);
      const res = await command();
      this.succeed(successMessage ?? `${runningMessage} OK`);
      return res;
    } catch (cause) {
      const errorMessage = failMessage ?? `Error ${runningMessage}`;
      this.fail(failMessage ?? `Error ${runningMessage}`);
      throw new ProcessError(errorMessage, { cause, shouldExit: shouldExitOnError });
    }
  }

  ensureSpinner() {
    if (!this.ora) {
      throw new ProcessError("spinner not started");
    }
  }
}
