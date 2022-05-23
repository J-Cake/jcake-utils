export async function* map<T, R>(iter: AsyncIterable<T>, map: (i: T, a: number) => R): AsyncGenerator<R> {
    let n = 0;

    for await (const i of iter)
        yield map(i, n++);
}

export async function* filter<T>(iter: AsyncIterable<T>, filter: (i: T, a: number) => boolean): AsyncGenerator<T> {
    let n = 0;

    for await (const i of iter)
        if (filter(i, n++))
            yield i;
}

export async function* concat<T>(...iter: (AsyncIterable<T> | Iterable<T>)[]): AsyncGenerator<T> {
    for (const i of iter)
        for await (const j of i)
            yield j;
}

export async function take<T>(iter: AsyncIterable<T>, len: number = 1): Promise<[items: T[], iter: AsyncIterable<T>]> {
    let acc: T[] = [];

    for await (const i of iter) {
        acc.push(i);

        if (acc.length >= len)
            return [acc, iter];
    }

    return [acc, iter];
}

export async function shift<T>(iter: AsyncIterable<T>): Promise<[T | null, AsyncIterable<T>]> {
    for await (const i of iter)
        return [i, iter];

    return [null, iter];
}

export async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
    let n = 0;

    const arr: T[] = [];
    for await (const i of iter)
        arr.push(i);

    return arr;
}

export async function* flat<T>(...iter: (AsyncIterable<T> | Iterable<T>)[]): AsyncGenerator<Flat<T>> {
    const isAsyncIter = (i: any): i is AsyncIterable<T> => i[Symbol.asyncIterator] instanceof Function;
    const isIter = (i: any): i is Iterable<T> => i[Symbol.iterator] instanceof Function;

    for (const i of iter)
        for await (const j of i)
            if (isAsyncIter(j))
                for await (const k of j as AsyncIterable<T>)
                    yield k as Flat<T>;
            else if (isIter(j))
                for (const k of j as Iterable<T>)
                    yield k as Flat<T>;
            else
                yield j as any;
}

export async function *from<T>(iter: AsyncIterable<T> | Iterable<T>): AsyncGenerator<T> {
    for await (const i of iter)
        yield i;
}

type Flat<T> = T extends AsyncIterable<infer K> ? K : T extends Iterable<infer K> ? K : T;

interface Iter<T> extends AsyncIterable<T> {
    map<R>(predicate: (i: T, a: number) => R): Iter<R>;
    filter(predicate: (i: T, a: number) => boolean): Iter<T>;
    concat(...iter: (AsyncIterable<T> | Iterable<T>)[]): Iter<T>;
    flat(): Iter<Flat<T>>;
    collect(): Promise<T[]>;
}

export default function Iter<T>(iter: AsyncIterable<T> | Iterable<T>): Iter<T> {
    const _iter: AsyncIterable<T> = from(iter);
    
    return {
        [Symbol.asyncIterator]: () => _iter[Symbol.asyncIterator](),

        map: <R>(predicate: (i: T, a: number) => R): Iter<R> => Iter(map(_iter, predicate)),
        filter: (predicate: (i: T, a: number) => boolean): Iter<T> => Iter(filter(_iter, predicate)),
        concat: (...iters: (AsyncIterable<T> | Iterable<T>)[]): Iter<T> => Iter(concat(_iter, ...iters)),
        flat: (): Iter<Flat<T>> => Iter(flat(_iter)),
        collect: async (): Promise<T[]> => await collect(_iter)
    };
}