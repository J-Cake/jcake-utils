import {Nullable, Token} from "./lex";
import Iter from "./iter";

export * as Lex from './lex';

export type ASTNode<T extends string, K extends string> = {
    type: K,
    tokens: Token<T>[],
    body: any
}

export interface TokenMatcher<T extends string> {
    type?: T | T[],
    src?: T
}

const parser = Symbol.for('parser');

export interface ParserBuilder<T extends string, K extends string> {
    [parser]: typeof parser

    exactly(...parser: Array<TokenMatcher<T> | ParserBuilder<T, K>>): ParserBuilder<T, K>,

    oneOf(...parser: Array<TokenMatcher<T> | ParserBuilder<T, K>>): ParserBuilder<T, K>,

    repeat(...parser: Array<TokenMatcher<T> | ParserBuilder<T, K>>): ParserBuilder<T, K>,

    maybe(...parser: Array<TokenMatcher<T> | ParserBuilder<T, K>>): ParserBuilder<T, K>,

    exec(tokens: AsyncIterator<Token<T>>): Promise<Nullable<ASTNode<T, K>>>,

    parse(tokens: Token<T>[]): any,
}

const isParserBuilder = <T extends string, K extends string>(x: ParserBuilder<T, K> | TokenMatcher<T>): x is ParserBuilder<T, K> => parser in x;
const take = async function <T extends string, K extends string>(stream: AsyncIterator<Token<T>>, matcher: ParserBuilder<T, K> | TokenMatcher<T>): Promise<any> {
    if (isParserBuilder(matcher))
        return await matcher.exec(stream);
    else {
        const {value: tok} = await stream.next();

        if (!tok)
            return null;

        if (matcher.type)
            if (Array.isArray(matcher.type)) {
                if (!matcher.type.some(i => tok.type == i))
                    return null;
            } else if (matcher.type !== tok.type)
                return null;

        if (matcher.src)
            if (matcher.src !== tok.src)
                return null;

        return tok;
    }
}

export function createParser<T extends string, K extends string>(name: K): ParserBuilder<T, K> {
    return Object.defineProperty({
        exactly(...matchers): ParserBuilder<T, K> {
            let ctx: ParserBuilder<T, K>;
            return {
                ...ctx = createParser(name),
                async exec(tokens) {
                    const cmp = await Iter(matchers)
                        .map(i => take(tokens, i))
                        .await()
                        .collect();

                    if (cmp.some(i => !i))
                        return null;

                    return {
                        tokens: [],
                        type: name,

                        body: ctx.parse(cmp)
                    };
                }
            }
        },
        maybe(...matchers): ParserBuilder<T, K> {
            return createParser(name);
        },
        oneOf(...matchers): ParserBuilder<T, K> {
            let ctx: ParserBuilder<T, K>;
            return {
                ...ctx = createParser(name),
                async exec(tokens) {
                    const token = await take(tokens, ctx);
                    for (const i of matchers) {
                        const res = await take(tokens, i);
                        if (res)
                            return ctx.parse([token])
                    }
                }
            }
        },
        repeat(...matchers): ParserBuilder<T, K> {
            let ctx: ParserBuilder<T, K>;
            return {
                ...ctx = createParser(name),
                async exec(tokens) {
                    const matches: any[] = [];
                    outer: do {
                        for (const i of matchers)
                            if (matches.length > 0 && !matches.at(-1))
                                break outer;
                            else
                                matches.push(await take(tokens, i))
                        if (matches.length <= 0)
                            return null;
                    } while (matches.at(-1))

                    return ctx.parse(matches);
                }
            };
        },

        [parser]: parser, // yes this is a parser
        async exec(tokens): Promise<ASTNode<T, K>> {
            throw `No parsing pattern defined`;
        },
        parse(tokens: Token<T>[]) {
            return tokens;
        }
    }, parser, {enumerable: false, writable: false}) as ParserBuilder<T, K>;
}
