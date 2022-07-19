import {Nullable, Token} from "./lex";
import Iter, * as iter from "./iter";

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
    exactly(...parser: Array<TokenMatcher<T> | ParserBuilder<T, K>>): ParserBuilder<T, K>,

    oneOf(...parser: Array<TokenMatcher<T> | ParserBuilder<T, K>>): ParserBuilder<T, K>,

    repeat(...parser: Array<TokenMatcher<T> | ParserBuilder<T, K>>): ParserBuilder<T, K>,

    maybe(...parser: Array<TokenMatcher<T> | ParserBuilder<T, K>>): ParserBuilder<T, K>,

    exec(tokens: AsyncIterable<Token<T>>): Promise<Nullable<ASTNode<T, K>>>,

    parse(tokens: Token<T>[]): any,

    [parser]: typeof parser
}

const isParserBuilder = <T extends string, K extends string>(x: ParserBuilder<T, K> | TokenMatcher<T>): x is ParserBuilder<T, K> => parser in x;
const take = async function <T extends string, K extends string>(nextToken: ResumableStream<Token<T>>, matcher: ParserBuilder<T, K> | TokenMatcher<T>): Promise<any> {
    if (isParserBuilder(matcher)) {

    } else {
        const tok = await nextToken();

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

export type ResumableStream<T> = () => Promise<Nullable<T>>;
export function resumableStream<T>(iter: AsyncIterable<T>): ResumableStream<T> {
    const stream = iter[Symbol.asyncIterator]();
    return async () => await stream.next().then(res => res.value);
}

export function createParser<T extends string, K extends string>(name: K): ParserBuilder<T, K> {
    return Object.defineProperty({
        exactly(...matchers): ParserBuilder<T, K> {
            let ctx: ParserBuilder<T, K>;
            return {
                ...ctx = createParser(name),
                async exec(tokens) {
                    const next = resumableStream(tokens);
                    const cmp = await Iter(matchers)
                        .map(i => take(next, i))
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
            return createParser(name);
        },
        repeat(...matchers): ParserBuilder<T, K> {
            return createParser(name);
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
