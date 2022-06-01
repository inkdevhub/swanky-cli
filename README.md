# Swanky CLI

<!-- toc -->
* [Swanky CLI](#swanky-cli)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @astar-network/swanky-cli
$ swanky COMMAND
running command...
$ swanky (--version)
@astar-network/swanky-cli/0.0.4 darwin-x64 node-v18.2.0
$ swanky --help [COMMAND]
USAGE
  $ swanky COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`swanky call`](#swanky-call)
* [`swanky compile`](#swanky-compile)
* [`swanky deploy`](#swanky-deploy)
* [`swanky help [COMMAND]`](#swanky-help-command)
* [`swanky init NAME`](#swanky-init-name)
* [`swanky node start`](#swanky-node-start)

## `swanky call`

Deploy contract to a running node

```
USAGE
  $ swanky call -m <value> [-a <value>]

FLAGS
  -a, --args=<value>
  -m, --message=<value>  (required)

DESCRIPTION
  Deploy contract to a running node
```

_See code: [dist/commands/call/index.ts](https://github.com/AstarNetwork/swanky-cli/blob/v0.0.4/dist/commands/call/index.ts)_

## `swanky compile`

Compile the smart contract(s) in your contracts directory

```
USAGE
  $ swanky compile [-s]

FLAGS
  -s, --silent  Don't display compilation output

DESCRIPTION
  Compile the smart contract(s) in your contracts directory
```

_See code: [dist/commands/compile/index.ts](https://github.com/AstarNetwork/swanky-cli/blob/v0.0.4/dist/commands/compile/index.ts)_

## `swanky deploy`

Deploy contract to a running node

```
USAGE
  $ swanky deploy -g <value> -a <value>

FLAGS
  -a, --args=<value>  (required)
  -g, --gas=<value>   (required)

DESCRIPTION
  Deploy contract to a running node
```

_See code: [dist/commands/deploy/index.ts](https://github.com/AstarNetwork/swanky-cli/blob/v0.0.4/dist/commands/deploy/index.ts)_

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

## `swanky init NAME`

Generate a new smart contract environment

```
USAGE
  $ swanky init [NAME]

ARGUMENTS
  NAME  directory name of new project

DESCRIPTION
  Generate a new smart contract environment
```

_See code: [dist/commands/init/index.ts](https://github.com/AstarNetwork/swanky-cli/blob/v0.0.4/dist/commands/init/index.ts)_

## `swanky node start`

Start a local node

```
USAGE
  $ swanky node start

DESCRIPTION
  Start a local node
```
<!-- commandsstop -->

## Test title
