import {Iter, iter, iterSync} from '#iter';

/* Streaming lexer:
 * Streaming tokens is tricky because a lexer needs to be able handle cases where the token is valid, but other matches exist, but require looking further ahead.
 * For instance, take integers:
 *   the number 1234 could be matched as 1, 2, 3, 4 as separate tokens.
 * To overcome this, the lexer takes the longest matching string and assumes it is the most optimal match.
 * When streaming is introduced, the issue of being able to see theoretically to the end of the string stream becomes non-certain.
 * Thus, for the lexer to be able to correctly tokenise such cases, we must assume that there exists a match which requires pieces of the following chunk.
 * It is entirely possible for a token match to span multiple chunks, but is increasingly unlikely.
 * Hence, it is assumed that no match includes the very end of the buffered region, the token is assumed to be valid.
 */
// 1. continue searching for matches until the longest token reaches the end of the currently buffered string.
// This is done, in case the matched token is valid, but not the longest possible token.
// 2. run buffered string through matcher list
// 3. emit longest match

export type Nullable<T> = T | void | undefined | null;

export interface Token<T extends string = string, Tok extends string = string> {
    type: T,
    src: Tok,
    charIndex: number,
    line: number,
    char: number,
    origin?: string
}

export type StringStream = AsyncIterable<any & { toString(): string }>;
export type Lexer<T extends string> = (input: StringStream) => iter.IterTools<Token<T>>

export function createLexer<T extends string>(matchers: Record<T, (tok: string) => Nullable<string>>, origin?: string): Lexer<T> {
    const lex = async function* (input: StringStream | string): AsyncGenerator<Token<T>> {
        let tokenBuffer: string = '';
        let charIndex: number = 0;

        const toIter = function (stream: StringStream | string): AsyncIterable<any & { toString(): string }> {
            if (typeof stream == 'object' && stream[Symbol.asyncIterator])
                return stream;
            else if (typeof stream == 'object')
                return iter.from(stream);
            else return iter.from([stream]);
        }

        for await (const chunk of Iter(toIter(input)).map(i => i.toString()).filter(i => i.length > 0).concat(iter.from(['']))) {
            tokenBuffer += chunk;

            while (tokenBuffer.length > 0) {
                let longest: Nullable<[T, string]>;

                for (const [type, token] of iterSync.map(Object.entries(matchers) as Iterable<[T, (tok: string) => Nullable<string>]>, ([a, i]) => [a, i(tokenBuffer)] as [T, Nullable<string>]))
                    if (!token)
                        continue;
                    else if (!tokenBuffer.startsWith(token))
                        throw new Error(`Value returned from matcher must not modify the matched token`);
                    else if (token.length > (longest?.[1]?.length ?? 0))
                        longest = [type, token];

                if (!longest || longest[1].length <= 0)
                    throw `SyntaxError: Unexpected token ${tokenBuffer.split(/\s/).shift() ?? ''}`;

                if (longest[1].length < tokenBuffer.length || !chunk) {
                    yield {
                        type: longest[0],
                        src: longest[1],
                        charIndex,
                        char: 0,
                        line: 0,
                        origin
                    };

                    tokenBuffer = tokenBuffer.slice(longest[1].length);
                    charIndex += longest[1].length;
                } else break;
            }
        }

    };

    return (stream: StringStream | string) => Iter(lex(stream));
}

export function isToken<T extends string>(obj: any): obj is Token<T> {
    return !(typeof obj !== 'object'
        || typeof obj['type'] !== 'string'
        || typeof obj['src'] !== 'string'
        || typeof obj['charIndex'] !== 'number'
        || typeof obj['line'] !== 'number'
        || typeof obj['char'] !== 'number'
        || !(['undefined', 'string'].includes(typeof obj['origin'])));
}

export default createLexer;
