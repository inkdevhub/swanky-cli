import { Hook } from "@oclif/core";

export const hook: Hook<"init"> = async function () {
  if (["-v", "-V", "--version", "version"].includes(process.argv[2])) {
    const { name, version } = this.config.pjson;
    this.log(`${name} v${version}`);
    return process.exit(0);
  }
};
