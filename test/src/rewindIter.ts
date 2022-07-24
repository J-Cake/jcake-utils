import assert from 'node:assert';

import RewindableIterator from "../../src/RewindIterable";

const number = async function*(): AsyncGenerator<number> {
    let i = 0;

    while (true)
        yield i++;
};

const iter = RewindableIterator(number());

for (let i = 0; i < 10; i++)
    await iter.next(); // increment by 10

iter.checkpoint(); // set checkpoint

for (let i = 0; i < 10; i++)
    await iter.next(); // increment 10 more

iter.rewind(); // rewind

for (let i = 0; i < 15; i++)
    await iter.next(); // increment 10 more

assert.deepEqual(await iter.next(), { done: false, value: 26, checkpoint: 0 });
