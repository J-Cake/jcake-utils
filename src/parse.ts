export * as Lex from './lex';

export type ASTNode<T extends string, K extends string> = {
    type: K,
    tokens: Token<T>[]
}

export interface ParserBuilder<T extends string, K extends string> {
    exactly(...parser: ParserBuilder<T>): ParserBuilder<T>,
    oneOf(...parser: ParserBuilder<T>):   ParserBuilder<T>,
    repeat(...parser: ParserBuilder<T>):  ParserBuilder<T>,
    maybe(...parser: ParserBuilder<T>):   ParserBuilder<T>,

    exec(tokens: AsyncIterable<Token<T>>): Promise<ASTNode<T, K>>
}

export function createParser<T extends string, K extends string>(name: K): ParserBuilder<T> {
    const parser: ParserBuilder<T, K> = {

    };

    return parser;
}
