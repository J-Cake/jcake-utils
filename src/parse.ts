import {Token} from "./lex";

export * as Lex from './lex';

export type ASTNode<T extends string, K extends string> = {
    type: K,
    tokens: Token<T>[]
}

type TokenMatcher<T extends string> = {
    type?: T,
    src?: T
};

export interface ParserBuilder<T extends string, K extends string> {
    exactly(...parser: Array<TokenMatcher<T> | ParserBuilder<T, K>>): ParserBuilder<T, K>,

    oneOf(...parser: Array<TokenMatcher<T> | ParserBuilder<T, K>>): ParserBuilder<T, K>,

    repeat(...parser: Array<TokenMatcher<T> | ParserBuilder<T, K>>): ParserBuilder<T, K>,

    maybe(...parser: Array<TokenMatcher<T> | ParserBuilder<T, K>>): ParserBuilder<T, K>,

    exec(tokens: AsyncIterable<Token<T>>): Promise<ASTNode<T, K>>
}

export function createParser<T extends string, K extends string>(name: K): ParserBuilder<T, K> {
    return {
        exactly(...matchers): ParserBuilder<T, K> {
            return undefined as any;
        },
        maybe(...matchers): ParserBuilder<T, K> {
            return undefined as any;
        },
        oneOf(...matchers): ParserBuilder<T, K> {
            return undefined as any;
        },
        repeat(...matchers): ParserBuilder<T, K> {
            return undefined as any;
        },

        async exec(tokens: AsyncIterable<Token<T>>): Promise<ASTNode<T, K>> {
            return undefined as any;
        }
    }
}
