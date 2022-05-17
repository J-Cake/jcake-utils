import { promises as fs } from 'node:fs';
import _ from 'lodash';

import { parsePTable } from './ptable';
import buffer from './buffer';
import * as iter from './iter';
import Iter, * as iterSync from './iter_sync';

export const fileHandles: fs.FileHandle[] = [];

const p = <T extends any[]>(x: (next: (...x: T) => void) => void): Promise<T> => new Promise(resolve => x((...obj: T) => resolve(obj)));
const notNull = function (i: any): i is NonNullable<typeof i> {
    if (typeof i == 'string')
        return i.length > 0;
    else if (typeof i == 'number')
        return !isNaN(i);
    else
        return i !== null && i !== undefined;
}

export type Selector<T, Cache extends Array<PropertyKey> = []> =
    T extends PropertyKey ? Cache : {
        [P in keyof T]: [...Cache, P] | Selector<T[P], [...Cache, P]>
    }[keyof T];

export type Value<Obj, selector extends Selector<Obj>> = selector extends [infer key] ?
    (key extends keyof Obj ? Obj[key] : never) :
    (selector extends [infer key, ...infer subkey] ?
        (key extends keyof Obj ? (
            subkey extends Selector<Obj[key]> ?
            Value<Obj[key], subkey> :
            [key] extends Selector<Obj> ? Obj[key] : never) :
            never) : never);

namespace parsers {
    export enum DBType {
        null,
        boolean,
        integer,
        float,
        u64,
        string
    }

    type parserSerliaser<T> = { parse(buffer: Buffer): T, serialise(obj: T): Buffer };
    export type parserCombo = { [K in keyof typeof DBType]: parserSerliaser<any> };
    interface parsers extends parserCombo { }

    export const parsers: parsers = {
        null: {
            parse: () => null,
            serialise: () => buffer().u8(0).done()
        },
        boolean: {
            parse: buffer => buffer.readUInt8() !== 0,
            serialise: (bool: boolean) => buffer().u8(1, bool ? 1 : 0).done()
        },
        integer: {
            parse: buffer => buffer.readInt32BE(),
            serialise: (num: number) => buffer().u8(2).u32(num).done()
        },
        float: {
            parse: buffer => buffer.readFloatBE(),
            serialise: number => buffer().u8(3).f32(number).done()
        },
        u64: {
            parse: buffer => buffer.readBigUInt64BE(),
            serialise: (num: bigint) => buffer().u8(4).u64(num).done()
        },
        string: {
            parse: buffer => buffer.slice(4, buffer.readUInt32BE(0) + 4).toString('utf8'),
            serialise: string => buffer().u8(5).u32(string.length).buf([Buffer.from(string, 'utf8')]).done()
        }
    }

    export function getTypeOf(value: any): DBType | null {
        if (typeof value === 'boolean')
            return DBType.boolean;

        if (typeof value === 'number')
            return Number.isInteger(value) ? DBType.integer : DBType.float;

        else if (typeof value === 'bigint')
            return DBType.u64;

        if (typeof value === 'string')
            return DBType.string;

        if (value === null)
            return DBType.null;

        return null;
    }
}

export type KeyList = { [k in string]: k | KeyList };

export default class DB<Database> {
    private readonly file?: fs.FileHandle;
    private readonly ptableSize?: number;
    private readonly data_offset?: number;

    public static readonly BlockSize: number = 4096;

    public static autoDefine: boolean = true;

    private readonly changes: Map<Selector<Database>, Buffer>;

    public static getParsers() {
        return parsers;
    }

    public has<selector extends Selector<Database>>(selector: selector, where?: (i: selector) => any): boolean {

        if (!this.file)
            throw `Database not loaded`;

        if (!Array.isArray(selector))
            throw `Invalid selector: ${[...selector].map(i => (i as string).toString()).join('.')}`;

        const _sel = [...selector].map(i => (i as string).toString());
        const path = _sel.filter(notNull).join('.');

        if (this.ptable.has(path))
            return true;

        for (const i of this.ptable.keys())
            if (_.zip(_sel, i.split('.').slice(0, _sel.length)).every(i => i[0] === i[1]))
                return true;

        return false;
    }

