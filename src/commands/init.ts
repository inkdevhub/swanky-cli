import {Command, Flags} from '@oclif/core'

export default class Init extends Command {
  static description = 'describe the command here'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static flags = {
    // flag with a value (-n, --name=VALUE)
    name: Flags.string({char: 'n', description: 'name to print'}),
    // flag with no value (-f, --force)
    force: Flags.boolean({char: 'f'}),
  }

  static args = [{name: 'file'}]

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Init)

    const name = flags.name ?? 'world'
    this.log(`hello ${name} from /Users/sasapul/Work/astar/swanky/swanky-cli/src/commands/init.ts`)
    if (args.file && flags.force) {
      this.log(`you input --force and --file: ${args.file}`)
    }
  }
}
