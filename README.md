<p align="center">
<img src="https://github.com/AstarNetwork/swanky-cli/blob/master/logo.png" width=500/>
</p>

<!-- toc -->
* [Docs and guide](#docs-and-guide)
* [Quick start](#quick-start)
* [Base image and dev container](#base-image-and-dev-container)
* [Config](#config)
* [Network Management](#network-management)
* [Development and contributing](#development-and-contributing)
* [Reporting issues](#reporting-issues)
* [Command help](#command-help)
<!-- tocstop -->

# Docs and guide

You can find more detailed info on installing and using Swanky CLI on [official astar docs page](https://docs.astar.network/docs/build/wasm/swanky-suite/cli/)

# Quick start

If you use a devcontainer (see next section), or a [`swanky-base`](https://github.com/AstarNetwork/swanky-cli/pkgs/container/swanky-cli%2Fswanky-base) image, swanky will be preinstalled and globally available and you can use it to generate and develop smart contracts right away.

Otherwise, you can install it from [`npm`](https://www.npmjs.com/package/@astar-network/swanky-cli), or download the [binaries for your system](https://github.com/AstarNetwork/swanky-cli/releases/)

For a quick start, you can run

```
swanky init my_project_name
```

Then cd into the project and compile:

```
swanky contract compile my_contract_name
```

Once done, open a new terminal window and start the node (assuming you chose to download it. If not, skip this part, edit the config to point to your node and use `--network` flag when deploying):

```
swanky node start
```

and, assuming you contract is based on flipper template and it's called flipper:

```
swanky contract deploy flipper --account alice -a true
```

Now you can interact with it by `query` and `tx` commands:

```
swanky contract query flipper get
swanky contract tx flipper flip --account alice
```

Your tests are located in the `/test` directory, and can be run either by calling `yarn test`, or `swanky contract test contract_name`.

The latter will produce a web-based report, but is unstable at the moment and might not work correctly.

# Base image and dev container

This repo hosts a pre built Docker image that comes with the latest version of swanky-cli installed, as well as required dependencies.

You can use it directly as a container on your machine, or as a base for a dev container (or codespaces).

[Here is a template repo with a .devcontainer preconfigured](https://github.com/AstarNetwork/swanky-dev-container).

To use it, create a new repo from the template, and either start a devcontainer locally, or run it in a GitHub Codespace

# Config

A newly generated project will have a `swanky.config.json` file that will get populated as you interact with your contracts and accounts.

## Example:

```json
{
  "node": {
    "localPath": "/Users/sasapul/Work/astar/swanky-cli/temp_proj/bin/swanky-node",
    "polkadotPalletVersions": "polkadot-v0.9.39",
    "supportedInk": "v4.3.0"
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
      "url": "wss://shibuya.public.blastapi.io"
    }
  },
  "contracts": {
    "flipper": {
      "name": "flipper",
      "moduleName": "flipper",
      "deployments": [
        {
          "timestamp": 1685526140801,
          "address": "5GsW2psSHADG1rSe6eZLof2qvSj7EV5KFcP5SQLswyZdoPsq",
          "networkUrl": "ws://127.0.0.1:9944",
          "deployerAlias": "alice"
        }
      ]
    }
  }
}
```

Also, global config will be created in your home directory, in `~/swanky` folder.
## Example:

```json
{
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
    },
    {
      "mnemonic": "broken estate advance smooth noble place wine choose scare east effort evil",
      "isDev": true,
      "alias": "global",
      "address": "5FhfjMxbrJnjxuP5rP1ZorNaDJdE1n5LYpd7jTi9ByfVX1P1"
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
      "url": "wss://shibuya.public.blastapi.io"
    }
  }
}
```
You can use accounts and networks from the global config in any swanky project.

# Network Management

You can deploy/call wasm smart contracts on any chains supporting the substrate contracts module ([`pallet-contracts`](https://github.com/paritytech/substrate/tree/master/frame/contracts)) by swanky-cli.
`--network` flag is available for `deploy` and `query`/`tx` commands. For example,

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

# Development and contributing

To work on swanky-cli itself, you'll need nodeJs, `yarn`, and `ts-node` installed globally.

Running `yarn dev` will start a watch process for both `ts` files and `/templates`, and you can run it by calling:

```
yarn dev:run COMMAND
```

or directly

```
./bin/run.js COMMAND
```

Directory names `temp_project`, `temp_proj`, and `test_project` are ignored by git so it's safe to test in the root directory of the project.

For example

```
./bin/run.js init temp_project
cd temp_project
../bin/run.js contract compile flipper
```

# Reporting issues

Please report any issue or bug you encounter, as well as any feature and improvement requests to the [issues section](https://github.com/AstarNetwork/swanky-cli/issues)

# Command help

<!-- usage -->
```sh-session
$ npm install -g @astar-network/swanky-cli
$ swanky COMMAND
running command...
$ swanky (--version|-V|-v)
@astar-network/swanky-cli/4.0.0 darwin-x64 node-v20.2.0
$ swanky --help [COMMAND]
USAGE
  $ swanky COMMAND
...
```
<!-- usagestop -->

<!-- commands -->
* [`swanky account create`](#swanky-account-create)
* [`swanky account list`](#swanky-account-list)
* [`swanky account ls`](#swanky-account-ls)
* [`swanky account balance`](#swanky-account-balance)
* [`swanky account faucet`](#swanky-account-faucet)
* [`swanky account default`](#swanky-account-default)
* [`swanky clear CONTRACTNAME`](#swanky-clear-contractname)
* [`swanky contract compile [CONTRACTNAME]`](#swanky-contract-compile-contractname)
* [`swanky contract deploy CONTRACTNAME`](#swanky-contract-deploy-contractname)
* [`swanky contract explain CONTRACTNAME`](#swanky-contract-explain-contractname)
* [`swanky contract new CONTRACTNAME`](#swanky-contract-new-contractname)
* [`swanky contract query CONTRACTNAME MESSAGENAME`](#swanky-contract-query-contractname-messagename)
* [`swanky contract test [CONTRACTNAME]`](#swanky-contract-test-contractname)
* [`swanky contract tx CONTRACTNAME MESSAGENAME`](#swanky-contract-tx-contractname-messagename)
* [`swanky contract verify CONTRACTNAME`](#swanky-contract-verify-contractname)
* [`swanky env check`](#swanky-env-check)
* [`swanky env install`](#swanky-env-install)
* [`swanky generate tests`](#swanky-generate-tests)
* [`swanky generate types`](#swanky-generate-types)
* [`swanky help [COMMANDS]`](#swanky-help-commands)
* [`swanky init PROJECTNAME`](#swanky-init-projectname)
* [`swanky node install`](#swanky-node-install)
* [`swanky node purge`](#swanky-node-purge)
* [`swanky node start`](#swanky-node-start)
* [`swanky node version`](#swanky-node-version)
* [`swanky node chopsticks init`](#swanky-node-chopsticks-init)
* [`swanky node chopsticks start`](#swanky-node-chopsticks-start)
* [`swanky zombienet init`](#swanky-zombienet-init)
* [`swanky zombienet start`](#swanky-zombienet-start)
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
  $ swanky account create [-v] [-g] [-n] [-d]

FLAGS
  -d, --dev      Make this account a dev account for local network usage.
  -g, --global   Create account globally stored in Swanky system config.
  -n, --new      Generate a brand new account.
  -v, --verbose  Display more info in the result logs

DESCRIPTION
  Create a new dev account in config
```
_See code: [src/commands/account/create.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/account/create.ts)_
## `swanky account list`

List dev accounts stored in config

```
USAGE
  $ swanky account list [-v]

FLAGS
  -v, --verbose  Display more info in the result logs

DESCRIPTION
  List dev accounts stored in config

ALIASES
  $ swanky account ls
```
_See code: [src/commands/account/list.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/account/list.ts)_


## `swanky account ls`

List dev accounts stored in config

```
USAGE
  $ swanky account ls [-v]

FLAGS
  -v, --verbose  Display more info in the result logs

DESCRIPTION
  List dev accounts stored in config

ALIASES
  $ swanky account ls
```

_See code: [src/commands/account/list.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/account/list.ts)_

## `swanky account balance`

Balance of an account

```
USAGE
  $ swanky account balance [ALIAS] [-v]

ARGUMENTS
  ALIAS  Alias of account to be used

FLAGS
  -v, --verbose  Display more info in the result logs

DESCRIPTION
  Balance of an account
```

_See code: [src/commands/account/balance.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/account/balance.ts)_

## `swanky account faucet`

Transfer some tokens from faucet to an account

```
USAGE
  $ swanky account faucet ALIAS [-v]

ARGUMENTS
  ALIAS  Alias of account to be used

FLAGS
  -v, --verbose  Display more info in the result logs

DESCRIPTION
  Transfer some tokens from faucet to an account
```

_See code: [src/commands/account/faucet.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/account/faucet.ts)_

## `swanky account default`

Set default account to use

```
USAGE
$ swanky account default [ACCOUNTALIAS] [-v] [-g]

ARGUMENTS
  ACCOUNTALIAS  Alias of account to be used as default

FLAGS
  -g, --global   Set default account globally in Swanky system config.
  -v, --verbose  Display more info in the result logs

DESCRIPTION
  Set default account to use
``` 

_See code: [src/commands/account/default.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/account/default.ts)_

## `swanky clear [CONTRACTNAME]`

Clear the artifacts

```
USAGE
  $ swanky clear [CONTRACTNAME] [-v] [-a]

ARGUMENTS
  CONTRACTNAME  Name of the contract artifact to clear

FLAGS
  -a, --all      Select all the project artifacts for delete
  -v, --verbose  Display more info in the result logs

DESCRIPTION
  Clear the artifacts
```

## `swanky contract compile [CONTRACTNAME]`

Compile the smart contract(s) in your contracts directory

```
USAGE
  $ swanky contract compile [CONTRACTNAME] [-v] [-r] [--verifiable] [-a]

ARGUMENTS
  CONTRACTNAME  Name of the contract to compile

FLAGS
  -a, --all      Set all to true to compile all contracts
  -r, --release  A production contract should always be build in `release` mode for building optimized wasm
  -v, --verbose  Display more info in the result logs
  --verifiable   A production contract should be build in `verifiable` mode to deploy on a public network. Ensure Docker Engine is up and running.

DESCRIPTION
  Compile the smart contract(s) in your contracts directory
```

_See code: [src/commands/contract/compile.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/contract/compile.ts)_

## `swanky contract deploy CONTRACTNAME`

Deploy contract to a running node

```
USAGE
  $ swanky contract deploy CONTRACTNAME --account <value> [-v] [-g <value>] [-a <value>] [-c <value>] [-n <value>]

ARGUMENTS
  CONTRACTNAME  Name of the contract to deploy

FLAGS
  -a, --args=<value>...
  -c, --constructorName=<value>  [default: new] Constructor function name of a contract to deploy
  -g, --gas=<value>
  -n, --network=<value>          Network name to connect to
  -v, --verbose                  Display more info in the result logs
  --account=<value>              (required) Alias of account to be used

DESCRIPTION
  Deploy contract to a running node
```


_See code: [src/commands/contract/deploy.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/contract/deploy.ts)_

## `swanky contract explain CONTRACTNAME`

Explain contract messages based on the contracts' metadata

```
USAGE
  $ swanky contract explain CONTRACTNAME [-v]

ARGUMENTS
  CONTRACTNAME  Name of the contract

FLAGS
  -v, --verbose  Display more info in the result logs

DESCRIPTION
  Explain contract messages based on the contracts' metadata
```

_See code: [src/commands/contract/explain.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/contract/explain.ts)_

## `swanky contract new CONTRACTNAME`

Generate a new smart contract template inside a project

```
USAGE
  $ swanky contract new CONTRACTNAME [-v] [--template blank|flipper|psp22]

ARGUMENTS
  CONTRACTNAME  Name of the new contract

FLAGS
  -v, --verbose
  --template=<option>  <options: blank|flipper|psp22>

DESCRIPTION
  Generate a new smart contract template inside a project
```

_See code: [src/commands/contract/new.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/contract/new.ts)_


## `swanky contract query CONTRACTNAME MESSAGENAME`

Call a query message on smart contract

```
USAGE
  $ swanky contract query CONTRACTNAME MESSAGENAME [-v] [-p <value>] [-g <value>] [-n <value>] [-a <value>] [--address <value>]

ARGUMENTS
  CONTRACTNAME  Contract to call
  MESSAGENAME   What message to call

FLAGS
  -a, --account=<value>    Account alias to sign the transaction with
  -g, --gas=<value>        Manually specify gas limit
  -n, --network=<value>    [default: local] Name of network to connect to
  -p, --params=<value>...  [default: ] Arguments supplied to the message
  -v, --verbose            Display more info in the result logs
  --address=<value>        Target specific address, defaults to last deployed. (--addr, --add)

DESCRIPTION
  Call a query message on smart contract
```

_See code: [src/commands/contract/query.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/contract/query.ts)_

## `swanky contract test [CONTRACTNAME]`

Run tests for a given contact

```
USAGE
  $ swanky contract test [CONTRACTNAME] [-v] [-a] [--mocha]

ARGUMENTS
  CONTRACTNAME  Name of the contract to test

FLAGS
  -a, --all      Run tests for all contracts
  -v, --verbose  Display more info in the result logs
  --mocha        Run tests with mocha

DESCRIPTION
  Run tests for a given contact
```

_See code: [src/commands/contract/test.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/contract/test.ts)_

## `swanky contract tx CONTRACTNAME MESSAGENAME`

Call a Tx message on smart contract

```
USAGE
  $ swanky contract tx CONTRACTNAME MESSAGENAME [-v] [-p <value>] [-g <value>] [-n <value>] [-a <value>] [--address <value>] [-d]

ARGUMENTS
  CONTRACTNAME  Contract to call
  MESSAGENAME   What message to call

FLAGS
  -a, --account=<value>    Account alias to sign the transaction with
  -d, --dry                Do a dry run, without signing the transaction
  -g, --gas=<value>        Manually specify gas limit
  -n, --network=<value>    [default: local] Name of network to connect to
  -p, --params=<value>...  [default: ] Arguments supplied to the message
  -v, --verbose            Display more info in the result logs
  --address=<value>        Target specific address, defaults to last deployed. (--addr, --add)

DESCRIPTION
  Call a Tx message on smart contract
```

_See code: [src/commands/contract/tx.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/contract/tx.ts)_

## `swanky contract verify CONTRACTNAME`

Verify the smart contract(s) in your contracts directory

```
USAGE
  $ swanky contract verify [CONTRACTNAME] [-v] [-a]

ARGUMENTS
  CONTRACTNAME  Name of the contract to verify

FLAGS
  -a, --all      Set all to true to verify all contracts
  -v, --verbose  Display more info in the result logs

DESCRIPTION
  Verify the smart contract(s) in your contracts directory
```

_See code: [src/commands/contract/verify.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/contract/verify.ts)_

## `swanky env check`

Check installed package versions and compatibility

```
USAGE
  $ swanky env check [-v] [-o <value>]

FLAGS
  -o, --print=<value>  File to write output to
  -v, --verbose        Display more info in the result logs

DESCRIPTION
  Check installed package versions and compatibility
```

_See code: [src/commands/env/check.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/env/check.ts)_

## `swanky env install`

Install dev dependencies

```
USAGE
  $ swanky env install [-v] [-d <value>]

FLAGS
  -d, --deps=<value>...  [default: ] Install the specified dev dependency name and version in the format <dependency@version>. The following options are supported: rust, cargo-dylint, cargo-contract. For installing rust
                         nightly version run: env install --deps rust@nightly
  -v, --verbose          Display more info in the result logs

DESCRIPTION
  Install dev dependencies
```

_See code: [src/commands/env/install.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/env/install.ts)_

## `swanky generate tests`

Generate test files for the specified contract

```
USAGE
  $ swanky generate tests [CONTRACTNAME] [-v] [--template blank|flipper|psp22] [--mocha]

ARGUMENTS
  CONTRACTNAME  Name of the contract

FLAGS
  -v, --verbose        Display more info in the result logs
  --mocha              Generate mocha test files
  --template=<option>  <options: blank|flipper|psp22>

DESCRIPTION
  Generate test files for the specified contract
```         

_See code: [src/commands/generate/tests.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/generate/tests.ts)_

## `swanky generate types`

Generate types from compiled contract metadata

```
USAGE
  $ swanky generate types CONTRACTNAME [-v]

ARGUMENTS
  CONTRACTNAME  Name of the contract

FLAGS
  -v, --verbose  Display more info in the result logs

DESCRIPTION
  Generate types from compiled contract metadata
```

_See code: [src/commands/generate/types.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/generate/types.ts)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.14/src/commands/help.ts)_

## `swanky init PROJECTNAME`

Generate a new smart contract environment

```
USAGE
  $ swanky init PROJECTNAME [-v] [--swanky-node] [-t blank|flipper|psp22] [-c <value>]

ARGUMENTS
  PROJECTNAME  directory name of new project

FLAGS
  -c, --convert=<value>    Converts an existing smart contract into a Swanky project
  -t, --template=<option>  <options: blank|flipper|psp22>
  -v, --verbose            Display more info in the result logs
  --swanky-node

DESCRIPTION
  Generate a new smart contract environment
```

_See code: [src/commands/init/index.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/init/index.ts)_

## `swanky node install`

Install swanky node binary

```
USAGE
  $ swanky node install [-v] [--set-version <value>]

FLAGS
  -v, --verbose          Display more info in the result logs
  --set-version=<value>  Specify version of swanky node to install.
                         List of supported versions: 1.6.0, 1.5.0, 1.4.0, 1.3.0, 1.2.0, 1.1.0, 1.0.0

DESCRIPTION
  Install swanky node binary
```

_See code: [src/commands/node/install.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/node/install.ts)_

## `swanky node purge`

Purge local chain state

```
USAGE
  $ swanky node purge [-v]

FLAGS
  -v, --verbose  Display more info in the result logs

DESCRIPTION
  Purge local chain state
```

_See code: [src/commands/node/purge.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/node/purge.ts)_

## `swanky node start`

Start a local node

```
USAGE
  $ swanky node start [-v] [-t] [--rpcCors <value>] [--finalizeDelaySec <value>]

FLAGS
  -t, --tmp
      Run node with non-persistent mode

  -v, --verbose
      Display more info in the result logs

  --finalizeDelaySec=<value>
      Delay time in seconds after blocks being sealed

  --rpcCors=<value>
      [default: http://localhost:*,http://127.0.0.1:*,https://localhost:*,https://127.0.0.1:*,https://polkadot.js.org,http
      s://contracts-ui.substrate.io/] RPC CORS origin swanky-node accepts. With '--tmp' flag, node accepts all origins.
      Without it, you may need to specify by comma separated string.
      By default, 'http://localhost:*,http://127.0.0.1:*,https://localhost:*,https://127.0.0.1:*,https://polkadot.js.org,h
      ttps://contracts-ui.substrate.io/' is set.

DESCRIPTION
  Start a local node
```

_See code: [src/commands/node/start.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/node/start.ts)_

## `swanky node version`

Show swanky node version

```
USAGE
  $ swanky node version [-v]

FLAGS
  -v, --verbose  Display more info in the result logs

DESCRIPTION
  Show swanky node version
```

_See code: [src/commands/node/version.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/node/version.ts)_

## `swanky node chopsticks init`

Initialize chopsticks config

```
USAGE
  $ swanky node chopsticks init [-v]

FLAGS
  -v, --verbose  Display more info in the result logs

DESCRIPTION
  Initialize chopsticks config
```

_See code: [src/commands/node/chopsticks/init.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/node/chopsticks/init.ts)_

## `swanky node chopsticks start`

Start chopsticks

```
USAGE
  $ swanky node chopsticks start [-v] [--config <value>]

FLAGS
  -v, --verbose  Display more info in the result logs
  --config=<value>  Path to the chopsticks config file

DESCRIPTION
  Start chopsticks
```

_See code: [src/commands/node/chopsticks/start.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/node/chopsticks/start.ts)_

## `swanky zombienet init`

Initialize Zombienet

``` 
USAGE
  $ swanky zombienet init [-v] [-b polkadot|polkadot-parachain|astar-collator]

FLAGS
  -b, --binaries=<option>...  [default: ] Binaries to install
                              <options: polkadot|polkadot-parachain|astar-collator>
  -v, --verbose               Display more info in the result logs

DESCRIPTION
  Initialize Zombienet
```

_See code: [src/commands/zombienet/init.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/zombienet/init.ts)_

## `swanky zombienet start`

Start Zombienet

```
USAGE
  $ swanky zombienet start [-v] [-c <value>]

FLAGS
  -c, --config-path=<value>  [default: ./zombienet/config/zombienet.config.toml] Path to zombienet config
  -v, --verbose              Display more info in the result logs

DESCRIPTION
  Start Zombienet
```

_See code: [src/commands/zombienet/start.ts](https://github.com/inkdevhub/swanky-cli/blob/master/src/commands/zombienet/start.ts)_

## `swanky plugins`

List installed plugins.

```
USAGE
  $ swanky plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ swanky plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.1.8/src/commands/plugins/index.ts)_

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

_See code: [@oclif/plugin-version](https://github.com/oclif/plugin-version/blob/v1.3.7/src/commands/version.ts)_
<!-- commandsstop -->
