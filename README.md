# How to use
swanky-cli installation and how-to-use guides are available in the official swanky suite [doc](https://docs.astar.network/docs/build/wasm/swanky/).

# Repository Structure

Repo is split into separate packages, and uses [Lerna](https://github.com/lerna/lerna) to handle builds/versioning.

## `cli`

Holds the cli itself, with implementation of all the commands.
Based on [oclif](https://github.com/oclif/oclif) framework

## `core`

All the shared helper and utility methods.
Look here if you're developing a plugin.

## `templates`

Holds templates for instantiating a new project,
as well as ink! and ask! contract templates.

# Local development

Clone this repo, and install with yarn/npm.

Build using Lerna command.

```
npx lerna run build
```

To build individual projects, provide the `scope` argument:

```
npx lerna run build --scope=@astar-network/swanky-core
```

Oclif provides a `dev` script to run the cli without building it, but beware, the dependencies need to be built nevertheless.

So, if you make changes to `swanky-core`, you need to build it before using it in `swanky-cli`.

# Publishing

## To npm

Be sure to run `npx lerna run build` first.

After that, run `npx lerna publish --no-private` and choose an appropriate version.

Alternatively, add version tags first with `npx lerna version`, and run `npx lerna publish --no-private from-git`

## To github

> Only `cli` is packed and released this way. The other libs must be published to npm.

Pack the cli into a tarball from the `packages/cli` directory:

```
cd packages/cli
npx oclif npx oclif pack tarballs --targets=darwin-x64,linux-x64
```

Create a release through the github interface and upload the built `.tar.gz files`.

# Plugin development

Cli supports plugins through Oclif's [plugin-plugins](https://github.com/oclif/plugin-plugins) package.

To load a local dev version of a plugin into globally installed swanky, run

```
swanky plugins:link [path_to_local_repo]
```

Example: [swanky-plugin-phala](https://github.com/AstarNetwork/swanky-plugin-phala)

# Contributing

Please submit an issue on any bug you find or an improvement suggestion you have.

PRs are also very welcome.
