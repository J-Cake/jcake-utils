// src/parse/lex.ts
import assert from "node:assert";
import { Lex } from "@j-cake/jcake-utils/parse";
import { iter } from "@j-cake/jcake-utils/iter";
var lexer = Lex.createLexer({
  comment: (tok) => tok.match(/^#.*/)?.[0],
  newline: (tok) => tok.match(/^\r?\n/)?.[0]
});
var tokens = await iter.collect(lexer(iter.from([
  "#hello world",
  "I actually continue into the next chunk\n#next token",
  "As do I"
])));
assert.equal(tokens.length, 3);
//# sourceMappingURL=lex.js.map
