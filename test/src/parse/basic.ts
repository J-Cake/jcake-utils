import assert from "node:assert";
import {createParser, Lex} from "@j-cake/jcake-utils/parse";

const nums = Lex.createLexer({
    num: tok => tok.match(/^\d+/)?.[0],
    op: tok => ['+', '-', '*', '/'].find(i => tok.startsWith(i)),
    bracket: tok => ['(', '[', '{', '}', ']', ')'].find(i => tok.startsWith(i)),
    ws: tok => tok.match(/^\s+/)?.[0],
})([``])
    .filter(i => i.type !== 'ws');

type T = typeof nums extends AsyncIterable<Lex.Token<infer M>> ? M : never;

const numList = createParser<T>('nums')
    .repeat({ type: 'num' }, { type: 'op' })

console.log(numList);
assert(numList !== null);
