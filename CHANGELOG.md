
## v0.3.0 (2022-11-01)

### Features

- Add Ask! language support and templates
- Update config schema to properly track builds/deployments
- store builds in common `/artefacts` folder

### Trivial changes

- [Deployments management](https://github.com/AstarNetwork/swanky-cli/issues/12)
- [Populate Contracts field on init](https://github.com/AstarNetwork/swanky-cli/issues/21)
- [Move common methods and types to lib](https://github.com/AstarNetwork/swanky-cli/issues/16)

## v0.2.1 (2022-10-19)

### Trivial changes

- add node version requirements to package.json and template
- update ink! to 3.3.0

## v0.2.0 (2022-09-22)

### Features

- [Secure account management](https://github.com/AstarNetwork/swanky-cli/pull/15)
- [Multi contract support](https://github.com/AstarNetwork/swanky-cli/pull/14)
- [Configurable network params](https://github.com/AstarNetwork/swanky-cli/pull/10)

### Breaking changes

#### Contract related commands are now under `swanky contract`

`compile`, `deploy` and `call` are no longer stand-alone commands, but are callable as subcommands of `swanky contract`.

### Trivial changes

- removed `enquirer` dependency
- cleaned up dependencies
