declare module "@j-cake/jcake-utils/iter" {
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
    type Flat<T> = T extends AsyncIterable<infer K> ? K : T extends Iterable<infer K> ? K : T;
    interface Iter<T> extends AsyncIterable<T> {
        map<R>(predicate: (i: T, a: number) => R): Iter<R>;
        filter(predicate: (i: T, a: number) => boolean): Iter<T>;
        concat(...iter: (AsyncIterable<T> | Iterable<T>)[]): Iter<T>;
        flat(): Iter<Flat<T>>;
        interleave(...iter: AsyncIterable<T>[]): Iter<T>;
        await(): Iter<Awaited<T>>
        collect(): Promise<T[]>;
    }
    export default function Iter<T>(iter: AsyncIterable<T> | Iterable<T>): Iter<T>;
    export { };

}