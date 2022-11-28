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
@astar-network/swanky-cli/1.0.0-rc.3 darwin-x64 node-v18.2.0
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
* [`swanky contract call`](#swanky-contract-call)
* [`swanky contract compile CONTRACTNAME`](#swanky-contract-compile-contractname)
* [`swanky contract deploy CONTRACTNAME`](#swanky-contract-deploy-contractname)
* [`swanky contract new CONTRACTNAME`](#swanky-contract-new-contractname)
* [`swanky contract test CONTRACTNAME`](#swanky-contract-test-contractname)
* [`swanky contract typegen CONTRACTNAME`](#swanky-contract-typegen-contractname)
* [`swanky help [COMMAND]`](#swanky-help-command)
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

_See code: [dist/commands/check/index.ts](https://github.com/AstarNetwork/swanky-cli/blob/v1.0.0-rc.3/dist/commands/check/index.ts)_

## `swanky contract call`

Call a method on a smart contract

```
USAGE
  $ swanky contract call --contractName <value> -m <value> [-a <value>] [-d] [-g <value>] [-n <value>] [-t <value>]

FLAGS
  -a, --args=<value>
  -d, --dry
  -g, --gas=<value>
  -m, --message=<value>              (required)
  -n, --network=<value>              Network name to connect to
  -t, --deploymentTimestamp=<value>  Specific deployment to target
  --contractName=<value>             (required)

DESCRIPTION
  Call a method on a smart contract
```

## `swanky contract compile CONTRACTNAME`

Compile the smart contract(s) in your contracts directory

```
USAGE
  $ swanky contract compile [CONTRACTNAME] [-v]

ARGUMENTS
  CONTRACTNAME  Name of the contract to compile

FLAGS
  -v, --verbose  Display additional compilation output

DESCRIPTION
  Compile the smart contract(s) in your contracts directory
```

## `swanky contract deploy CONTRACTNAME`

Deploy contract to a running node

```
USAGE
  $ swanky contract deploy [CONTRACTNAME] --account <value> -g <value> [-a <value>] [-n <value>]

ARGUMENTS
  CONTRACTNAME  Name of the contract to deploy

FLAGS
  -a, --args=<value>...
  -g, --gas=<value>      (required)
  -n, --network=<value>  Network name to connect to
  --account=<value>      (required) Alias of account to be used

DESCRIPTION
  Deploy contract to a running node
```

## `swanky contract new CONTRACTNAME`

Generate a new smart contract template inside a project

```
USAGE
  $ swanky contract new [CONTRACTNAME] [--template blank|erc20token|flipper|blank|flipper|psp22] [-l ink|ask] [-v]

ARGUMENTS
  CONTRACTNAME  Name of new contract

FLAGS
  -l, --language=<option>  <options: ink|ask>
  -v, --verbose
  --template=<option>      <options: blank|erc20token|flipper|blank|flipper|psp22>

DESCRIPTION
  Generate a new smart contract template inside a project
```

## `swanky contract test CONTRACTNAME`

Run tests for a given contact

```
USAGE
  $ swanky contract test [CONTRACTNAME]

ARGUMENTS
  CONTRACTNAME  Name of the contract to compile

DESCRIPTION
  Run tests for a given contact
```

## `swanky contract typegen CONTRACTNAME`

Generate types from compiled contract metadata

```
USAGE
  $ swanky contract typegen [CONTRACTNAME]

ARGUMENTS
  CONTRACTNAME  Name of the contract

DESCRIPTION
  Generate types from compiled contract metadata
```

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.19/src/commands/help.ts)_

## `swanky init PROJECTNAME`

Generate a new smart contract environment

```
USAGE
  $ swanky init [PROJECTNAME] [--swanky-node] [-t blank|erc20token|flipper|blank|flipper|psp22] [-l
    ask|ink] [-v]

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

_See code: [dist/commands/init/index.ts](https://github.com/AstarNetwork/swanky-cli/blob/v1.0.0-rc.3/dist/commands/init/index.ts)_

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
  $ swanky node start [-t]

FLAGS
  -t, --tmp  Run node with non-persistent mode

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.7/src/commands/plugins/index.ts)_

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

_See code: [@oclif/plugin-version](https://github.com/oclif/plugin-version/blob/v1.1.3/src/commands/version.ts)_
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

## Notes:

- config file format is very likely to change as the tool is under active development
- `contracts` section keeps history of all deployments of specific contract
- `accounts` should ONLY hold dev accounts. The more secure solution will be added in the upcoming release
- at runtime, only `localPath` and `nodeAddress` fields of `node` object are being used.
