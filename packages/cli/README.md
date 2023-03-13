# Swanky CLI

[How to guide on Astar docs page](https://docs.astar.network/docs/wasm/sc-dev/swanky)

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
@astar-network/swanky-cli/2.1.0 darwin-x64 node-v18.2.0
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
* [`swanky check`](#swanky-check)
* [`swanky contract compile [CONTRACTNAME]`](#swanky-contract-compile-contractname)
* [`swanky contract deploy CONTRACTNAME`](#swanky-contract-deploy-contractname)
* [`swanky contract explain CONTRACTNAME`](#swanky-contract-explain-contractname)
* [`swanky contract new CONTRACTNAME`](#swanky-contract-new-contractname)
* [`swanky contract query CONTRACTNAME MESSAGENAME`](#swanky-contract-query-contractname-messagename)
* [`swanky contract test CONTRACTNAME`](#swanky-contract-test-contractname)
* [`swanky contract tx CONTRACTNAME MESSAGENAME`](#swanky-contract-tx-contractname-messagename)
* [`swanky contract typegen CONTRACTNAME`](#swanky-contract-typegen-contractname)
* [`swanky help [COMMANDS]`](#swanky-help-commands)
* [`swanky init PROJECTNAME`](#swanky-init-projectname)
* [`swanky node purge`](#swanky-node-purge)
* [`swanky node start`](#swanky-node-start)
* [`swanky plugins`](#swanky-plugins)
* [`swanky plugins:install PLUGIN...`](#swanky-pluginsinstall-plugin)
* [`swanky plugins:inspect PLUGIN...`](#swanky-pluginsinspect-plugin)
* [`swanky plugins:install PLUGIN...`](#swanky-pluginsinstall-plugin-1)
* [`swanky plugins:link PLUGIN`](#swanky-pluginslink-plugin)
* [`swanky plugins:uninstall PLUGIN...`](#swanky-pluginsuninstall-plugin)
* [`swanky plugins:uninstall PLUGIN...`](#swanky-pluginsuninstall-plugin-1)
* [`swanky plugins:uninstall PLUGIN...`](#swanky-pluginsuninstall-plugin-2)
* [`swanky plugins update`](#swanky-plugins-update)
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

## `swanky check`

Check installed package versions and compatibility

```
USAGE
  $ swanky check

DESCRIPTION
  Check installed package versions and compatibility
```

_See code: [dist/commands/check/index.js](https://github.com/AstarNetwork/swanky-cli/blob/v2.1.0/dist/commands/check/index.js)_

## `swanky contract compile [CONTRACTNAME]`

Compile the smart contract(s) in your contracts directory

```
USAGE
  $ swanky contract compile [CONTRACTNAME] [-v] [-r] [-a]

ARGUMENTS
  CONTRACTNAME  Name of the contract to compile

FLAGS
  -a, --all      Set all to true to compile all contracts
  -r, --release  A production contract should always be build in `release` mode for building optimized wasm
  -v, --verbose  Display additional compilation output

DESCRIPTION
  Compile the smart contract(s) in your contracts directory
```

## `swanky contract deploy CONTRACTNAME`

Deploy contract to a running node

```
USAGE
  $ swanky contract deploy CONTRACTNAME --account <value> -g <value> [-a <value>] [-c <value>] [-n <value>]

ARGUMENTS
  CONTRACTNAME  Name of the contract to deploy

FLAGS
  -a, --args=<value>...
  -c, --constructorName=<value>  [default: new] Constructor function name of a contract to deploy
  -g, --gas=<value>              (required)
  -n, --network=<value>          Network name to connect to
  --account=<value>              (required) Alias of account to be used

DESCRIPTION
  Deploy contract to a running node
```

## `swanky contract explain CONTRACTNAME`

Explain contract messages based on thier metadata

```
USAGE
  $ swanky contract explain CONTRACTNAME [-v]

ARGUMENTS
  CONTRACTNAME  Name of the contract

FLAGS
  -v, --verbose  Display more info in the result logs

DESCRIPTION
  Explain contract messages based on thier metadata
```

## `swanky contract new CONTRACTNAME`

Generate a new smart contract template inside a project

```
USAGE
  $ swanky contract new CONTRACTNAME [--template blank|erc20token|flipper|blank|flipper|psp22] [-l ink|ask] [-v]

ARGUMENTS
  CONTRACTNAME  Name of the new contract

FLAGS
  -l, --language=<option>  <options: ink|ask>
  -v, --verbose
  --template=<option>      <options: blank|erc20token|flipper|blank|flipper|psp22>

DESCRIPTION
  Generate a new smart contract template inside a project
```

## `swanky contract query CONTRACTNAME MESSAGENAME`

Call a query message on smart contract

```
USAGE
  $ swanky contract query CONTRACTNAME MESSAGENAME [-v] [-p <value>] [-g <value>] [-n <value>] [-a <value>]
    [--address <value>]

ARGUMENTS
  CONTRACTNAME  Contract to call
  MESSAGENAME   What message to call

FLAGS
  -a, --account=<value>    Account to sign the transaction with
  -g, --gas=<value>        Manually specify gas limit
  -n, --network=<value>    Network name to connect to
  -p, --params=<value>...  [default: ] Arguments supplied to the message
  -v, --verbose            Display more info in the result logs
  --address=<value>        Target specific address, defaults to last deployed. (--addr, --add)
```

## `swanky contract test CONTRACTNAME`

Run tests for a given contact

```
USAGE
  $ swanky contract test CONTRACTNAME [-a]

ARGUMENTS
  CONTRACTNAME  Name of the contract to test

FLAGS
  -a, --all  Set all to true to compile all contracts

DESCRIPTION
  Run tests for a given contact
```

## `swanky contract tx CONTRACTNAME MESSAGENAME`

Call a Tx message on smart contract

```
USAGE
  $ swanky contract tx CONTRACTNAME MESSAGENAME -a <value> [-v] [-p <value>] [-g <value>] [-n <value>] [--address
    <value>] [-d]

ARGUMENTS
  CONTRACTNAME  Contract to call
  MESSAGENAME   What message to call

FLAGS
  -a, --account=<value>    (required) Account to sign the transaction with
  -d, --dry                Do a dry run, without signing the transaction
  -g, --gas=<value>        Manually specify gas limit
  -n, --network=<value>    Network name to connect to
  -p, --params=<value>...  [default: ] Arguments supplied to the message
  -v, --verbose            Display more info in the result logs
  --address=<value>        Target specific address, defaults to last deployed. (--addr, --add)
```

## `swanky contract typegen CONTRACTNAME`

Generate types from compiled contract metadata

```
USAGE
  $ swanky contract typegen CONTRACTNAME

ARGUMENTS
  CONTRACTNAME  Name of the contract

DESCRIPTION
  Generate types from compiled contract metadata
```

## `swanky help [COMMANDS]`

Display help for swanky.

```
USAGE
  $ swanky help [COMMANDS] [-n]

ARGUMENTS
  COMMANDS  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for swanky.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.7/src/commands/help.ts)_

## `swanky init PROJECTNAME`

Generate a new smart contract environment

```
USAGE
  $ swanky init PROJECTNAME [--swanky-node] [-t blank|erc20token|flipper|blank|flipper|psp22] [-l ask|ink]
    [-v]

ARGUMENTS
  PROJECTNAME  directory name of new project

FLAGS
  -l, --language=<option>  <options: ask|ink>
  -t, --template=<option>  <options: blank|erc20token|flipper|blank|flipper|psp22>
  -v, --verbose
  --swanky-node

DESCRIPTION
  Generate a new smart contract environment
```

_See code: [dist/commands/init/index.js](https://github.com/AstarNetwork/swanky-cli/blob/v2.1.0/dist/commands/init/index.js)_

## `swanky node purge`

Purge local chain state

```
USAGE
  $ swanky node purge

DESCRIPTION
  Purge local chain state
```

## `swanky node start`

Start a local node

```
USAGE
  $ swanky node start [-t] [--rpcCors <value>]

FLAGS
  -t, --tmp
      Run node with non-persistent mode

  --rpcCors=<value>
      [default: http://localhost:*,http://127.0.0.1:*,https://localhost:*,https://127.0.0.1:*,https://polkadot.js.org,http
      s://contracts-ui.substrate.io/] RPC CORS origin swanky-node accepts. With '--tmp' flag, node accepts all origins.
      Without it, you may need to specify by comma separated string.
      By default, 'http://localhost:*,http://127.0.0.1:*,https://localhost:*,https://127.0.0.1:*,https://polkadot.js.org,h
      ttps://contracts-ui.substrate.io/' is set.

DESCRIPTION
  Start a local node
```

## `swanky plugins`

List installed plugins.

```
USAGE
  $ swanky plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ swanky plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.3.2/src/commands/plugins/index.ts)_

## `swanky plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ swanky plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ swanky plugins add

EXAMPLES
  $ swanky plugins:install myplugin 

  $ swanky plugins:install https://github.com/someuser/someplugin

  $ swanky plugins:install someuser/someplugin
```

## `swanky plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ swanky plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ swanky plugins:inspect myplugin
```

## `swanky plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ swanky plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ swanky plugins add

EXAMPLES
  $ swanky plugins:install myplugin 

  $ swanky plugins:install https://github.com/someuser/someplugin

  $ swanky plugins:install someuser/someplugin
```

## `swanky plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ swanky plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ swanky plugins:link myplugin
```

## `swanky plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ swanky plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ swanky plugins unlink
  $ swanky plugins remove
```

## `swanky plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ swanky plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ swanky plugins unlink
  $ swanky plugins remove
```

## `swanky plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ swanky plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ swanky plugins unlink
  $ swanky plugins remove
```

## `swanky plugins update`

Update installed plugins.

```
USAGE
  $ swanky plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
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

_See code: [@oclif/plugin-version](https://github.com/oclif/plugin-version/blob/v1.2.1/src/commands/version.ts)_
<!-- commandsstop -->

# Config

A newly generated project will have a `swanky.config.json` file that will get populated as you interact with your contracts and accounts.

## Example:

```json
{
  "node": {
    "localPath": "/my_proj_path/bin/swanky-node",
    "polkadotPalletVersions": "polkadot-v0.9.27",
    "supportedInk": "v3.3.1"
  },
  "accounts": [
    {
      "alias": "alice",
      "mnemonic": "//Alice",
      "isDev": true,
      "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
    },
    {
      "alias": "bob",
      "mnemonic": "//Bob",
      "isDev": true,
      "address": "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
    }
  ],
  "contracts": {
    "flipper": {
      "name": "flipper",
      "deployments": [
        {
          "timestamp": 1670919679024,
          "address": "5FmKC2NZNChwuxCAWCHQbevi5xXn8gaSGcafbuvcxwMbpMyd",
          "networkUrl": "ws://127.0.0.1:9944",
          "deployerAlias": "alice"
        }
      ],
      "language": "ink",
      "build": {
        "timestamp": 1670841378836,
        "artifactsPath": "/my_proj_path/artifacts/flipper/1670841378836"
      }
    },
    "psp22": {
      "name": "psp22",
      "language": "ink",
      "deployments": [],
      "build": {
        "timestamp": 1670861915076,
        "artifactsPath": "/my_proj_path/artifacts/psp22/1670861915076"
      }
    }
  },
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
swanky contract deploy flipper --account alice --gas 100000000000 --args true --network shibuya
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

## Notes and known issues:

- `ink!` projects use `@supercolony/typechain-compiler` package for compiling. This allows for a seamless TS type generation and integration tests.
  Unfortunately, there are issues with generated types when there's more than one contract present, as well as incorrect types for `ask!` contracts.
  We are working on resolving both.
