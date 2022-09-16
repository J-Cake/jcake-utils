declare module "@j-cake/jcake-utils/db" {
    /// <reference types="node" />
    import { promises as fs } from 'node:fs';
    export const fileHandles: fs.FileHandle[];
    export const inodeLen: (inode: [start: number, end: number]) => number;
    export type Selector<T, Cache extends Array<PropertyKey> = []> = T extends PropertyKey ? Cache : {
        [P in keyof T]: [...Cache, P] | Selector<T[P], [...Cache, P]>;
    }[keyof T];
    export type Value<Obj, selector extends Selector<Obj>> = selector extends [infer key] ? (key extends keyof Obj ? Obj[key] : never) : (selector extends [infer key, ...infer subkey] ? (key extends keyof Obj ? (subkey extends Selector<Obj[key]> ? Value<Obj[key], subkey> : [
        key
    ] extends Selector<Obj> ? Obj[key] : never) : never) : never);
    namespace parsers {
        export enum DBType {
            null = 0,
            boolean = 1,
            integer = 2,
            float = 3,
            u64 = 4,
            string = 5
        }
        type parserSerliaser<T> = {
            parse(buffer: Buffer): T;
            serialise(obj: T): Buffer;
        };
        export type parserCombo = {
            [K in keyof typeof DBType]: parserSerliaser<any>;
        };
        interface parsers extends parserCombo {
        }
        export const parsers: parsers;
        export function getTypeOf(value: any): DBType | null;
        export { };
    }
    export type KeyList = {
        [k in string]: k | KeyList;
    };
    export default class DB<Database> {
        readonly ptable: Map<string, [start: number, end: number][]>;
        private readonly file?;
        private readonly ptableSize?;
        private readonly data_offset?;
        static readonly BlockSize: number;
        static autoDefine: boolean;
        private readonly changes;
        static getParsers(): typeof parsers;
        has<selector extends Selector<Database>>(selector: selector, where?: (i: selector) => any): boolean;
        keys_flat<selector extends Selector<Database>>(selector: selector): string[];
        keys<selector extends Selector<Database>>(selector: selector): KeyList;
        get<selector extends Selector<Database>>(selector: selector): AsyncGenerator<Value<Database, selector> | null>;
        getAll<selector extends Selector<Database>>(selector: selector): Promise<Value<Database, selector> | null>;
        getRaw<selector extends Selector<Database>>(selector: selector, options: {
            maxChunkSize?: number;
            start?: number;
            end?: number;
        }): AsyncGenerator<Buffer>;
        set<selector extends Selector<Database>>(selector: selector, value: Value<Database, selector>): Promise<void>;
        /**
         * Pick the next free selector that is a direct child of `selector`
         * @param selector Any selector into the database
         * @param value The value
         */
        setNext<selector extends Selector<Database>>(selector: selector, value: any): Promise<void>;
        /**
         * Find a value in the database
         * @param selector Any selector into the database
         * @param predicate Confirm or reject a value
         * @returns the value if it is found, throws error if not found
         */
        find<selector extends Selector<Database>>(selector: selector, predicate: (i: any, a: Selector<Database>) => boolean): Promise<any>;
        define<selector extends Selector<Database>>(...selectors: selector[]): Promise<void>;
        drop<selector extends Selector<Database>>(...selectors: selector[]): Promise<void>;
        close(): Promise<void>;
        private refreshHeader;
        private resize;
        private getAllInodes;
        private allocSpace;
        private shrinkRegion;
        private fetchObject;
        private parseObject;
        constructor(ptable: Map<string, [start: number, end: number][]>);
        static load<Database>(file: fs.FileHandle): Promise<DB<Database>>;
    }
    export { };

}

declare module "#db" {
    export * from '@j-cake/jcake-utils/db';
}