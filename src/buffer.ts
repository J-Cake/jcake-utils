export default function buffer(bytes: number[] = []) {

    const mkBytes = (bytes: number, num: number): number[] => new Array(bytes).fill(0).reduce((a, i, j) => [...a, num >> (8 * j) % 0xff], []).reverse(); // .reverse() for big-endian
    const mkBytesN = (bytes: number, num: bigint): number[] => new Array(bytes).fill(0).reduce((a, i, j) => [...a, Number(num >> (8n * BigInt(j)) % 0xffn)], []).reverse();

    const obj = {
        u8(...num: number[]) {
            bytes.push(...num.map(i => (typeof i === 'number' && !isNaN(i)) ? i : 0).map(i => i % 0xff));
            return obj;
        },
        u16(...num: number[]) {
            bytes.push(...num.map(i => (typeof i === 'number' && !isNaN(i)) ? i : 0).map(num => mkBytes(2, num)).flat(1));
            return obj;
        },
        u32(...num: number[]) {
            bytes.push(...num.map(i => (typeof i === 'number' && !isNaN(i)) ? i : 0).map(num => mkBytes(4, num)).flat(1));
            return obj;
        },
        f32(...num: number[]) {
            const buffer = Buffer.alloc(num.length * 4);
            num.forEach((i, a) => buffer.writeFloatBE(i, a * 4));
            bytes.push(...Array.from(buffer));
            return obj;
        },
        u64(...num: bigint[]) {
            bytes.push(...num.map(i => (typeof i === 'bigint') ? i : 0n).map(num => mkBytesN(8, num)).flat(1));
            return obj;
        },
        f64(...num: number[]) {
            const buffer = Buffer.alloc(num.length * 8);
            num.forEach((i, a) => buffer.writeFloatBE(i, a * 8));
            bytes.push(...Array.from(buffer));
            return obj;
        },
        buf(...buffer: Buffer[][]) {
            bytes.push(...Array.from(buffer).map(i => Array.from(i.map(i => Array.from(i)))).flat(2))

            return obj;
        },
        len: () => bytes.length,
        done: () => Buffer.from(bytes)
    };

    return obj;
}