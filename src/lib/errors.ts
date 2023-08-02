import ModernError, { InstanceOptions } from "modern-errors";
import modernErrorsBugs from "modern-errors-bugs";
import modernErrorsClean from "modern-errors-clean";
import modernErrorWinston from "modern-errors-winston";
export const BaseError = ModernError.subclass("BaseError", {
  plugins: [modernErrorsBugs, modernErrorsClean, modernErrorWinston],
});

export const UnknownError = BaseError.subclass("UnknownError", {
  bugs: "https://github.com/swankyhub/swanky-cli/issues",
});

export const InputError = BaseError.subclass("InputError");

export const RpcError = BaseError.subclass("RpcError");

export const ApiError = BaseError.subclass("ApiError");

export const TestError = BaseError.subclass("TestError");

export const FileError = BaseError.subclass("FileError");

export const ProcessError = BaseError.subclass("ProcessError", {
  plugins: [],
  custom: class extends BaseError {
    constructor(message: string, options?: InstanceOptions & ProcessErrorOptions) {
      super(message, options);
      if (options?.shouldExit) {
        console.error(options.cause);
        process.exit(1);
      }
    }
  },
});

interface ProcessErrorOptions {
  shouldExit?: boolean;
}
