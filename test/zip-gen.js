import cp from 'node:child_process';
import Iter, * as iter from 'jcake-utils/iter';

const proc = cp.spawn('git', ['status']);

for await (const i of iter.interleave(proc.stdout, proc.stderr))
    console.log(i.toString());

console.log(`Aight, that's it`)