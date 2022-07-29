import url from 'node:url';
import fs from 'node:fs';

type Option<Parser extends (arg: string) => any> =
    ({ long?: string, short: string } | { long: string, short?: string })
    & { format?: Parser, default?: ReturnType<Parser>, description?: string };

export type Parameters<Names extends { [name: string]: any }> = { [name in keyof Names]: Option<Names[name]> };

export type Options<Main, Names extends { [name: string]: any }, Config extends Parameters<Names>> = { default: Main }
    & { [Parameter in keyof Config]: Config[Parameter] extends Option<(arg: string) => infer Type> ? Type : boolean };

export default function parse<Main, Names extends { [name: string]: any }>(parameters: Parameters<Names>, main?: (arg: string) => Main): (args: string[]) => Options<Main, Names, typeof parameters> {
    return function (args: string[]): Options<Main, Names, typeof parameters> {
        const options: Options<Main, Names, typeof parameters> = {} as Options<Main, Names, typeof parameters>;

        if (main)
            options["default"] = main(args[0]);

        for (const i in parameters) {
            const param = parameters[i];

            if ('default' in param && 'format' in param && options && param.default)
                options[i] = param.default;

            if (param.short && param.short?.length > 1)
                throw `short names should only contain 1 character`;

            for (let j = 0, arg = args[j]; j < args.length; arg = args[++j])
                if ((param.long && arg.startsWith('--') && arg.slice(2) === parameters[i].long) ||
                    (param.short && arg.startsWith('-') && !arg.startsWith('--') && arg.slice(1).includes(param.short)))
                    options[i] = param.format ? param.format(args[++j]) : !param.default;

            if (!(i in options) && param.format)
                throw `required parameter '${i}' (${param.long ? '--' + (param.short ? param.long + ' or ' : param.long) : ''}${param.short ? '-' + param.short : ''})`;

        }

        return options;
    }
}

export function Url(arg: string): url.URL {
    return new url.URL(arg);
}

export function Path(exists: boolean): (arg: string) => string {
    return function (arg: string): string {
        const tidy = arg.split('/').filter(i => i).join('/');

        const out = arg.startsWith('/') ? '/' + tidy : tidy;

        if (exists && fs.existsSync(out) || !exists)
            return out;
        else throw `File does not exist`;
    }
}

export function Int(arg: string): number {
    const num = parseInt(arg);

    if (isNaN(num))
        throw `Invalid integer ${arg}`;

    return num;
}

export function Float(arg: string): number {
    const num = parseFloat(arg);

    if (isNaN(num))
        throw `Invalid float ${arg}`;

    return num;
}

export function DateTime(arg: string): Date {
    return new Date(arg);
}

export function oneOf<List extends readonly string[]>(options: List, caseSensitive: boolean = true): (arg: string) => List[number] {
    return function (arg: string): string {
        if (caseSensitive && options.includes(arg))
            return arg;
        else if (!caseSensitive)
            for (const i of options)
                if (i.toLowerCase() === arg.toLowerCase())
                    return i;

        throw `Expected one of ${options.slice(0, 3).join(', ')}${options.length > 3 ? '...' : ''}`;
    }
}