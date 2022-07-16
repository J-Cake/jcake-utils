import {Lex} from '@j-cake/jcake-utils/parse';
import * as iter from '@j-cake/jcake-utils/iter'

const lexer = Lex.createLexer({
    comment: tok => tok.match(/^#.*/)?.[0],
    newline: tok => tok.match(/^\r?\n/)?.[0]
});


const tokens = await iter.collect(lexer(iter.from([
    '#hello world',
    'I actually continue into the next chunk\n#next token',
    'As do I'
])));

console.log(tokens);
