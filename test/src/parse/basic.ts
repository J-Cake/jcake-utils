import assert from "node:assert";

import {Iter} from "@j-cake/jcake-utils/iter";
import {createParser, Lex} from "@j-cake/jcake-utils/parse";

const nums = Iter(Lex.createLexer({
    num: tok => tok.match(/^\d+/)?.[0],
    op: tok => ['+', '-', '*', '/'].find(i => tok.startsWith(i)),
    bracket: tok => ['(', '[', '{', '}', ']', ')'].find(i => tok.startsWith(i)),
    ws: tok => tok.match(/^\s+/)?.[0],
})([``]))
    .filter(i => i.type !== 'ws');

type T = typeof nums extends AsyncIterable<Lex.Token<infer M>> ? M : never;
type K = string;

const numList = await createParser<T, K>('nums', num => num)
    .repeat(createParser<T, K>('num', (num: Lex.Token<T>) => num.src)
        .oneOf({type: 'num'}, {type: 'hex'}))
    .exec(nums[Symbol.asyncIterator]());

console.log(numList);
assert(numList !== null);
