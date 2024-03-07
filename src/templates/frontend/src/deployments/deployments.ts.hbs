import { SubstrateDeployment } from '@scio-labs/use-inkathon'

import { env } from '@/config/environment'
import swankyLocalConfig from "../../../swanky.config.json";

/**
 * Add or change your custom contract ids here
 * DOCS: https://github.com/scio-labs/inkathon#2-custom-contracts
 */
export enum ContractIds {
  Flipper = 'flipper',
}

export const getDeployments = async (): Promise<SubstrateDeployment[]> => {
  const networks = env.supportedChains
  const deployments: SubstrateDeployment[] = []

  for (const networkId of networks) {
    for (const contractId of Object.values(ContractIds)) {
      const abi = await import(`../../../artifacts/${contractId}/${contractId}.json`)
      const contractDeployments = swankyLocalConfig.contracts['flipper'].deployments;
      const address = contractDeployments[contractDeployments.length - 1].address;

      deployments.push({ contractId, networkId, abi, address })
    }
  }

  return deployments
}
