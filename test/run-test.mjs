#!/usr/bin/node
import cp from 'node:child_process';
import rl from 'node:readline';
import chalk from 'chalk';

/**
 * @type {number}
 */
const code = await new Promise(function (Ok) {
    const proc = cp.spawn('node', ['--enable-source-maps=true', process.argv[2]]);

    rl.createInterface(proc.stdout).on('line', line => console.log(`  \u2502  ${line}`));
    rl.createInterface(proc.stderr).on('line', line => console.error(`  \u2502  ${line}`));

    proc.on('exit', code => Ok(code));
});

console.log(`${chalk.grey(`[${code == 0 ? chalk.green('PASS') : chalk.red('FAIL')}]`)} ${chalk.yellow(process.argv[2])}`);

process.exit(code);
