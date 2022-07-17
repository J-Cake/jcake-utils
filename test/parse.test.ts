import Iter from '@j-cake/jcake-utils/iter';
import { Lex, createParser, ParserBuilder } from '@j-cake/jcake-utils/parse';
import chalk from "chalk";

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

type T = typeof tokens[number]['type'];
type K = 'Value' | 'Literal' | 'ParenthesisedExpression' | 'Expression' | 'Statement' | 'Return' | 'Fn' | 'ArgList';

// noinspection JSDuplicatedDeclaration
var Expression: ParserBuilder<T, K> = null as any;
var Value = createParser<T, K>('Value')
    .oneOf(
        createParser<T, K>('Literal').oneOf({type: 'int'}/* other literals */),
        createParser<T, K>('ParenthesisedExpression').exactly({type: 'open', src: '('}, Expression, {type: 'close', src: ')'})
    )

// noinspection JSDuplicatedDeclaration
var Expression = createParser<T, K>('Expression')
    .maybe(Value)
    .repeat({type: 'operator'}, Value);

var Statement = createParser<T, K>('Statement')
    .oneOf(
        createParser<T, K>('Return').exactly({type: 'keyword', src: 'ret'}, Expression),
        /* other types of statements */
    )

var Fn = createParser<T, K>('Fn')
    .exactly({type: 'keyword', src: 'fn'}, {type: 'open', src: '('})
    .maybe(createParser<T, K>('ArgList').repeat({type: 'name'}))
    .exactly({type: 'close', src: ')'}, {type: 'open', src: '{'})
    .repeat(Statement)
    .exactly({type: 'close', src: '}'})

console.log(chalk.green('[Info]'), 'Parse test passed');
