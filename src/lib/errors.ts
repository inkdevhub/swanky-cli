import ModernError from "modern-errors";
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

export const RPCError = BaseError.subclass("RPCError");

export const APIError = BaseError.subclass("APIError");