    public keys_flat<selector extends Selector<Database>>(selector: selector): string[] {
        if (!this.file)
            throw `Database not loaded`;

        if (!Array.isArray(selector))
            throw `Invalid selector: ${[...selector].map(i => (i as string).toString()).join('.')}`;

        const _sel = [...selector].map(i => (i as string).toString());
        const path = _sel.filter(notNull).join('.');

        if (this.ptable.has(path))
            return [path];

        const keys: string[] = [];

        for (const i of this.ptable.keys())
            if (_.zip(_sel, i.split('.').slice(0, _sel.length)).every(i => i[0] === i[1]))
                keys.push(i);

        return keys;
    }

    public keys<selector extends Selector<Database>>(selector: selector): KeyList {
        const keys = this.keys_flat(selector);

        const obj: KeyList = {};
        for (const i of Iter(keys).map(i => i.split('.')))
            if (i.length - (selector as string[]).length > 1)
                obj[i[(selector as string[]).length]] = this.keys(i.slice(0, (selector as string[]).length + 1) as selector);
            else
                obj[i[(selector as string[]).length]] = i[(selector as string[]).length];

        return obj;
    }

    public async *get<selector extends Selector<Database>>(selector: selector): AsyncGenerator<Value<Database, selector> | null> {

        const _selector = [...selector].map(i => (i as string).toString());

        if (!this.file)
            throw `Database not loaded`;

        if (!Array.isArray(_selector))
            throw `Invalid selector: ${[..._selector].join('.')}`;

        const path = [..._selector].filter(notNull).join('.');

        if (this.ptable.has(path))
            return await this.fetchObject(this.ptable.get(path)!);

        const path_segments = [..._selector].filter(notNull).map(i => (i as any).toString());
        const paths = Array.from(this.ptable.keys()).filter(p => _.isEqual(p.split('.').slice(0, path_segments.length), path_segments)).map(i => i.split('.'));
        // get a list of all paths which are children of selector

        if (paths.length === 0)
            throw `Invalid selector: ${[..._selector].join('.')}`;

        // convert the list of paths to a nested object representing the structure of the database
        type Nested = { [entry in string]: Nested | string };
        const nest = async (parent: string, paths: string[][]): Promise<{ [x: string]: string | Nested; }> => {
            if (paths.length === 0)
                return {};

            const groups: { [entry in string]: string[][] } = {};
            for (const [head, ...tail] of paths)
                if (tail.length >= 1)
                    groups[head] = Object.defineProperty(groups[head] ? [...groups[head]!, tail] : [tail], '__final', { enumerable: false, value: true, writable: false });
                else {
                    let selector = `${parent}.${head}`;

                    if (selector.startsWith('.'))
                        selector = selector.slice(1);
                    if (this.ptable.has(selector))
                        groups[head] = await this.fetchObject(this.ptable.get(selector)!) as unknown as string[][];
                    else throw `Selector can't be resolved: ${selector}`;
                }

            return _.fromPairs(await Promise.all(_.chain(groups)
                .entries()
                .map(async ([a, i]) => [a, (i && i.hasOwnProperty('__final')) ? await nest(`${parent}.${a}`, i) : i])
                .value())) as Nested;
        }

        let obj: any = await nest('', paths);
        let _path = [...path_segments];
        yield obj;
        while (_path.length > 0)
            yield obj = obj[_path.shift()!];
        // obj = obj[_path.shift()!];

        // return obj as Value<Database, selector>;
    }

    public async getAll<selector extends Selector<Database>>(selector: selector): Promise<Value<Database, selector> | null> {
        const _selector = [...selector].map(i => (i as string).toString());

        if (!this.file)
            throw `Database not loaded`;

        if (!Array.isArray(_selector))
            throw `Invalid selector: ${[..._selector].join('.')}`;

        const path = [..._selector].filter(notNull).join('.');

        if (this.ptable.has(path))
            return await this.fetchObject(this.ptable.get(path)!);

        let obj: any = {};

        for await (const i of this.get(selector))
            obj = i;

        return obj as Value<Database, selector>;
    }

