import { promises as fs, constants as fsConstants } from 'node:fs';
import { exec, spawn } from 'node:child_process';
import readline from 'node:readline';
import chalk from 'chalk';
import _ from 'lodash';

import DB from '#db';
import {iter} from '#iter';
import buffer from '#buffer';
import {strutil} from '#parse';

const rl = readline.createInterface(process.stdin, process.stdout);
const q = (query: string) => new Promise<string>(ok => rl.question(query, ans => ok(ans)));
const untilTrue = async function (query: string, condition: (answer: string) => Promise<boolean>): Promise<string> {
    let answer = await q(query);
    for (; !await condition(answer); answer = await q(query))
        console.log(`${chalk.red('Invalid answer')}: ${answer}`);

    return answer;
}

let _file: fs.FileHandle | null;
let db: DB<{}>;
const file = async (file: fs.FileHandle) => await new Promise<string>(res => exec(`lsof -a -p ${process.pid} -d ${file!.fd} -Fn | tail -n +3`, (error, stdout) => res(strutil.trim(stdout.slice(1)))));

export async function open(path: string) {
    if (db)
        db.close();

    _file = await fs.open(path, fsConstants.O_RDWR).catch(() => null);
    db = await DB.load(_file ?? (_file = await fs.open(await untilTrue(`> ${chalk.italic('Open file: ')}`, async ans => !!await fs.stat(ans).catch(err => false)), fsConstants.O_RDWR)));
}

if (process.argv[2]) {
    await open(process.argv[2]);
    console.log(`Opening: ${chalk.grey(await file(_file!))}`);
}

const parsers = DB.getParsers();

const config: { [key in string]: string } = { verbose: '' };

