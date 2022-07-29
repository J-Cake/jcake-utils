import {Iter, rewindableIterator, RewindableIterator} from "#iter";

import {Nullable, Token} from "./lex";

export * as Lex from './lex';
export * as strutil from './strutil';

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

export type MatcherList<T extends string, K extends string> = Array<TokenMatcher<T> | ParserBuilder<T, K>>;

export interface ParserBuilder<T extends string, K extends string> {
    [parser]: typeof parser

    exactly(...parser: MatcherList<T, K>): ParserBuilder<T, K>,

    oneOf(...parser: MatcherList<T, K>): ParserBuilder<T, K>,

    repeat(...parser: MatcherList<T, K>): ParserBuilder<T, K>,

    maybe(...parser: MatcherList<T, K>): ParserBuilder<T, K>,

    exec(tokens: AsyncIterable<Token<T>>): Promise<Nullable<ASTNode<T, K>>>,
}

export function exactly<T extends string, K extends string>(...matchers: MatcherList<T, K>): (tokens: RewindableIterator.RewindableAsyncIterable<Token<T>>) => Nullable<Token<T>[]> {
    return tokens => [];
}
export function oneOf<T extends string, K extends string>(...matchers: MatcherList<T, K>): (tokens: RewindableIterator.RewindableAsyncIterable<Token<T>>) => Nullable<Token<T>[]> {
    return tokens => [];
}
export function repeat<T extends string, K extends string>(...matchers: MatcherList<T, K>): (tokens: RewindableIterator.RewindableAsyncIterable<Token<T>>) => Nullable<Token<T>[]> {
    return tokens => [];
}
export function maybe<T extends string, K extends string>(...matchers: MatcherList<T, K>): (tokens: RewindableIterator.RewindableAsyncIterable<Token<T>>) => Nullable<Token<T>[]> {
    return tokens => [];
}

export function createParser<T extends string, K extends string>(name: K, parse: (tokens: Token<T>[]) => ASTNode<T, K>): ParserBuilder<T, K> {
    const parsers: Array<(tokens: RewindableIterator.RewindableAsyncIterable<Token<T>>) => Nullable<Token<T>[]>> = [];

    let ctx: ParserBuilder<T, K>;
    return ctx = {
        exactly(...parser): ParserBuilder<T, K> {
            parsers.push(exactly(...parser));
            return ctx;
        },
        oneOf(...parser): ParserBuilder<T, K> {
            parsers.push(oneOf(...parser));
            return ctx;
        },
        repeat(...parser): ParserBuilder<T, K> {
            parsers.push(repeat(...parser));
            return ctx;
        },
        maybe(...parser): ParserBuilder<T, K> {
            parsers.push(maybe(...parser));
            return ctx;
        },

        [parser]: parser,
        async exec(tokens): Promise<Nullable<ASTNode<T, K>>> {
            if (parsers.length <= 0)
                throw `No parser defined`;



            return {
                body: null,
                tokens: [],
                type: name
            };
        }
    };
}