    public async *getRaw<selector extends Selector<Database>>(selector: selector, maxChunkSize: number = Infinity): AsyncGenerator<Buffer> {
        const _selector = [...selector].map(i => (i as string).toString());

        if (!this.file)
            throw `Database not loaded`;

        if (!Array.isArray(_selector))
            throw `Invalid selector: ${[..._selector].join('.')}`;

        const path = [..._selector].filter(notNull).join('.');

        if (!this.ptable.has(path))
            throw `Invalid Selector: Selector '${path}' references a directory`;

        const inodes = this.ptable.get(path)!;

        for (const i of inodes) {
            let chunkOffset: number = i[0];
            
            while (chunkOffset < i[1])
                yield await this.file!.read({
                    buffer: Buffer.alloc(Math.min(i[1] - i[0], maxChunkSize)),
                    position: chunkOffset + this.data_offset!,
                }).then(k => (chunkOffset += k.bytesRead, k.buffer));
        }

    }

    public async set<selector extends Selector<Database>>(selector: selector, value: Value<Database, selector>): Promise<void> {
        if (!this.file)
            throw `Database not loaded`;

        if (!Array.isArray(selector))
            throw `Invalid selector: ${[...selector].join('.')}`;

        const setValue = async function <selector extends Selector<Database>>(this: DB<Database>, selector: selector, value: Value<Database, selector>): Promise<void> {
            if (!Array.isArray(selector))
                throw `Invalid selector: ${[...selector].join('.')}`;

            if (DB.autoDefine && !this.ptable.has([...selector].join('.')))
                await this.define(selector);

            const inodelist = this.ptable.get([...selector].join('.'));
            if (!inodelist)
                throw `Invalid selector: ${[...selector].join('.')}`;

            const parser = parsers.getTypeOf(value);
            if (parser === null)
                throw `Invalid value: ${value}`;

            const buffer = parsers.parsers[parsers.DBType[parser] as keyof typeof parsers.DBType].serialise(value);

            const totalSpace = inodelist.reduce((a, i) => a + (i[1] - i[0]), 0);

            if (totalSpace > buffer.length)
                inodelist.splice(0, inodelist.length, ...await this.shrinkRegion(selector, buffer.length));
            else if (totalSpace < buffer.length)
                inodelist.push(...await this.allocSpace(buffer.length - totalSpace));

            let offset: number = 0;
            for (const i of inodelist)
                if (offset >= buffer.length) break;
                else
                    offset += await this.file!.write(
                        buffer,
                        offset,
                        Math.min(i[1] - i[0], buffer.length),
                        this.data_offset! + i[0]).then(w => w.bytesWritten);

            // console.log('refreshing');
            await this.refreshHeader();
        }.bind(this);

        const toFlatPathList = function (value: Value<Database, selector>): { [path in string]: any } {
            const result: { [path in string]: any } = {};

            const flatten = function (path: string, val: any) {
                for (const [key, value] of Object.entries(val))
                    if (typeof value === 'object' && parsers.getTypeOf(value) === null)
                        flatten(path ? `${path}.${key}` : key, value);
                    else
                        result[path ? `${path}.${key}` : key] = value;

            }

            flatten([...selector].join('.'), value)

            return result;
        }

        if (parsers.getTypeOf(value) !== null)
            return await setValue(selector, value);

        for (const [path, val] of Object.entries(toFlatPathList(value)))
            await setValue(path.split('.') as Selector<Database>, val as Value<Database, selector>);
    }

