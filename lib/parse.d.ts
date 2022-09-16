declare module "@j-cake/jcake-utils/parse" {
    export namespace strutil {
        export function splitTop(token: string, delimiter: string): string[];
        export function hasTop(str: string, has: string): boolean;
        export const trim: (str: string) => string;
        export function parseSize(size: string): number;
        export function wrapLines(string: string[], wrap: string): string[];
        export const base64: (str: string) => string;
        export const hex: (str: string) => string;
    }
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
        export type Lexer<T extends string> = (input: StringStream) => import('#iter').iter.IterTools<Token<T>>

        export function createLexer<T extends string>(matchers: Record<T, (tok: string) => Nullable<string>>, origin?: string): Lexer<T>
    }

    export type Matcher<T extends string> = {
        type?: T | T[];
        src?: string;
    } | string;

    export interface ParserBuilder<T extends string> {
        sequence(...grammar: Matcher<T>[]): ParserBuilder<T>;

        oneOf(...grammar: Matcher<T>[]): ParserBuilder<T>;

        repeat(pattern: Matcher<T>[], delimiter?: Matcher<T> & { emit?: boolean, trailing?: boolean }): ParserBuilder<T>;

        optional(grammar: Matcher<T>[]): ParserBuilder<T>;
    }

    /**
     * A parser group is used to allow parsers to parse complex structures by calling each-other recursively.
     * By grouping them together, it is possible to more efficiently call upon separate parsers unambiguously.
     *
     * @param name The name by which the parser group is identified {Unused - Reserved for future use}
     * @returns {ParserGroup<string>)}
     */
    export function createParserGroup<T extends string>(name: string): {

        /**
         * Create a parser builder.
         * Here you program in the grammar of the language or language feature you want to parse.
         *
         * @param name Name of the parser
         * @returns A parser builder
         */
        createParser(name: string): ParserBuilder<T>;
        parse<R = Lex.Token<T>[]>(tokens: AsyncIterable<Lex.Token<T>>, map?: ((tokens: Lex.Token<T>[]) => R) | undefined): Promise<R>;
    };

}

declare module "#parse" {
    export * from '@j-cake/jcake-utils/parse';
}