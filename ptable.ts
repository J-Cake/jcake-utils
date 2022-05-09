import _ from "lodash";

export type iNodeList = { path: Buffer, inodec: number, inodes: [start: number, end: number][] };
export async function parsePTable(ptableHeader: Buffer): Promise<Map<string, [start: number, end: number][]>> {
    const nodec = ptableHeader.readUInt32BE(0);

    const nodes: Map<string, [start: number, end: number][]> = new Map();

    for (let offset = 4; nodes.size < nodec;) {
        const path = ptableHeader.slice(offset + 4, offset + 4 + ptableHeader.readUInt32BE(offset));
        offset += path.length + 4;
        const inodec = ptableHeader.readUInt32BE(offset);
        offset += 4;
        const inodes: [start: number, end: number][] = _.times(inodec, a => [ptableHeader.readUInt32BE(offset + a * 8), ptableHeader.readUInt32BE(offset + a * 8 + 4)]);
        offset += inodec * 8;

        nodes.set(path.toString('utf8'), inodes);
    }

    return nodes;
}