#!/usr/bin/env ts-node

import "@polkadot/api-augment";

const oclif = await import("@oclif/core");
await oclif.execute({ type: "esm", development: true, dir: import.meta.url });
