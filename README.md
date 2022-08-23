# Swanky CLI

<!-- toc -->

- [Swanky CLI](#swanky-cli)
- [Usage](#usage)
- [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g @astar-network/swanky-cli
$ swanky COMMAND
running command...
$ swanky (--version|-V|-v)
@astar-network/swanky-cli/0.1.5 darwin-x64 node-v18.2.0
$ swanky --help [COMMAND]
USAGE
  $ swanky COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`swanky help [COMMAND]`](#swanky-help-command)
- [`swanky version`](#swanky-version)

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

_See code: [@oclif/plugin-version](https://github.com/oclif/plugin-version/blob/v1.1.1/src/commands/version.ts)_

<!-- commandsstop -->

# Config

A newly generated project will have a `swanky.config.json` file.

## Example:

```json
{
  "platform": "darwin",
  "project_name": "temp_project",
  "language": "ink",
  "contractTemplate": "flipper",
  "node": {
    "type": "swanky",
    "url": "https://github.com/AstarNetwork/swanky-node/releases/download/v0.10.0/swanky-node-v0.10.0-macOS-x86_64.tar.gz",
    "supportedInk": "v3.3.1",
    "localPath": "~/temp_project/bin/swanky-node",
    "nodeAddress": "ws://127.0.0.1:9944"
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
  "author": {
    "name": "myName",
    "email": "my@e.mail"
  },
  "contractName": "flipper",
  "contracts": [
    {
      "name": "flipper",
      "address": ""
    },
    {
      "name": "flipper",
      "address": "5DwMrWz6sv2d5haLdURq8NkHpHg8WrkiEpqjDzN24AYBkW3X"
    }
  ]
}
```

## Notes:

- config file format is very likely to change as the tool is under active development
- `contracts` section keeps history of all deployments of specific contract
- `accounts` should ONLY hold dev accounts. The more secure solution will be added in the upcoming release
- at runtime, only `localPath` and `nodeAddress` fields of `node` object are being used.
