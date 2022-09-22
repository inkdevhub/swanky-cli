# Swanky CLI

<!-- toc -->
* [Swanky CLI](#swanky-cli)
* [Usage](#usage)
* [Commands](#commands)
* [Config](#config)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @astar-network/swanky-cli
$ swanky COMMAND
running command...
$ swanky (--version|-V|-v)
@astar-network/swanky-cli/0.2.0 darwin-x64 node-v18.2.0
$ swanky --help [COMMAND]
USAGE
  $ swanky COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`swanky account create`](#swanky-account-create)
* [`swanky account list`](#swanky-account-list)
* [`swanky account ls`](#swanky-account-ls)
* [`swanky call`](#swanky-call)
* [`swanky check`](#swanky-check)
* [`swanky compile`](#swanky-compile)
* [`swanky deploy`](#swanky-deploy)
* [`swanky help [COMMAND]`](#swanky-help-command)
* [`swanky init PROJECTNAME`](#swanky-init-projectname)
* [`swanky node start`](#swanky-node-start)
* [`swanky version`](#swanky-version)

## `swanky account create`

Create a new dev account in config

```
USAGE
  $ swanky account create [-g] [-d]

FLAGS
  -d, --dev
  -g, --generate

DESCRIPTION
  Create a new dev account in config
```

## `swanky account list`

List dev accounts stored in config

```
USAGE
  $ swanky account list

DESCRIPTION
  List dev accounts stored in config

ALIASES
  $ swanky account ls
```

## `swanky account ls`

List dev accounts stored in config

```
USAGE
  $ swanky account ls

DESCRIPTION
  List dev accounts stored in config

ALIASES
  $ swanky account ls
```

## `swanky call`

Call a method on a smart contract

```
USAGE
  $ swanky call -m <value> [-a <value>] [-d] [-g <value>]

FLAGS
  -a, --args=<value>
  -d, --dry
  -g, --gas=<value>
  -m, --message=<value>  (required)

DESCRIPTION
  Call a method on a smart contract
```

_See code: [dist/commands/call/index.ts](https://github.com/AstarNetwork/swanky-cli/blob/v0.2.0/dist/commands/call/index.ts)_

## `swanky check`

Check installed package versions and compatibility

```
USAGE
  $ swanky check

DESCRIPTION
  Check installed package versions and compatibility
```

_See code: [dist/commands/check/index.ts](https://github.com/AstarNetwork/swanky-cli/blob/v0.2.0/dist/commands/check/index.ts)_

## `swanky compile`

Compile the smart contract(s) in your contracts directory

```
USAGE
  $ swanky compile [-v]

FLAGS
  -v, --verbose  Display additional compilation output

DESCRIPTION
  Compile the smart contract(s) in your contracts directory
```

_See code: [dist/commands/compile/index.ts](https://github.com/AstarNetwork/swanky-cli/blob/v0.2.0/dist/commands/compile/index.ts)_

## `swanky deploy`

Deploy contract to a running node

```
USAGE
  $ swanky deploy --account <value> -c <value> -g <value> [-a <value>]

FLAGS
  -a, --args=<value>...
  -c, --contract=<value>  (required)
  -g, --gas=<value>       (required)
  --account=<value>       (required) Alias of account to be used

DESCRIPTION
  Deploy contract to a running node
```

_See code: [dist/commands/deploy/index.ts](https://github.com/AstarNetwork/swanky-cli/blob/v0.2.0/dist/commands/deploy/index.ts)_

## `swanky help [COMMAND]`

Display help for swanky.

```
USAGE
  $ swanky help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for swanky.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.12/src/commands/help.ts)_

## `swanky init PROJECTNAME`

Generate a new smart contract environment

```
USAGE
  $ swanky init [PROJECTNAME] [--swanky-node] [--template blank|flipper|psp22] [-v]

ARGUMENTS
  PROJECTNAME  directory name of new project

FLAGS
  -v, --verbose
  --swanky-node
  --template=<option>  <options: blank|flipper|psp22>

DESCRIPTION
  Generate a new smart contract environment
```

_See code: [dist/commands/init/index.ts](https://github.com/AstarNetwork/swanky-cli/blob/v0.2.0/dist/commands/init/index.ts)_

## `swanky node start`

Start a local node

```
USAGE
  $ swanky node start

DESCRIPTION
  Start a local node
```

## `swanky version`

```
USAGE
  $ swanky version [--json] [--verbose]

FLAGS
  --verbose  Show additional information about the CLI.

GLOBAL FLAGS
  --json  Format output as json.

FLAG DESCRIPTIONS
  --verbose  Show additional information about the CLI.

    Additionally shows the architecture, node version, operating system, and versions of plugins that the CLI is using.
```

_See code: [@oclif/plugin-version](https://github.com/oclif/plugin-version/blob/v1.1.2/src/commands/version.ts)_
<!-- commandsstop -->

# Config

A newly generated project will have a `swanky.config.json` file.

## Example:

```json
{
  "node": {
    "localPath": "/path/to/swanky-node",
    "polkadotPalletVersions": "polkadot-v0.9.27",
    "supportedInk": "v3.3.1"
  },
  "accounts": [
    {
      "alias": "alice",
      "mnemonic": "//Alice"
    },
    {
      "alias": "bob",
      "mnemonic": "//Bob"
    }
  ],
  "networks": {
    "local": {
      "url": "ws://127.0.0.1:9944"
    },
    "astar": {
      "url": "wss://rpc.astar.network"
    },
    "shiden": {
      "url": "wss://rpc.shiden.astar.network"
    },
    "shibuya": {
      "url": "wss://rpc.shibuya.astar.network"
    }
  }
}

```

## Network Management
You can deploy/call wasm smart contracts on any chains supporting the substrate contracts module ([`pallet-contracts`](https://github.com/paritytech/substrate/tree/master/frame/contracts)) by swanky-cli.
`--network` flag is available for `deploy` and `call` commands. For example,
```
swanky deploy --account alice --gas 100000000000 --contract flipper --args true --network shibuya
```

By default, `swanky init` prepares local/astar/shiden/shibuya endpoint for you.
To add networks or change endpoint to interact with, you need to update `swanky.config.json` `networks` section.
```
"networks": {
  "local": {
    "url": "ws://127.0.0.1:9944"
  },
  "your_network": {
    "url": "wss://your.network"
  }
}
```

## Notes:

- config file format is very likely to change as the tool is under active development
- `contracts` section keeps history of all deployments of specific contract
- `accounts` should ONLY hold dev accounts. The more secure solution will be added in the upcoming release
- at runtime, only `localPath` and `nodeAddress` fields of `node` object are being used.
