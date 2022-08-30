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
        export type Lexer<T extends string> = (input: StringStream) => import('@j-cake/jcake-utils/iter').iter.IterTools<Token<T>>

        export function createLexer<T extends string>(matchers: Record<T, (tok: string) => Nullable<string>>, origin?: string): Lexer<T>
    }

    type Matcher<T extends string> = {
        type?: T | T[],
        src?: string
    } | string;

    export interface ParserBuilder<T extends string> {
        sequence(...grammar: Matcher<T>[]): ParserBuilder<T>,
        oneOf(...grammar: Matcher<T>[]): ParserBuilder<T>,
        repeat(...grammar: Matcher<T>[]): ParserBuilder<T>,
        optional(grammar: Matcher<T>[]): ParserBuilder<T>,

        exec(iter: AsyncIterable<Lex.Token<T>>): Promise<void> // TODO: Decide on return type
    }

    export function createParser<T extends string>(name: string): ParserBuilder<T>;
}
