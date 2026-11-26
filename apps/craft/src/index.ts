#!/usr/bin/env node

import { createCliProgram } from "./cli.js";

createCliProgram().parse(process.argv);
