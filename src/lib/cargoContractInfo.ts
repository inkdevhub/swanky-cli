export interface CargoContractInkDependency {
  minCargoContractVersion: string;
  validInkVersionRange: string;
}

// Keep cargo-contract versions in descending order
// Ranges are supported by semver
export const CARGO_CONTRACT_INK_DEPS: CargoContractInkDependency[] = [
  { minCargoContractVersion: "4.0.0", validInkVersionRange: "<99.0.0" }, // Non-max version known yet: a very high version is used as fallback in the meantime
  { minCargoContractVersion: "2.2.0", validInkVersionRange: "<5.0.0" },
  { minCargoContractVersion: "2.0.2", validInkVersionRange: "<4.2.0" },
  { minCargoContractVersion: "2.0.0", validInkVersionRange: "<4.0.1" },
];
