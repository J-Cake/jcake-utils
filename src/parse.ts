export * as Lex from './lex';

export interface ParserBuilder<T extends string> {
    exactly(): ParserBuilder<T>,
    oneOf(): ParserBuilder<T>,
    repeat(): ParserBuilder<T>,
    maybe(): ParserBuilder<T>
}

export function createParser<T extends string>(name: string): ParserBuilder<T> {

}
