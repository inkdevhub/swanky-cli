import { SwankyCommand } from "../../lib/swankyCommand.js";
export class NodeVersion extends SwankyCommand<typeof NodeVersion> {
  static description = "Show swanky node version";
  async run(): Promise<void> {
    if(this.swankyConfig.node.version === ""){
      this.log("Node is not installed");
    }
    else {
      this.log(`Node version: ${this.swankyConfig.node.version}`);
    }
  }
}
