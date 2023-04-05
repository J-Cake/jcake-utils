declare module "@j-cake/jcake-utils/iter" {
    export namespace iter {
        export function map<T, R>(iter: AsyncIterable<T>, map: (i: T, a: number) => R): AsyncGenerator<R>;
        export function filter<T>(iter: AsyncIterable<T>, filter: (i: T, a: number) => boolean): AsyncGenerator<T>;
        export function concat<T>(...iter: (AsyncIterable<T> | Iterable<T>)[]): AsyncGenerator<T>;
        export function take<T>(iter: AsyncIterable<T>, len?: number): Promise<[items: T[], iter: AsyncIterable<T>]>;
        export function shift<T>(iter: AsyncIterable<T>): Promise<[T | null, AsyncIterable<T>]>;
        export function collect<T>(iter: AsyncIterable<T>): Promise<T[]>;
        export function flat<T>(...iter: (AsyncIterable<T> | Iterable<T>)[]): AsyncGenerator<Flat<T>>;
        export function from<T>(iter: AsyncIterable<T> | Iterable<T>): AsyncGenerator<T>;
        export function interleave<T>(...iter: AsyncIterable<T>[]): AsyncGenerator<T>;
        export function awaitIter<T>(iter: AsyncIterable<T>): AsyncGenerator<Awaited<T>>;
        export function pipe<T, R, Options extends any[]>(iterator: AsyncIterable<T> | Iterable<T>, generator: (input: AsyncIterable<T> | Iterable<T>, ...options: Options) => AsyncIterable<R>, ...options: Options): AsyncGenerator<R>;
        type Flat<T> = T extends AsyncIterable<infer K> ? K : T extends Iterable<infer K> ? K : T;
        interface Iter<T> extends AsyncIterable<T> {
            map<R>(predicate: (i: T, a: number) => R): Iter<R>;
            filter(predicate: (i: T, a: number) => boolean): Iter<T>;
            concat(...iter: (AsyncIterable<T> | Iterable<T>)[]): Iter<T>;
            flat(): Iter<Flat<T>>;
            interleave(...iter: AsyncIterable<T>[]): Iter<T>;
            await(): Iter<Awaited<T>>
            collect(): Promise<T[]>;
            pipe<R, Options extends any[]>(generator: (iter: AsyncIterable<T> | Iterable<T>, ...options: Options) => AsyncIterable<R>, ...options: Options): Iter<R>
        }
    }
    export function Iter<T>(iter: AsyncIterable<T> | Iterable<T>): iter.Iter<T>;

    export namespace iterSync {
        type MaybeFalsy<T> = T | false | null | undefined;
        export function map<T, R>(iter: Iterable<T>, map: (i: T, a: number) => R): Generator<R>;
        export function filter<T>(iter: Iterable<T>, filter: (i: T, a: number) => boolean): Generator<T>;
        export function filtermap<T, R>(iter: Iterable<T>, predicate: (i: T, a: number) => MaybeFalsy<R>): Generator<R>;
        export function concat<T>(...iter: Iterable<T>[]): Generator<T>;
        export function take<T>(iter: Iterable<T>, len?: number): [items: T[], iter: Iterable<T>];
        export function shift<T>(iter: Iterable<T>): [T | null, Iterable<T>];
        export function collect<T>(iter: Iterable<T>): T[];
        export function flat<T>(...iter: Iterable<T>[]): Generator<Flat<T>>;
        export function peekable<T>(iterator: Iterable<T>): Generator<{ current: T, skip: () => T }>;
        export function pipe<T, R, Options extends any[]>(iterator: Iterable<T>, generator: (input: Iterable<T>, ...options: Options) => Iterable<R>, ...options: Options): Generator<R>;
        type Flat<T> = T extends Iterable<infer K> ? K : T;
        export function range(start: number, end: number, step?: number): Generator<number>;
        interface Iter<T> extends Iterable<T> {
            map<R>(predicate: (i: T, a: number) => R): Iter<R>;
            filter(predicate: (i: T, a: number) => boolean): Iter<T>;
            filtermap<R>(predicate: (i: T, a: number) => MaybeFalsy<R>): Iter<R>;
            concat(...iter: Iterable<T>[]): Iter<T>;
            peekable(): Iter<{ current: T, skip: () => T }>;
            collect(): T[];
            flat(): Iter<Flat<T>>;
            pipe<R, Options extends any[]>(generator: (iter: Iterable<T>, ...options: Options) => Iterable<R>, ...options: Options): Iter<R>;
        }
    }
    export function IterSync<T>(iter: Iterable<T>): iterSync.Iter<T>;

    export namespace RewindableIterator {
        export function rewindableIterator<T>(iter: AsyncIterable<T>): RewindableAsyncIterator<T>
        export type RewindableIteratorResult<T> = { done: false, value: T, checkpoint: number }
            | { done: true, value: undefined, checkpoint: number };
        export type RewindableAsyncIterator<T> = {
            checkpoint(): number, // checkpoint number
            rewind(checkpoint?: number): number,
            next(): Promise<RewindableIteratorResult<T>>
        };
    }

    export type RewindableAsyncIterable<T> = { [Symbol.asyncIterator]: () => RewindableIterator.RewindableAsyncIterator<T> }

    export { };
}
