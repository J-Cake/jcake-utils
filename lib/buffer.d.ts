declare module "@j-cake/jcake-utils/buffer" {
    /// <reference types="node" />
    export default function buffer(bytes?: number[]): {
        u8(...num: number[]): any;
        u16(...num: number[]): any;
        u32(...num: number[]): any;
        f32(...num: number[]): any;
        u64(...num: bigint[]): any;
        f64(...num: number[]): any;
        buf(...buffer: Buffer[][]): any;
        len: () => number;
        done: () => Buffer;
    };

}