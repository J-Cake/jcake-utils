declare module "jcake-utils/iterSync" {
    type MaybeFalsy<T> = T | false | null | undefined;
    export function map<T, R>(iter: Iterable<T>, map: (i: T, a: number) => R): Generator<R>;
    export function filter<T>(iter: Iterable<T>, filter: (i: T, a: number) => boolean): Generator<T>;
    export function filtermap<T, R>(iter: Iterable<T>, predicate: (i: T, a: number) => MaybeFalsy<R>): Generator<R>;
    export function concat<T>(...iter: Iterable<T>[]): Generator<T>;
    export function take<T>(iter: Iterable<T>, len?: number): [items: T[], iter: Iterable<T>];
    export function shift<T>(iter: Iterable<T>): [T | null, Iterable<T>];
    export function collect<T>(iter: Iterable<T>): T[];
    export function flat<T>(...iter: Iterable<T>[]): Generator<Flat<T>>;
    export function peekableIterator<T, R>(iterator: Iterable<T>, map: (i: T) => R, filter: (i: R) => boolean): Generator<[current: R, skip: () => R]>;
    type Flat<T> = T extends Iterable<infer K> ? K : T;
    export function range(start: number, end: number, step?: number): Generator<number>;
    interface Iter<T> extends Iterable<T> {
        map<R>(predicate: (i: T, a: number) => R): Iter<R>;
        filter(predicate: (i: T, a: number) => boolean): Iter<T>;
        filtermap<R>(predicate: (i: T, a: number) => MaybeFalsy<R>): Iter<R>;
        concat(...iter: Iterable<T>[]): Iter<T>;
        collect(): T[];
        flat(): Iter<Flat<T>>;
    }
    export default function Iter<T>(iter: Iterable<T>): Iter<T>;
    export { };
}