    /**
     * Pick the next free selector that is a direct child of `selector`
     * @param selector Any selector into the database
     * @param value The value
     */
    public async setNext<selector extends Selector<Database>>(selector: selector, value: any): Promise<void> {
        // get all paths which are direct children of selector
        const path_segments = [...selector].filter(notNull).map(i => (i as any).toString());
        const entries = Array.from(this.ptable.keys()).filter(p => _.isEqual(p.split('.').slice(0, path_segments.length), path_segments)).map(i => i.split('.')[path_segments.length]);
        // get a list of all paths names which are direct children of selector

        let name = 0;

        while (entries.includes(name.toString(36)))
            name++;

        // Damn. This isn't properly typed.
        await this.set([...selector, name.toString(36)] as any, value);
    }

    /**
     * Find a value in the database
     * @param selector Any selector into the database
     * @param predicate Confirm or reject a value
     * @returns the value if it is found, throws error if not found
     */
    public async find<selector extends Selector<Database>>(selector: selector, predicate: (i: any, a: Selector<Database>) => boolean): Promise<any> {
        const _selector = [...selector].map(i => (i as string).toString());

        if (!this.file)
            throw `Database not loaded`;

        if (!Array.isArray(_selector))
            throw `Invalid selector: ${[..._selector].join('.')}`;

        const path = [..._selector].filter(notNull).join('.');

        if (this.ptable.has(path))
            return await this.fetchObject(this.ptable.get(path)!);

        // get all paths which are direct children of selector
        const path_segments = [...selector].filter(notNull).map(i => (i as any).toString());
        const entries = Array.from(this.ptable.keys()).filter(p => _.isEqual(p.split('.').slice(0, path_segments.length), path_segments)).map(i => i.split('.')[path_segments.length]);

        if (entries.length === 0)
            throw `Invalid selector: ${[..._selector].join('.')}`;

        for (const i of entries) {
            const value = await this.getAll([..._selector, i] as any);
            if (predicate(value, [..._selector, i] as Selector<Database>))
                return value;
        }

        throw `No matching value was found`;
    }

    public async define<selector extends Selector<Database>>(...selectors: selector[]): Promise<void> {
        if (!this.file)
            throw `Database not loaded`;

        for (const [selector, path] of selectors.map(i => [i, [...i].join('.')] as [selector: selector, path: string]))
            if (this.ptable.has(path))
                throw `Selector already defined: ${path}`;

            else {
                this.ptable.set(path, await this.allocSpace(4));
                await this.set(selector as never, null as never);
            }

        await this.refreshHeader();
    }

    public async drop<selector extends Selector<Database>>(...selectors: selector[]): Promise<void> {
        if (!this.file)
            throw `Database not loaded`;

        const dirs: string[] = [];

        for (const selector of selectors.map(i => [...i].join('.')))
            if (this.ptable.has(selector))
                this.ptable.delete(selector);

            else
                dirs.push(selector);

        for (const i of iterSync.map(dirs, i => [i, i.split('.')] as [string, string[]]))
            for (const selector of iterSync.map(iterSync.filter(this.ptable.keys(), path => path.startsWith(i[0])), key => key.split('.')))
                if (_.isEqual(i[1], selector.slice(0, i[1].length)))
                    this.ptable.delete(selector.join('.'));

        await this.refreshHeader();
    }

    public async close(): Promise<void> {
        if (!this.file)
            throw `Database not loaded`;

        // await any pending changes
        await this.refreshHeader();

        await this.file!.close();
        fileHandles.splice(fileHandles.indexOf(this.file), 1);
    }

    private async refreshHeader(): Promise<void> {
        const header: Buffer[] = [];
        for (const [path, inodelist] of this.ptable)
            header.push(buffer()
                .u32(path.length)
                .buf([Buffer.from(path, 'utf8')])
                .u32(inodelist.length)
                .buf(inodelist.map(i => buffer().u32(i[0]).u32(i[1]).done()))
                .done());

        const headerBuffer = buffer([0x45, 0x44, 0x42, 0x00])
            .u32(header.reduce((a, i) => a + i.length, 12))
            .u32(this.data_offset!)
            .u32(this.ptable.size)
            .buf(header)
            .done();

        if (headerBuffer.length > headerBuffer.readUInt32BE(8)) // we'll use more bytes than we have buffer between the start of the data. We need to increase the buffer
            await this.resize(headerBuffer.length);

        // @ts-ignore
        this.ptableSize = headerBuffer.length;

        await this.file!.write(headerBuffer, 0, headerBuffer.length, 0);
    }

