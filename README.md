# Swanky CLI

<!-- toc -->
* [Swanky CLI](#swanky-cli)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g swanky-cli
$ swanky COMMAND
running command...
$ swanky (--version)
swanky-cli/0.0.0 darwin-x64 node-v16.15.0
$ swanky --help [COMMAND]
USAGE
  $ swanky COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`swanky compile`](#swanky-compile)
* [`swanky init NAME`](#swanky-init-name)

## `swanky compile`

Compile the smart contract(s) in your contracts directory

```
USAGE
  $ swanky compile

DESCRIPTION
  Compile the smart contract(s) in your contracts directory
```

_See code: [dist/commands/compile/index.ts](https://github.com/AstarNetwork/swanky-cli/blob/v0.0.0/dist/commands/compile/index.ts)_

## `swanky init NAME`

Generate a new Ink based smart contract

```
USAGE
  $ swanky init [NAME] [-l ink|ask]

ARGUMENTS
  NAME  directory name of new project

FLAGS
  -l, --language=<option>  [default: ink]
                           <options: ink|ask>

DESCRIPTION
  Generate a new Ink based smart contract
```

_See code: [dist/commands/init/index.ts](https://github.com/AstarNetwork/swanky-cli/blob/v0.0.0/dist/commands/init/index.ts)_
<!-- commandsstop -->

## Test title
