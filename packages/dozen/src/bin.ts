#!/usr/bin/env node

import program from "commander";
import fs from "fs";
import { fatal, formatFile } from ".";

const { version } = require("../package.json");

const doFormat = (file: string, opts: any) => {
  if (!fs.existsSync(file)) fatal(`file: ${file} does not exist`);
  formatFile(file, opts);
};

program
  .version(version)
  .arguments("<file>")
  .option("-t, --tabSize [number]", "tab size", 2)
  .option("-p, --printWidth [number]", "print width", 80)
  .action(doFormat);

program.parse(process.argv);
