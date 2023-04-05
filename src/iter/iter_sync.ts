type MaybeFalsy<T> = T | false | null | undefined;

export function* map<T, R>(iter: Iterable<T>, map: (i: T, a: number) => R): Generator<R> {
    let n = 0;

    for (const i of iter)
        yield map(i, n++);
}

export function* filter<T>(iter: Iterable<T>, filter: (i: T, a: number) => boolean): Generator<T> {
    let n = 0;

    for (const i of iter)
        if (filter(i, n++))
            yield i;
}

export function* filtermap<T, R>(iter: Iterable<T>, predicate: (i: T, a: number) => MaybeFalsy<R>): Generator<R> {
    let n = 0;

    for (const i of iter) {
        const r = predicate(i, n++);

        if (r)
            yield r;
    }
}

export function* concat<T>(...iter: Iterable<T>[]): Generator<T> {
    for (const i of iter)
        for (const j of i)
            yield j;
}

export function take<T>(iter: Iterable<T>, len: number = 1): [items: T[], iter: Iterable<T>] {
    let acc: T[] = [];

    for (const i of iter) {
        acc.push(i);

        if (acc.length >= len)
            return [acc, iter];
    }

    return [acc, iter];
}

export function shift<T>(iter: Iterable<T>): [T | null, Iterable<T>] {
    for (const i of iter)
        return [i, iter];

    return [null, iter];
}

export function collect<T>(iter: Iterable<T>): T[] {
    let n = 0;

    const arr: T[] = [];
    for (const i of iter)
        arr.push(i);

    return arr;
}

export function* flat<T>(...iter: Iterable<T>[]): Generator<Flat<T>> {
    const isIter = (i: any): i is Iterable<T> => i[Symbol.iterator] instanceof Function;

    for (const i of iter)
        for (const j of i)
            if (isIter(j))
                for (const k of j as Iterable<T>)
                    yield k as Flat<T>;
            else
                yield j as any;
}

export function* peekable<T>(iterator: Iterable<T>): Generator<{ current: T, skip: () => T }> {
    const iter = iterator[Symbol.iterator]();
    for (let i = iter.next(); !i.done; i = iter.next())
        yield { current: i.value, skip: () => (i = iter.next()).value };
}

export function* pipe<T, R, Options extends any[]>(iterator: Iterable<T>, generator: (input: Iterable<T>, ...options: Options) => Iterable<R>, ...options: Options): Generator<R> {
    for (const i of generator(iterator, ...options))
        yield i;
}

type Flat<T> = T extends Iterable<infer K> ? K : T;

export function* range(start: number, end: number, step: number = 1): Generator<number> {
    for (let i = start; i < end; i += step)
        yield i;
}

interface Iter<T> extends Iterable<T> {
    map<R>(predicate: (i: T, a: number) => R): Iter<R>;
    filter(predicate: (i: T, a: number) => boolean): Iter<T>;
    filtermap<R>(predicate: (i: T, a: number) => MaybeFalsy<R>): Iter<R>;
    concat(...iter: Iterable<T>[]): Iter<T>;
    peekable(): Iter<{current: T, skip: () => T}>;
    collect(): T[];
    flat(): Iter<Flat<T>>;
    pipe<R, Options extends any[]>(generator: (iter: Iterable<T>, ...options: Options) => Iterable<R>, ...options: Options): Iter<R>
}

export default function Iter<T>(iter: Iterable<T>): Iter<T> {
    return {
        [Symbol.iterator]: () => iter[Symbol.iterator](),
        map: <R>(predicate: (i: T, a: number) => R): Iter<R> => Iter(map(iter, predicate)),
        filter: (predicate: (i: T, a: number) => boolean): Iter<T> => Iter(filter(iter, predicate)),
        filtermap: <R>(predicate: (i: T, a: number) => MaybeFalsy<R>): Iter<R> => Iter(filtermap(iter, predicate)),
        concat: (...iters: Iterable<T>[]): Iter<T> => Iter(concat(iter, ...iters)),
        peekable: (): Iter<{current: T, skip: () => T}> => Iter(peekable(iter)),
        collect: (): T[] => collect(iter),
        flat: (): Iter<Flat<T>> => Iter(flat(iter)),
        pipe: <R, Options extends any[]>(generator: (iter: Iterable<T>, ...options: Options) => Iterable<R>, ...options: Options): Iter<R> => Iter(pipe(iter, generator, ...options))
    }
}