    private async resize(minHeaderSize: number): Promise<void> {
        // TODO: Figure out why this function doesn't work.
        const newDataOffset = Math.floor(minHeaderSize / DB.BlockSize) * DB.BlockSize + DB.BlockSize;
        const newFile = await fs.open(`/tmp/db-resize-${new Date().getTime()}.tmp`, 'w+');

        const header = Buffer.alloc(newDataOffset);
        await this.file!.read(header, 0, this.ptableSize! + 4, 0);
        await newFile.write(header, 0, newDataOffset, 0);
        header.writeUInt32BE(newDataOffset, 8);
        // we're not actually resizing the header as that can be done relatively effortlessly, we're moving the data offset further away from the header.

        await p(next => this.file!.createReadStream({ autoClose: false, start: this.data_offset! })
            .pipe(newFile.createWriteStream({ autoClose: false, start: newDataOffset }))
            .once('finish', () => next()));
        await this.file!.truncate(await newFile.stat().then(s => s.size));
        await p(next => newFile.createReadStream({ start: 0 })
            .pipe(this.file!.createWriteStream({ autoClose: false, start: 0 }))
            .once('finish', () => next()));

        Object.assign(this, { data_offset: newDataOffset });
        newFile.close().catch(err => console.error(`lmao guess who I just stopped from crashing your program - why it\'s the garbage collector, having a go at you for not closing your files!\nYou're welcome.`)); // this bitch is not closing itself. There should be an `await` in front of it, but seriously, if the OS can't fucking close the file, then we ignore it. 
        /**
         * For context, when resizing a database file, there's a very real chance that the data section is too large to fit in memory. So you can't resize by just copying and splicing buffers,
         * what happens, is we take the header of the original database, and write it to the new file. We then copy the data section from the original into the new file, making any adjustments necessary to it
         * Once done, we can then copy the new file back into the original, and the databse has been resized. 
         * Now, good practice says that once we're finished with a file, we should close its file descriptor, so that the OS can free up memory etc. That's what the `newFile.close()` is supposed to do,
         * The issue is that if we `await` the closure of the file, for some reason that I can't seem to work out, the `close` call hangs indefinitely. 
         * If we were to `await` it, we'd be waiting for, well, forever. So by removing the `await`, we *hopefully* can use Node's threadpool to call the `close` function truly asyncronously and continue on while that happens in the backgruond.
         * The irony here is, that NodeJS will bitch about leaving file descriptors to be closed by the GC. So when we reach the end of the function, the GC cleans it up and alerts of a bad practice. 
         * Which we had to do, because the function doesn't work. 
        *  
        * 4 hours that took me. 4 hours.
        * FML. The life of a programmer :/
        */
    }

    private getAllInodes(): [start: number, end: number][] {
        const inodes: [start: number, end: number][] = [];

        for (const [, i] of this.ptable)
            inodes.push(...i);

        return inodes.sort((i, j) => i[1] > j[0] ? 1 : -1);
    }

