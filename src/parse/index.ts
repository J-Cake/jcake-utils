import _ from 'lodash';
import StateManager from '#state';
import {rewindableIterator, RewindableIterator} from "#iter";

import {Nullable, Token} from "./lex";

export * as Lex from './lex';
export * as strutil from './strutil';

export type Matcher<T extends string> = {
    type?: T | T[],
    src?: string
} | string;

export interface ParserBuilder<T extends string> {
    sequence(...grammar: Matcher<T>[]): ParserBuilder<T>,

    oneOf(...grammar: Matcher<T>[]): ParserBuilder<T>,

    repeat(pattern: Matcher<T>[], delimiter?: Matcher<T> & Partial<{ emit: boolean, trailing: boolean }>): ParserBuilder<T>,

    optional(grammar: Matcher<T>[]): ParserBuilder<T>,
}

const assert = <T>(x: any): x is T => true; // assert that x is of type T
type TokenStream<T extends string> = RewindableIterator.RewindableAsyncIterator<Token<T>>;

/**
 * Get the argument list of a function
 */
type Args<T extends Function> = T extends (...x: infer K) => void ? K : never;
/**
 * Represents what a `ParserBuilder<T>` does internally
 */
type Parser<T extends string> = ParserBuilder<T> & {
    exec(iter: TokenStream<T>, fail: () => void): Promise<any>, // TODO: Replace with actual return type
};
/**
 * Functions which do the actual parsing of the token list.
 */
type ParserFn<T extends string> = (tokens: TokenStream<T>) => Nullable<Token<T>[]>;
const GenericParser: <T extends string>() => { [K in keyof ParserBuilder<T>]: ((this: Parser<T>, ...args: Args<ParserBuilder<T>[K]>) => ParserFn<T>) } = <T extends string>() => ({
    sequence: (...grammar) => function (tokens) {
    },

    oneOf: (...grammar) => function (tokens) {
    },

    repeat: (pattern, delimiter?) => function (tokens) {
    },

    optional: (grammar) => function (tokens) {
    }
});

/**
 * A parser group is used to allow parsers to parse complex structures by calling each-other recursively.
 * By grouping them together, it is possible to more efficiently call upon separate parsers unambiguously.
 *
 * @param name The name by which the parser group is identified {Unused - Reserved for future use}
 * @returns {ParserGroup<string>)}
 */
export function createParserGroup<T extends string>(name: string) {
    const group = new StateManager<Record<string, Parser<T>>>({});
    const exec = Symbol.for('parser_exec');

    const handleMatcher = async function (matcher: Matcher<T>, tokens: AsyncIterator<Token<T>>, fail: () => void): Promise<Nullable<any[]>> {
        if (!matcher)
            throw `Invalid matcher encountered`;

        if (typeof matcher == 'string')
            return await group.get()[matcher][exec](tokens, fail);
        else {
            if (!assert<{ type?: T | T[], src?: string }>(matcher)) // does nothing, but keeps TS happy
                return null;

            const {value: token, done: tokenStreamDone} = await tokens.next();

            if (!token || tokenStreamDone)
                return null;

            if (!(matcher.src ? matcher.src == token.src : true) || !(matcher.type ? (Array.isArray(matcher.type) ? matcher.type : [matcher.type]).includes(token.type) : true))
                return null;

            else return [token];
        }
    }

    return {
        /**
         * Create a parser builder.
         * Here you program in the grammar of the language or language feature you want to parse.
         *
         * @param name Name of the parser
         * @returns A parser builder
         */
        createParser(name?: string): ParserBuilder<T> {
            const sequence: ((iter: TokenStream<T>) => Nullable<Token<T>[]>)[] = [];
            const builder: ParserBuilder<T> = _.mapValues(GenericParser(), (i: Function) => (...x: any[]): ParserBuilder<T> => (sequence.push(i.call(builder, x)), builder))  // auto bind and `return this`

            const parser: Parser<T> = Object.defineProperty(builder, 'exec', function (tokens: TokenStream<T>): Nullable<Token<T>[]> {
                // what happens when we run the parser.
                // Step through the `sequence` array until a `null`ish value is found. In this case, the parser fails. returning `null` itself.
                // The user is responsible for handling the rewinding of failed parsers.

                const used: Token<T>[] = [];
                for (const i of sequence) {
                    const step = i(tokens);

                    if (!step)
                        return null;

                    used.push(...step);
                }

                return used;
            }) as Parser<T>;

            if (name) {
                if (name in group.get())
                    throw `Parser already exists.`;

                return group.setState({[name]: builder as any})[name];
            } else // anonymous parser
                return builder;
        },

        async parse(tokens: AsyncIterable<Token<T>>, expected?: string[]): Promise<any> {
            const iter = tokens[Symbol.asyncIterator]();
            const rewind = rewindableIterator({[Symbol.asyncIterator]: () => ({next: async () => await iter.next()})});

            const parser = _.chain(group.get())
                .pickBy((i, a) => expected ? expected.includes(a) : true)
                .entries()
                .value();

            rewind.checkpoint();
            const parsers = parser[Symbol.iterator]();

            for (var {value: [a, i] = [undefined, undefined], done} = parsers.next() as { value: [string, Parser<T>], done?: boolean }; !done; {value: [a, i] = [undefined, undefined], done} = parsers.next()) {
                if (!i) continue;

                const value = await i.exec(rewind, () => void [rewind.rewind()]);
                console.log("Value:", value);
            }
        }
    }
}