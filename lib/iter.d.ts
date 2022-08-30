declare module "@j-cake/jcake-utils/iter" {
    type MaybeFalsy<T> = T | false | null | undefined;

    export namespace iter {
        export function map<T, R>(iter: AsyncIterable<T>, map: (i: T, a: number) => R): AsyncGenerator<R>;
        export function filter<T>(iter: AsyncIterable<T>, filter: (i: T, a: number) => boolean): AsyncGenerator<T>;
        export function concat<T>(...iter: (AsyncIterable<T> | Iterable<T>)[]): AsyncGenerator<T>;
        export function take<T>(iter: AsyncIterable<T>, len?: number): Promise<[items: T[], iter: AsyncIterable<T>]>;
        export function shift<T>(iter: AsyncIterable<T>): Promise<[T | null, AsyncIterable<T>]>;
        export function collect<T>(iter: AsyncIterable<T>): Promise<T[]>;
        export function flat<T>(...iter: (AsyncIterable<T> | Iterable<T>)[]): AsyncGenerator<T extends AsyncIterable<infer K> ? K : T extends Iterable<infer K> ? K : T>;
        export function from<T>(iter: AsyncIterable<T> | Iterable<T>): AsyncGenerator<T>;
        export function interleave<T>(...iter: AsyncIterable<T>[]): AsyncGenerator<T>;
        export function awaitIter<T>(iter: AsyncIterable<T>): AsyncGenerator<Awaited<T>>;
        export interface IterTools<T> extends AsyncIterable<T> {
            map<R>(predicate: (i: T, a: number) => R): IterTools<R>;
            filter(predicate: (i: T, a: number) => boolean): IterTools<T>;
            concat(...iter: (AsyncIterable<T> | Iterable<T>)[]): IterTools<T>;
            flat(): IterTools<T extends AsyncIterable<infer K> ? K : T extends Iterable<infer K> ? K : T>;
            interleave(...iter: AsyncIterable<T>[]): IterTools<T>;
            await(): IterTools<Awaited<T>>
            collect(): Promise<T[]>;
        }
    }
    export function Iter<T>(iter: AsyncIterable<T> | Iterable<T>): iter.IterTools<T>;

    export namespace iterSync {
        export function map<T, R>(iter: Iterable<T>, map: (i: T, a: number) => R): Generator<R>;
        export function filter<T>(iter: Iterable<T>, filter: (i: T, a: number) => boolean): Generator<T>;
        export function filtermap<T, R>(iter: Iterable<T>, predicate: (i: T, a: number) => MaybeFalsy<R>): Generator<R>;
        export function concat<T>(...iter: Iterable<T>[]): Generator<T>;
        export function take<T>(iter: Iterable<T>, len?: number): [items: T[], iter: Iterable<T>];
        export function shift<T>(iter: Iterable<T>): [T | null, Iterable<T>];
        export function collect<T>(iter: Iterable<T>): T[];
        export function flat<T>(...iter: Iterable<T>[]): Generator<T extends Iterable<infer K> ? K : T>;
        export function peekable<T>(iterator: Iterable<T>): Generator<{ current: T, skip: () => T }>;
        export function range(start: number, end: number, step?: number): Generator<number>;
        export interface IterTools<T> extends Iterable<T> {
            map<R>(predicate: (i: T, a: number) => R): IterTools<R>;
            filter(predicate: (i: T, a: number) => boolean): IterTools<T>;
            filtermap<R>(predicate: (i: T, a: number) => MaybeFalsy<R>): IterTools<R>;
            concat(...iter: Iterable<T>[]): IterTools<T>;
            peekable(): IterTools<{ current: T, skip: () => T }>;
            collect(): T[];
            flat(): IterTools<T extends Iterable<infer K> ? K : T>;
        }
    }
    export function IterSync<T>(iter: Iterable<T>): iterSync.IterTools<T>;

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
