// src/parse/basic.ts
import assert from "node:assert";
import { Iter } from "@j-cake/jcake-utils/iter";
import { createParser, Lex } from "@j-cake/jcake-utils/parse";
var nums = Iter(Lex.createLexer({
  num: (tok) => tok.match(/^\d+/)?.[0],
  op: (tok) => ["+", "-", "*", "/"].find((i) => tok.startsWith(i)),
  bracket: (tok) => ["(", "[", "{", "}", "]", ")"].find((i) => tok.startsWith(i)),
  ws: (tok) => tok.match(/^\s+/)?.[0]
})([``])).filter((i) => i.type !== "ws");
var numList = await createParser("nums", (num) => num).repeat(createParser("num", (num) => num.src).oneOf({ type: "num" }, { type: "hex" })).exec(nums[Symbol.asyncIterator]());
console.log(numList);
assert(numList !== null);
//# sourceMappingURL=basic.js.map
