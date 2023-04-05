import assert from 'node:assert';

import { Iter, IterSync } from "../../src/iter";

assert.deepEqual(await Iter([1, 2, 3, 4, 5])
    .pipe(async function*(iter) {
        for await (const i of iter)
            yield i ** 2;
    })
    .collect(), [1, 4, 9, 16, 25]);

assert.deepEqual(IterSync([1, 2, 3, 4, 5])
    .pipe(function*(iter) {
        for (const i of iter)
            yield i ** 2;
    })
    .collect(), [1, 4, 9, 16, 25]);