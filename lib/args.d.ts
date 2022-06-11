declare module "@j-cake/jcake-utils/args" {
    /// <reference types="node" />
    import url from 'node:url'; type Option<Parser extends (arg: string) => any> = ({
        long?: string;
        short: string;
    } | {
        long: string;
        short?: string;
    }) & {
        format?: Parser;
        default?: ReturnType<Parser>;
        description?: string;
    };
    export type Parameters<Names extends {
        [name: string]: any;
    }> = {
            [name in keyof Names]: Option<Names[name]>;
        };
    export type Options<Main, Names extends {
        [name: string]: any;
    }, Config extends Parameters<Names>> = {
        default: Main;
    } & {
            [Parameter in keyof Config]: Config[Parameter] extends Option<(arg: string) => infer Type> ? Type : boolean;
        };
    export default function parse<Main, Names extends {
        [name: string]: any;
    }>(parameters: Parameters<Names>, main?: (arg: string) => Main): (args: string[]) => Options<Main, Names, typeof parameters>;
    export function Url(arg: string): url.URL;
    export function Path(exists: boolean): (arg: string) => string;
    export function Int(arg: string): number;
    export function Float(arg: string): number;
    export function DateTime(arg: string): Date;
    export function oneOf<List extends readonly string[]>(options: List, caseSensitive?: boolean): (arg: string) => List[number];
    export { };

}