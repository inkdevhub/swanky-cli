import {Command} from '@oclif/core'
import {createEnv} from 'yeoman-environment'

export abstract class GeneratorBase extends Command {
  protected generate(
    type: string,
    generatorOptions: Record<string, unknown> = {},
  ): void {
    const env = createEnv()

    env.register(require.resolve(`./generators/${type}`), `init:${type}`)

    env.run(`init:${type}`, generatorOptions)
  }
}
