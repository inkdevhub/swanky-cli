#!/usr/bin/env node

const oclif = await import("@oclif/core");
await oclif.execute({ type: "esm", dir: import.meta.url });
