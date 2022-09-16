import {createParserGroup, Lex} from "@j-cake/jcake-utils/parse";

const lex = Lex.createLexer({
    num: tok => tok.match(/^\d+/)?.[0],
    op: tok => ['+', '-', '*', '/'].find(i => tok.startsWith(i)),
    bracket: tok => ['(', '[', '{', '}', ']', ')'].find(i => tok.startsWith(i)),
    comma: tok => [','].find(i => tok.startsWith(i)),
    ws: tok => tok.match(/^\s+/)?.[0],
});

const lang = createParserGroup('Lang');

const numList = lang.createParser('nums')
    .repeat([{type: 'num'}], {type: 'comma', emit: false, trailing: true})

console.log("AST", await lang.parse(lex([`1, 2, 3`])
    .filter(i => i.type !== 'ws')));