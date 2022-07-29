import StateManager from "#state";

export interface state {
    functionId: number,
    functions: { called: boolean, fId: number, cb: ((data?: any) => void) }[],
    requests: { fId: number, data: any, name: string }[],
    requestHandlers: { [name: string]: (data: any) => any },
    procName: string,
    msgTarget: <T>(msg: { fId: number, data: T, name: string }) => void,
    incomingMsg: { fId: number, data: any, name: string }
}

export type channelFn = <T>(
    name: string,
    data: any) => Promise<T>;

export default function (stateManager: StateManager<state>): channelFn {
    stateManager.on('requestInfo', function (state: state) {
        if (state.requests) {
            const fn = state.requests[state.requests.length - 1];

            if (state.requestHandlers && state.requestHandlers[fn.name])
                if (state.msgTarget)
                    state.msgTarget<state>({
                        fId: fn.fId,
                        data: state.requestHandlers[fn.name].bind(stateManager)(fn.data),
                        name: fn.name
                    });
        }
    });

    stateManager.on('message', function (prev: state) {
        const data: { fId: number, data: any, name?: string } = prev.incomingMsg;

        if ('fId' in data) {
            const state: state = stateManager.setState();

            if (state.functions?.find(i => i.fId === data.fId)) {
                if (state.functions)
                    for (const f of state.functions)
                        if (f.fId === data.fId) {
                            f.called = true;
                            if (data.data)
                                f.cb(data.data);
                            else
                                f.cb();
                        }
            } else {
                stateManager.dispatch('requestInfo', function (prev: state): Partial<state> {
                    if ('name' in data && data.name)
                        return {
                            functionId: Math.max(prev.functionId || 0, data.fId) + 1,
                            requests: [...prev.requests, {
                                fId: data.fId,
                                data: data.data,
                                name: data.name
                            }]
                        }
                    return {}
                });
            }
        }
    });

    return function requestInfo<T>(
        name: string,
        data: any): Promise<T> {
        return new Promise(function (resolve) {
            const onReturn = function (data: T) {
                resolve(data);
            };

            const state = stateManager.setState();

            if (state.msgTarget)
                state.msgTarget({
                    fId: state.functionId || 0,
                    data,
                    name
                });

            stateManager.setState(prev => ({
                functionId: (prev.functionId || 0) + 1,
                functions: [...prev.functions, {
                    called: false,
                    fId: state?.functionId || 0,
                    cb: (data: T) => onReturn(data)
                }]
            }));
        })
    }
}
