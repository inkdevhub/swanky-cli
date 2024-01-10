import { SwankyCommand } from "../../lib/swankyCommand.js";
import { Flags } from "@oclif/core";
import path from "node:path";
import TOML from "@iarna/toml";
import inquirer from "inquirer";
import { writeFileSync } from "node:fs";


export class BuildConfig extends SwankyCommand<typeof BuildConfig>{
  static description = "Build Zombienet provider config";

  static flags = {
    provider: Flags.string({ char: "p", default:"native", description: "Provider to use" }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(BuildConfig);

    const projectPath = path.resolve();

    const configPath = path.resolve(projectPath, "zombienet", "config", flags.provider)

    // const parsedConfig = TOML.parse(readFileSync(path.resolve(configPath, zombienetConfig), "utf-8"));
    //
    // console.log("Parsed config:\n", parsedConfig, '\n');

    const configBuilder = {
      settings: {
        timeout: 1000
      },
      relaychain:{
        default_command: "",
        chain: "",
        nodes: []
      },
      parachains:[],
      hrmp_channels:[]
    } as ZombienetConfig;

    const relaychainName = (await inquirer.prompt([{
      name: "relaychainName",
      type: "list",
      choices: ["rococo-local"],
      message: "Select a relaychain to use",
    }])).relaychainName;

    configBuilder.relaychain = relaychains[relaychainName as AvailableParachains];

    const nodesAmount = (await inquirer.prompt([{
      name: "nodesAmount",
      type: "number",
      message: "How many nodes do you want to run?",
    }])).nodesAmount;

    const nodes : Node[] = [];
    for (let i = 0; i < nodesAmount; i++) {
      nodes.push({name: `relay${
        "0".repeat(nodesAmount.toString().length - i.toString().length)+i}`
      });
    }
    configBuilder.relaychain.nodes = nodes;

    const parachainsAmount = (await inquirer.prompt([{
      name: "parachainsAmount",
      type: "number",
      message: "How many parachains do you want to run?",
    }])).parachainsAmount;

    const parachains : Parachain[] = [];
    for(let i = 0; i < parachainsAmount; i++) {
      const parachainId = 2000 + i;

      const collatorRpcPort = 8545 + i;

      const collatorType = (await inquirer.prompt([{
        name: "collatorType",
        type: "list",
        choices: ["astar-collator"],
        message: `Select collator type for parachain ${i}`,
      }])).collatorType;

      const collator = collators[collatorType as AvailableCollators];

      const parachainName = (await inquirer.prompt([{
        name: "parachainName",
        type: "list",
        choices: parachins[collatorType as AvailableCollators],
        message: `Chose parachain name for parachain ${i}`,
      }])).parachainName;

      collator.name = parachainName + "-collator";
      collator.rpc_port = collatorRpcPort;

      const parachain = {
        id: parachainId,
        chain: parachainName,
        cumulus_based: true,
        collator: collator
      } as Parachain;

      parachains.push(parachain);
    }
    configBuilder.parachains = parachains;


    const hrmp_channels : HrmpChannel[] = [];

    const hrmpChannelsAmount = (await inquirer.prompt([{
      name: "hrmpChannelsAmount",
      type: "number",
      message: `How many hrmp channels do you want to run?(Max: ${parachainsAmount * (parachainsAmount - 1)})`,
    }])).hrmpChannelsAmount;

    if(hrmpChannelsAmount > parachainsAmount * (parachainsAmount - 1)) {
      this.error("Maximum hrmp channels amount exceeded");
    }

    const channelChoices = [];
    for(let j = 0; j < parachainsAmount; j++) {
      for(let k = 0; k < parachainsAmount; k++) {
        if(j != k) {
          channelChoices.push({value: {sender: parachains[j].id, recipient: parachains[k].id}, name: `${parachains[j].chain} -> ${parachains[k].chain}`});
        }
      }
    }

    for(let i = 0; i < hrmpChannelsAmount; i++) {
      const senderRecipient = (await inquirer.prompt([{
        name: "senderRecipient",
        type: "list",
        choices: channelChoices,
        message: `Select sender and recipient for hrmp channel ${i}`,
      }])).senderRecipient;


      const hrmpChannel = {
        sender: senderRecipient.sender,
        recipient: senderRecipient.recipient,
        max_capacity: 8,
        max_message_size: 512
      } as HrmpChannel;

      hrmp_channels.push(hrmpChannel);
    }
    configBuilder.hrmp_channels = hrmp_channels;

    writeFileSync(path.resolve(configPath, "test.config.toml"), TOML.stringify(configBuilder as any));
  }
}

type AvailableParachains = "rococo-local";
const relaychains = {
  "rococo-local": {
    default_command: "./zombienet/bin/polkadot",
    chain: "rococo-local",
    nodes: []
  } as Relaychain
}

type AvailableCollators = "astar-collator";
const collators = {
  "astar-collator": {
    name: "",
    command: "./zombienet/bin/astar-collator",
    rpc_port: 0,
    args: [ "-l=xcm=trace", "--enable-evm-rpc" ]
  }
}
interface ZombienetConfig {
  settings: { timeout: number },
  relaychain: Relaychain,
  parachains: Parachain[],
  hrmp_channels: HrmpChannel[],
}

const parachins = {
  "astar-collator": ["astar-dev", "shiden-dev"]
}

interface Relaychain {
  default_command: string,
  chain: string,
  nodes: Node[]
}
interface Node {
  name: string,
}
interface HrmpChannel {
  sender: number,
  recipient: number,
  max_capacity: number,
  max_message_size: number
}
interface Parachain {
  id: number,
  chain: string,
  cumulus_based: boolean,
  collator: Collator
}
interface Collator {
  name: string,
  command: string,
  rpc_port: number,
  args: string[],
}
