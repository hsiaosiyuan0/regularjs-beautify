#!/usr/bin/env node

import program from "commander";
import { Formatter } from ".";
import fs from "fs";
import chalk from "chalk";

const { version } = require("../package.json");

const log = console.log;

const fatal = (msg: string) => {
  log(chalk.red(msg));
  process.exit(1);
};

const format = (file: string, opts: any) => {
  if (!fs.existsSync(file)) fatal(`file: ${file} does not exist`);
  const src = fs.readFileSync(file).toString();
  const formatter = new Formatter(src, file, 1, opts);
  const res = formatter.run();
  if (!opts.write) {
    log(res);
    return;
  }
  fs.writeFileSync(file, res);
};

program
  .version(version)
  .arguments("<file>")
  .option("-w, --write", "whether save to source file", false)
  .option("-t, --tabSize [number]", "tab size", 2)
  .option("-p, --printWidth [number]", "print width", 80)
  .action(format);

program.parse(process.argv);
