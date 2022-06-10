import assert from 'node:assert';
import chalk from 'chalk';
import msgChannel from 'jcake-utils/msg';

assert.equal(typeof msgChannel, 'function');

console.log(chalk.green('[Info]'), 'MsgChannel test passed');