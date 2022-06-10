import assert from 'node:assert';
import chalk from 'chalk';
import StateMgr from 'jcake-utils/state';

assert.equal(typeof StateMgr, 'function');
assert.equal(typeof StateMgr.prototype.constructor, 'function');

const mgr = new StateMgr<{ name: string }>({ name: 'test' });

assert.equal(typeof mgr, 'object');
assert.ok(mgr instanceof StateMgr);

assert.equal(mgr.get().name, 'test');
assert.equal(mgr.get(), mgr.setState());

console.log(chalk.green('[Info]'), 'StateMgr test passed');