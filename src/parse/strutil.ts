import _ from "lodash";

export function splitTop(token: string, delimiter: string): string[] {
    let b = 0;
    const segments: string[] = [];

    segments.push([...token].reduce(function (acc, i) {
        const tok = acc + i;

        if (i === '[')
            b++;
        else if (i === ']')
            if (--b < 0)
                throw `Bracket mismatch`;

        if (tok.endsWith(delimiter) && b === 0) {
            segments.push(tok.slice(0, -delimiter.length));
            return '';
        }

        return tok;
    }, ''));

    return segments;
}

export function hasTop(str: string, has: string): boolean {
    if (!str.includes(has))
        return false;

    let b = 0;

    let acc = '';
    for (const i of str) {
        acc += i;

        if (i === '[')
            b++;
        else if (i === ']')
            if (--b < 0)
                throw `Bracket mismatch`;

        if (acc.endsWith(has) && b === 0)
            return true;
    }
    
    return false;
};

export const trim = (str: string) => /^[\s\0]*(.*?)[\s\0]*$/.exec(str)?.[1] ?? '';

export function parseSize (size: string): number {
    const [, num, unit] = /^(\d+(?:\.\d+)?)([a-zA-Z]+)$/.exec(size) ?? [];

    const units: Record<string, number> = {
        B: 1,
        KiB: 2 ** 10,
        MiB: 2 ** 20,
        GiB: 2 ** 30,
        TiB: 2 ** 40,
        KB: 10 ** 3,
        MB: 10 ** 6,
        GB: 10 ** 9,
        TB: 10 ** 12,
    }

    if (isNaN(Number(num)) || !units[unit])
        throw `Invalid size: ${size}`;

    return Number(num) * units[unit];
}

export function wrapLines(string: string[], wrap: string): string[] {
    return _.flatten(string.map(i => i.split('\n'))).map(i => `${wrap}: ${i}`);
}

export const base64 = (str: string) => Buffer.from(str).toString('base64');
export const hex = (str: string) => Buffer.from(str).toString('hex');