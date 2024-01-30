export interface CargoContractInkDependency {
  minCargoContractVersion: string;
  inkVersion: string;
}
export const CARGO_CONTRACT_INK_DEPS: CargoContractInkDependency[] = [
  { minCargoContractVersion: "4.0.0", inkVersion: "5.0.0" },
  { minCargoContractVersion: "2.2.0", inkVersion: "4.2.0" },
  { minCargoContractVersion: "2.0.2", inkVersion: "4.0.1" },
  { minCargoContractVersion: "2.0.0", inkVersion: "4.0.0" },
];
