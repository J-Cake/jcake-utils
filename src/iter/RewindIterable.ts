export type RewindableIteratorResult<T> =
    { done: false, value: T, checkpoint: number }
    | { done: true, value: undefined, checkpoint: number };
export type RewindableAsyncIterator<T> = {
    checkpoint(): number, // checkpoint number
    rewind(checkpoint?: number): number,
    next(): Promise<RewindableIteratorResult<T>>
};
export type RewindableAsyncIterable<T> = { [Symbol.asyncIterator]: () => RewindableAsyncIterator<T> }

export default function rewindableIterator<T>(iter: AsyncIterable<T>): RewindableAsyncIterator<T> {
    const iterator = iter[Symbol.asyncIterator]();
    const reel: T[] = [];
    const checkpoints: number[] = [];
    let index: number = -1;

    return {
        async next(): Promise<RewindableIteratorResult<T>> {
            if (index >= reel.length - 1)
                index = -1;

            if (index < 0) {
                const {value, done} = await iterator.next();
                reel.push(value);

                return {
                    value,
                    done: done ?? false,
                    checkpoint: checkpoints.sort().findIndex(i => i >= index)
                };
            } else
                return {
                    value: reel[++index],
                    done: false,
                    checkpoint: checkpoints.sort().findIndex(i => i >= index)
                }
        },
        checkpoint: () => checkpoints.push(reel.length),
        rewind: (checkpoint?: number) => index = checkpoints.at(checkpoint ?? -1) ?? -1
    }
}
