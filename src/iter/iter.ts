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

export async function* from<T>(iter: AsyncIterable<T> | Iterable<T>): AsyncGenerator<T> {
    for await (const i of iter)
        yield i;
}

export async function* interleave<T>(...iter: AsyncIterable<T>[]): AsyncGenerator<T> {
    const interleave = function <T>(...iter: AsyncIterable<T>[]): AsyncIterable<T> {
        const objBuffer: IteratorResult<T>[] = [];
        let _yield: (value: { value: T, done: boolean }) => void;
        let done = 0;

        const foreach = <T>(iter: AsyncIterator<T>, yieldValue: (value: T, done: boolean) => void) => iter.next().then(val => {
            yieldValue(val.value, val.done ?? false);

            if (!val.done)
                foreach(iter, yieldValue);
        }).catch(err => yieldValue(err, true));

        return {
            [Symbol.asyncIterator]() {
                for (const i of iter)
                    foreach(i[Symbol.asyncIterator](), (value: T, isDone: boolean) => {
                        if (isDone)
                            done++;

                        _yield({ value, done: done >= iter.length - 1 });
                    });

                return {
                    next(...args: any[] | [undefined]): Promise<IteratorResult<T, any>> {
                        while (objBuffer.length > 0)
                            return Promise.resolve(objBuffer.shift()!);

                        return new Promise<IteratorResult<T, any>>(next => _yield = function (value: IteratorResult<T>): void {
                            _yield = obj => objBuffer.push(obj); // if we receive an event between the yield and the next iteration, we need to store it in the buffer
                            next(value);
                        }).catch(err => (_yield({ value: err, done: true }), err))
                    }
                }
            }
        }
    }

    for await (const i of interleave(...iter))
        yield i;
}

export async function* awaitIter<T>(iter: AsyncIterable<T>): AsyncGenerator<Awaited<T>> {
    for await (const i of iter)
        yield await i;
}

export async function* pipe<T, R, Options extends any[]>(iterator: AsyncIterable<T> | Iterable<T>, generator: (input: AsyncIterable<T> | Iterable<T>, ...options: Options) => AsyncIterable<R>, ...options: Options): AsyncGenerator<R> {
    for await (const i of generator(iterator, ...options))
        yield i;
}

type Flat<T> = T extends AsyncIterable<infer K> ? K : T extends Iterable<infer K> ? K : T;

interface Iter<T> extends AsyncIterable<T> {
    map<R>(predicate: (i: T, a: number) => R): Iter<R>;
    filter(predicate: (i: T, a: number) => boolean): Iter<T>;
    concat(...iter: (AsyncIterable<T> | Iterable<T>)[]): Iter<T>;
    flat(): Iter<Flat<T>>;
    interleave(...iter: AsyncIterable<T>[]): Iter<T>;
    await(): Iter<Awaited<T>>;
    collect(): Promise<T[]>;
    pipe<R, Options extends any[]>(generator: (iter: AsyncIterable<T> | Iterable<T>, ...options: Options) => AsyncIterable<R>, ...options: Options): Iter<R>
}

export default function Iter<T>(iter: AsyncIterable<T> | Iterable<T>): Iter<T> {
    const _iter: AsyncIterable<T> = from(iter);

    return {
        [Symbol.asyncIterator]: () => _iter[Symbol.asyncIterator](),

        map: <R>(predicate: (i: T, a: number) => R): Iter<R> => Iter(map(_iter, predicate)),
        filter: (predicate: (i: T, a: number) => boolean): Iter<T> => Iter(filter(_iter, predicate)),
        concat: (...iters: (AsyncIterable<T> | Iterable<T>)[]): Iter<T> => Iter(concat(_iter, ...iters)),
        flat: (): Iter<Flat<T>> => Iter(flat(_iter)),
        interleave: (...iters: AsyncIterable<T>[]): Iter<T> => Iter(interleave(_iter, ...iters)),
        await: (): Iter<Awaited<T>> => Iter(awaitIter(_iter)),
        collect: async (): Promise<T[]> => await collect(_iter),
        pipe: <R, Options extends any[]>(generator: (iter: AsyncIterable<T> | Iterable<T>, ...options: Options) => AsyncIterable<R>, ...options: Options): Iter<R> => Iter(pipe(iter, generator, ...options))
    };
}