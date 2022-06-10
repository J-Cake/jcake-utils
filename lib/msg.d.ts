declare module "jcake-utils/msg" {
    export interface state {
        functionId: number;
        functions: {
            called: boolean;
            fId: number;
            cb: ((data?: any) => void);
        }[];
        requests: {
            fId: number;
            data: any;
            name: string;
        }[];
        requestHandlers: {
            [name: string]: (data: any) => any;
        };
        procName: string;
        msgTarget: <T>(msg: {
            fId: number;
            data: T;
            name: string;
        }) => void;
        incomingMsg: {
            fId: number;
            data: any;
            name: string;
        };
    }
    export type channelFn = <T>(name: string, data: any) => Promise<T>;
    export default function (stateManager: import('jcake-utils/state').default<state>): channelFn;    

}