for (let query = await q(`: `); ; query = await q(`: `)) {
    const [cmdName, ...args] = query.split(' ');

    const cmd: { [cmd in string]: (...args: string[]) => Promise<string[]> } = {
        exit: async () => process.exit(void await db.close() ?? 0),
        clear: async () => [void console.clear() ?? ''],
        async ls(dir: string = ""): Promise<string[]> {
            if (!db)
                return [`${chalk.red('No database loaded')}`];

            const len = dir.split('.').length;
            const paths: { [name: string]: boolean } = {};

            for (const i of db.ptable.keys()) {
                if (i.startsWith(dir)) {
                    const path = i.split('.');

                    if (path.length >= len)
                        paths[path.slice(0, len).join('.')] = path.length >= len + 1;
                }
            }

            return _.chain(paths).entries().map(([name, isDir]) => isDir ? chalk.blue(name) : chalk.whiteBright(name)).value();
        },
        async print(path: string = ""): Promise<string[]> {
            if (!db)
                return [`${chalk.red('No database loaded')}`];

            const data = await db.getAll((path ? path.split('.') : []) as never); // whacky hacky

            if (!data)
                return [`${chalk.red('Not found')}: ${path}`];

            const printers: Record<keyof typeof parsers['DBType'], (data: any) => string> = {
                null: () => `${chalk.grey('null')}`,
                boolean: val => `${chalk.yellow(val ? 'true' : 'false')}`,
                integer: val => `${chalk.blue(val)}`,
                float: val => `${chalk.blue(val)}`,
                u64: val => `${chalk.blue(val)}n`,
                string: val => chalk.green(`'${val}'`)
            };

            const print = function (data: any, depth: number = 0): string {
                const indent = '  '.repeat(depth);

                if (typeof data === 'object' && parsers.getTypeOf(data) === null) {
                    const lines: string[] = [''];

                    for (const [key, val] of Object.entries(data))
                        lines.push(`${indent}${chalk.grey(key)}: ${print(val, depth + 1)}`);

                    return lines.join('\n');
                } else {
                    const parser = parsers.getTypeOf(data);
                    if (parser === null)
                        throw `${chalk.red('Invalid type')}: ${data}`;
                    return printers[parsers.DBType[parser] as keyof typeof parsers['DBType']](data);
                }
            }

            return print(data).trim().split('\n');
        },
        async set(path: string): Promise<string[]> {
            if (!db)
                return [`${chalk.red('Error')}: No database loaded. use ${chalk.grey('open <file>')}.`];

            let brackets = 0;
            const indexCount = Symbol('index');

            const toValue = function (value: string): any {
                if (value === 'null' || !value)
                    return null;
                else if (value === 'true' || value === 'false')
                    return value === 'true';
                else if (value.endsWith('i') && !isNaN(parseInt(value.slice(0, -1))))
                    return parseInt(value.slice(0, -1));
                else if (value.endsWith('f') && !isNaN(parseFloat(value.slice(0, -1))))
                    return parseFloat(value.slice(0, -1));
                else if (value.endsWith('n'))
                    return BigInt(value.slice(0, -1));
                else if (value.startsWith("'") && value.endsWith("'"))
                    return decodeURIComponent(value.slice(1, -1));
                else if (value.startsWith('[') && value.endsWith(']') && value.split('[').length === value.split(']').length)
                    return parse(strutil.trim(value).slice(1, -1));

                else throw `SyntaxError: invalid token ${chalk.whiteBright(value)} (len: ${value.length})`;
            };

            const lines: string[] = [];

            do {
                const input = await q(`$ `);

                lines.push(input);

                const open = input.split('[').length;
                const close = input.split(']').length;

                brackets += open - close;
            } while (brackets > 0);

            brackets = 0;
            const parse = (source: string, obj: { [key in string]: any } = Object.defineProperty({}, indexCount, { value: 0, writable: true, enumerable: false })): typeof obj =>
                void Array.from(strutil.trim(source) + '\0').reduce(function (acc, i) {
                    const token = acc + i;

                    if (token.split('[').length === token.split(']').length && (token.includes(',') || token.includes('\0')))
                        for (const i of strutil.splitTop(token, ',')) {
                            if (strutil.trim(i).length > 0)
                                if (strutil.hasTop(i, ':')) {
                                    const [key, ...value] = i.split(':');

                                    obj[strutil.trim(key)] = toValue(strutil.trim(value.join(':')));
                                } else obj[obj[indexCount as unknown as keyof typeof obj]++] = toValue(strutil.trim(i));
                            return ''
                        }

                    return token;
                }, '') ?? obj;

            await db.set(typeof path === 'string' ? path.split('.') as never : [] as never, parse(lines.join('')) as never)

            return [];
        },
        async define(...values: string[]): Promise<string[]> {
            if (!db)
                return [`${chalk.red('Error')}: No database loaded. use ${chalk.grey('open <file>')}.`];

            await db.define(...values.map(i => i.split('.')) as never[]);

            return [`${chalk.grey('Defined')}: ${values.join(', ')}`];
        },
        async drop(...selectors: string[]): Promise<string[]> {
            if (!db)
                return [`${chalk.red('Error')}: No database loaded. use ${chalk.grey('open <file>')}.`];

            await db.drop(...selectors.map(i => i.split('.')) as never[]);

            return [`${chalk.grey('Dropped')}: ${selectors.join(', ')}`];
        },
        async new(path: string, name: string = 'Untitled Database'): Promise<string[]> {
            const strings: string[] = [];

            if (await fs.stat(path).catch(() => false))
                throw `${chalk.red('File exists')}: ${path}`;

            const nameInode = buffer()
                .u32(2)
                // name
                .u32(0x07)
                .buf([Buffer.from('db.name')])
                .u32(0x01, 0, 5 + name.length)
                // creationTime
                .u32(10)
                .buf([Buffer.from('db.created')])
                .u32(0x01, 5 + name.length, 14 + name.length)
                .done();

            const offset = 1024;
            const header = buffer([0x45, 0x44, 0x42, 0x00])
                .u32(512) // header size
                .u32(offset) // data offset
                .buf([nameInode])
                .done();

            const padding = Buffer.alloc(offset);
            header.copy(padding)

            const data = Buffer.concat([padding, buffer()
                .u8(0x05)
                .u32(name.length)
                .buf([Buffer.from(name)])
                .u8(0x04)
                .u64(BigInt(Date.now()))
                .done()]);

            const file = await fs.open(path, 'w');
            await file.write(data, 0, data.length, 0);

            const fsize = await file.stat().then(stat => stat.size);

            strings.push(`${chalk.green('Created')}: ${path} (${fsize}B)`);
            strings.push(`${chalk.whiteBright('Important: Context has not been switched!')}. To edit ${path}, use the ${chalk.grey(`open ${path}`)} command.`);

            await file.close();

            return strings;
        },
        async open(path: string): Promise<string[]> {
            await open(path);
            return [`${chalk.grey(await file(_file!))}`];
        },
        async config(key: string, value: string): Promise<string[]> {
            config[key] = value;
            return [`set ${chalk.grey(key)} to '${chalk.whiteBright(value)}'`];
        },
        async help(): Promise<string[]> {
            return `EDB Explorer ${chalk.grey('v0.0.1')} - The Erika Project 2022
    
Inspect and Edit Erika Databases
    
${chalk.grey('Commands:')}
  ${chalk.white('exit')}
    - Exit the program
  ${chalk.white('clear')}
    - Clear the screen
  ${chalk.white('ls')} ${chalk.grey('[dir]')}
    - List all paths
    * ${chalk.grey('dir')}: The directory filter to use. Append '.' to inspect contents of the directory. Defaults to root.
  ${chalk.white('print')} ${chalk.grey('[dir]')}
    - Print the data at the given path
    * ${chalk.grey('dir')}: The path to print. Append '.' to inspect contents of the directory. Defaults to root.
  ${chalk.white('set')} ${chalk.grey('<selector>')}
    - Opens a prompt for a value
    * ${chalk.grey('selector')}: The path of the contents to set.
        Enter an object using the syntax outlined below:

        Primitives: A primitive is a value which can be stored in the database. A map is a collection of primitive values or nested maps.
        ${chalk.whiteBright('Primitives')}:
         * ${chalk.grey('null')}: A literal null (0x00) value
         * ${chalk.yellow('true/false')}: A boolean value
         * ${chalk.blue('<digits>i')}: 32 bit integer
         * ${chalk.blue('<digits>f')}: 32 bit float
         * ${chalk.blue('<digits>n')}: 64 bit integer
         * ${chalk.green('\'<string>\'')}: A length-defined (not null terminated) string
        
        ${chalk.whiteBright('Map syntax')}:
         * [ ${chalk.grey('<key>')}: ${chalk.green('<value>')}, ... ]
         * Keys are optional. If omitted use an incrementing counter unique to each list. 
             * ${chalk.green("x: ['hi', ['key'], 'key2', defined: 'string']")} gives
             ${chalk.blue("{ x: { 0: 'hi', 1: { 0: 'key' }, 2: 'key2', defined: 'string' } }")}
        
  ${chalk.white('drop')} ${chalk.grey('...<selector>')}
    - Removes the given paths from the database. 
      ${chalk.grey("> Removes table entries, not the data itself")}

  ${chalk.white('define')} ${chalk.grey('...<selector>')}
    - Defines the given paths in the database.
      ${chalk.grey("> Defaults values to null")}

  ${chalk.white('new')} ${chalk.grey('<path>')} ${chalk.grey('[name]')}
    - Creates a new database at the given path.
      ${chalk.grey("> Names are not mandatory and to 'Untitled Database'. These are simply used internally for housekeeping reasons.")}

  ${chalk.white('open')} ${chalk.grey('<path>')}
    - Opens the database at the given path.

  ${chalk.white('config')} ${chalk.grey('<key>')} ${chalk.grey('<value>')}
    - Sets the configuration key to the value.
      ${chalk.grey("> Omit value to remove the key.")}`.split('\n');
        }
    };

    if (cmdName in cmd)
        for (const line of await cmd[cmdName](...args)
            .then(out => strutil.wrapLines(out, `${chalk.grey(cmdName)}`))
            .catch(err => err instanceof Error ?
                strutil.wrapLines((config.verbose ? err.stack ?? err.message : err.message).split('\n'), `${chalk.red('Error')}`) :
                strutil.wrapLines(err.split('\n'), `${chalk.red('Error')}`)))
            console.log(line);
    else
        console.error(`${chalk.red('Invalid command')}: ${cmdName}`);
}
