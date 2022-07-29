export interface URL {
    scheme: string,
    authority: {
        user: string,
        pass: string,
        host: string,
        port: number
    },
    path: string,
    query: [string, string][],
    hash: string,
}

export const defaultUrl: URL = {
    scheme: '',
    authority: {
        user: '',
        pass: '',
        host: '',
        port: 0
    },
    path: '',
    query: [],
    hash: ''
}

export default function url(source: string, defaults?: URL): URL {
    const url: URL = defaults ?? defaultUrl;

    return url;
}