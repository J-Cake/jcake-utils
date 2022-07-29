// src/parse/lang.ts
import { Iter } from "@j-cake/jcake-utils/iter";
import { Lex } from "@j-cake/jcake-utils/parse";
var lex = Lex.createLexer({
  open: (tok) => ["(", "[", "{"].find((i) => tok.startsWith(i)),
  close: (tok) => [")", "]", "}"].find((i) => tok.startsWith(i)),
  name: (tok) => tok.match(/^[a-z$_][a-z0-9$_]*/i)?.[0],
  keyword: (tok) => ["fn", "ret", "loop", "ptr", "drf", "call"].find((i) => tok.startsWith(i)),
  int: (tok) => tok.match(/^-?d?\d+/)?.[0],
  operator: (tok) => ["+", "-", "*", "/", "="].find((i) => tok.startsWith(i)),
  punctuator: (tok) => [","].find((i) => tok.startsWith(i)),
  comment: (tok) => tok.match(/^#.*/)?.[0],
  whitespace: (tok) => tok.match(/^;?\s+/)?.[0]
});
var tokens = await Iter(lex([`fn main(argv, argc) {
    ret 0 + 10
}`])).filter((i) => i.type !== "whitespace" || i.src.includes(";"));
//# sourceMappingURL=lang.js.map
