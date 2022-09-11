import ora, { Ora } from "ora";

export class Spinner {
  ora: Ora;
  verbose: boolean;
  constructor(verbose: boolean) {
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
    command: () => Promise<any>,
    runningMessage: string,
    successMessage: string,
    failMessage: string
  ) {
    try {
      this.start(runningMessage);
      const res = await command();
      this.succeed(successMessage);
      return res;
    } catch (error) {
      this.fail(failMessage);
      if (this.verbose) console.error(error);
    }
  }

  ensureSpinner() {
    if (!this.ora) {
      throw new Error("spinner not started");
    }
  }
}
