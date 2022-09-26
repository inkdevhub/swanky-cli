## v0.2.0 (2022-09-22)

---

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
