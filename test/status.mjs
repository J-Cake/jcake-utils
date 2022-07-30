#!/usr/bin/node
import chalk from 'chalk';
console.log(`${chalk.grey(`[${process.argv[2] == 0 ? chalk.green('PASS') : chalk.red('FAIL')}]`)} ${chalk.yellow(process.argv[3])}`);
