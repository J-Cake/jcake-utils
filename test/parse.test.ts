import Iter from '@j-cake/jcake-utils/iter';
import { Lex, createParser } from '@j-cake/jcake-utils/parse';

const lex = Lex.createLexer({
    open: tok => ['(', '[', '{'].find(i => tok.startsWith(i)),
    close: tok => [')', ']', '}'].find(i => tok.startsWith(i)),
    name: tok => tok.match(/^[a-z$_][a-z0-9$_]*/i)?.[0],
    keyword: tok => ['fn', 'ret', 'loop', 'ptr', 'drf', 'call'].find(i => tok.startsWith(i)),
    int: tok => tok.match(/^-?d?\d+/)?.[0],
    operator: tok => ['+', '-', '*', '/', '='].find(i => tok.startsWith(i)),
    punct: tok => [','].find(i => tok.startsWith(i)),
    comment: tok => tok.match(/^#.*/)?.[0],
    whitespace: tok => tok.match(/^;?\s+/)?.[0]
});

const tokens = await Iter(lex([`fn main(argv, argc) {
    ret 0 + 10
}`]))
    .filter(i => i.type !== 'whitespace' || i.src.includes(';'))
    .collect();

var Value = createParser('Value')
    .oneOf(
        createParser('Literal').oneOf({type: 'int'}/* other literals */),
        createParser('ParenthesisedExpression').exactly({type; 'open', src: '('}, Expression, {type: 'close', src: ')'})
    )

var Expression = createParser('Expression')
    .maybe(Value)
    .repeat({type: 'operator'}, Value);

var Statement = createParser('Statement')
    .oneOf(
        createParser('Return').exactly({type: 'keyword', src: 'ret'}, Expression),
        /* other types of statements */
    )

var Fn = createParser('Fn')
    .exactly({type: 'keyword', src: 'fn'}, {type: 'open', src: '('})
    .maybe(createParser('ArgList').repeat({type: 'name'}))
    .exactly({type: 'close', src: ')'}, {type: 'open', src: '{'})
    .repeat(Statement)
    .exactly({type: 'close', src: '}'})