    // This function finds spaces between inodes and creates inodes which can be used to append to the item's list of inodes, hence exanpding it's space.
    private async allocSpace(size: number): Promise<[start: number, end: number][]> {
        const fileSize = await this.file!.stat().then(stat => stat.size);
        const inodes: [start: number, end: number][] = [...this.getAllInodes(), [fileSize, fileSize]];

        const diff = (a: [start: number, end: number], b: [start: number, end: number]) => a[0] >= b[1] ? a[0] - b[1] : b[0] - a[1];

        // generate list of gaps between inodes
        const inodeGaps = _.chain(_.chain(inodes.slice(1))
            .reduce((a, i) => ({ prev: i, acc: a.acc.concat(diff(i, a.prev)) }), { prev: inodes[0], acc: [] as number[] })
            .value().acc)
            .map((i, a) => ({ inode: a, gapSize: i }))
            .filter(i => i.gapSize > 0)
            .sortBy(i => i.gapSize)
            .value();

        // find combination of gaps such that sum is >= minSize, using as few inodeGaps as possible

        // convert the list of inodeGaps into inodes
        const toINodeList = function (gaps: typeof inodeGaps): typeof inodes {
            const new_inodes: [start: number, end: number][] = [];

            let total: number = 0;
            for (const { inode, gapSize } of gaps) {                  // if we don't need all available space in the gap, we reduce it
                new_inodes.push([inodes[inode][1], inodes[inode][1] + Math.min(size - total, gapSize)]);
                total += gapSize;
            }

            return new_inodes;
        }
        // recursively append the largest available gap to the list of gaps to produce a combination of at least minSize.
        const checkNext = function (combination: typeof inodeGaps, remaining: typeof inodeGaps): typeof inodes {
            // if the combination of gaps exceeds minSize, we're done and can return the inodes needed.
            if (combination.reduce((a, i) => a + i.gapSize, 0) >= size)
                return toINodeList(combination);

            // if we've used up all possible inodes, then there's no space left.
            if (combination.length >= inodeGaps.length)
                throw `Not enough space in the file. ${size} bytes required.`;

            const maxGap = remaining.reduce((a, i) => i.gapSize > a.gapSize ? i : a);

            // append the largest gap to the combination and check again
            return checkNext(combination.concat(maxGap), remaining.filter(i => i !== maxGap));
        }

        return checkNext([], inodeGaps);
    }

    private async shrinkRegion(selector: Selector<Database>, size: number): Promise<[start: number, end: number][]> {
        const inodes = this.ptable.get([...selector].join('.'));

        if (!inodes)
            throw `Invalid selector: ${[...selector].join('.')}`;

        const inodelist: typeof inodes = [];

        for (const i of inodes) {
            inodelist.push(i);

            if (inodelist.reduce((a, i) => a + Math.abs(i[1] - i[0]), 0) > size)
                break;
        }

        const last = inodelist.pop();
        if (!last)
            return []

        return [...inodelist, [last[0], last[0] + Math.abs(size - inodelist.reduce((a, i) => a + Math.abs(i[1] - i[0]), 0))]];
    }

    private async fetchObject<T>(inodes: [start: number, end: number][]): Promise<T> {
        const slices: Buffer[] = [];

        for (const i of inodes)
            slices.push(await this.file!.read({
                buffer: Buffer.alloc(i[1] - i[0]),
                position: i[0] + this.data_offset!,
            }).then(k => k.buffer))

        const buffer = Buffer.concat(slices);
        return this.parseObject(buffer);
    }

    private parseObject<T>(buffer: Buffer): T {
        const type: parsers.DBType = buffer.readUInt8(0);

        if (!(type in parsers.DBType))
            throw new Error(`Invalid type encountered: ${type}\n(${buffer.length}) ${Array.from(buffer.slice(0, 0xf)).map(i => i.toString(16)).join(' ').toUpperCase()}`);

        return parsers.parsers[parsers.DBType[type] as keyof parsers.parserCombo].parse(buffer.slice(1));
    }

    constructor(public readonly ptable: Map<string, [start: number, end: number][]>) {
        this.changes = new Map();
    }

    static async load<Database>(file: fs.FileHandle): Promise<DB<Database>> {
        const { buffer: header } = await file.read(Buffer.alloc(12), 0, 12);

        if (header.slice(0, 4).toString() !== 'EDB\0')
            throw `EDB Error: Invalid file header`;

        const ptableLen = header.readUInt32BE(4);

        const { buffer: ptableBuffer } = await file.read({ buffer: Buffer.alloc(ptableLen), position: header.length });

        fileHandles.push(file);

        const db = new DB<Database>(await parsePTable(ptableBuffer));
        // @ts-ignore
        db.file = file; db.ptableSize = ptableLen; db.data_offset = header.readUInt32BE(8);
        return db;
    }
}