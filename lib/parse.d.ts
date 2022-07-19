declare module "@j-cake/jcake-utils/parse" {
    export namespace Lex {
        export type Nullable<T> = T | undefined | null;

        export interface Token<T extends string = string, Tok extends string = string> {
            type: T,
            src: Tok,
            charIndex: number,
            line: number,
            char: number,
            origin?: string
        }

        export type StringStream = AsyncIterable<any & { toString(): string }> | Iterable<any & { toString(): string }>;
        export type Lexer<T extends string> = (input: StringStream) => AsyncIterable<Token<T>>

        export function createLexer<T extends string>(matchers: Record<T, (tok: string) => Nullable<string>>, origin?: string): Lexer<T>
    }

    export type ASTNode<T extends string, K extends string> = {
        type: K,
        tokens: Lex.Token<T>[]
    }

    type TokenMatcher<T extends string> = {
        type?: T,
        src?: string
    };

    export interface ParserBuilder<T extends string, K extends string> {
        exactly(...parser: Array<TokenMatcher<T> | ParserBuilder<T, K>>): ParserBuilder<T, K>,

        oneOf(...parser: Array<TokenMatcher<T> | ParserBuilder<T, K>>): ParserBuilder<T, K>,

        repeat(...parser: Array<TokenMatcher<T> | ParserBuilder<T, K>>): ParserBuilder<T, K>,

        maybe(...parser: Array<TokenMatcher<T> | ParserBuilder<T, K>>): ParserBuilder<T, K>,

        exec(nextToken: AsyncIterator<Lex.Token<T>>): Promise<ASTNode<T, K>>
    }

    export function createParser<T extends string, K extends string>(name: K): ParserBuilder<T, K>;
}
