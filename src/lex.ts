import * as iterSync from './iter_sync';
import Iter, * as iter from './iter';

export type Nullable<T> = T | undefined | null;

export interface Token<T extends string = string, Tok extends string = string> {
    type: T,
    src: Tok,
    charIndex: number,
    line: number,
    char: number,
    origin?: strings
}

export type StringStream = AsyncIterator<any & { toString(): string }>;
export type Lexer<T extends string> = (input: StringStream) => AsyncIterator<Token<T>>

export function createLexer<T extends string>(matchers: Record<T, (tok: string) => Nullable<string>>): Lexer<T> {

    return async function*(input: StringStream): AsyncGenerator<Token<T>> {
        let tokenBuffer: Nullable<string> = '';
        let charIndex: number = 0;

        next: for await (const token of Iter(input).map(i => i.toString()).filter(i => i.length > 0).concat(iter.from(['']))) {
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
            tokenBuffer += token;

            while (tokenBuffer.length > 0) {
                let longest: Nullable<[T, string]> = '';

                for (const [type, token] of iterSync.map(Object.entries(matchers), ([a, i]) => [a, i(tokenBuffer)]))
                    if (!token)
                        continue;
                    else if (!tokenBuffer.startsWith(token))
                        throw new Error(`Value returned from matcher must not modify the matched token`);
                    else if (token.length > (longest?.[1]?.length ?? 0))
                        longest = [type, token];

                if (!longest || longest[1].length <= 0)
                    throw `SyntaxError: Unexpected token ${tokenBuffer.split(/\s/).shift() ?? ''}`;

                if (longest[1].length < tokenBuffer.length || !token) {
                    yield {
                        type: longest[0],
                        src: longest[1],
                        charIndex,
                        char: 0,
                        line: 0
                    };

                    tokenBuffer = tokenBuffer.slice(longest[1].length);
                    charIndex += longest[1].length;
                } else break;
            }
        }

    };
}

export default createLexer;
