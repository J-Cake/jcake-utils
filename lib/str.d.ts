declare module "jcake-utils/str" {
    export function splitTop(token: string, delimiter: string): string[];
    export function hasTop(str: string, has: string): boolean;
    export const trim: (str: string) => string;
    export function parseSize(size: string): number;
    export function wrapLines(string: string[], wrap: string): string[];
    export const base64: (str: string) => string;
    export const hex: (str: string) => string;
}