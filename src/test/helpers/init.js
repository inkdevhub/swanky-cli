/* eslint-disable no-undef */
import path from "node:path";

import process from "node:process";

process.env.TS_NODE_PROJECT = path.resolve("test/tsconfig.json");
process.env.NODE_ENV = "development";

global.oclif = global.oclif || {};
global.oclif.columns = 80;
