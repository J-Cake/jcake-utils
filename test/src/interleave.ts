import cp from 'node:child_process';
import assert from 'node:assert';
import {Iter} from '@j-cake/jcake-utils/iter';

const proc = cp.spawn('git', ['status']);

const out = await Iter(proc.stdout)
    .interleave(proc.stderr)
    .map((i: Buffer) => i.toString('utf8'))
    .collect();

assert(Array.isArray(out))
assert(out.length > 0);
assert(out.every(i => typeof i == 'string'));

console.log(out.join(''));