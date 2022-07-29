export default class StateManager<State extends {}> {
    private readonly globState: State;

    private readonly watchers: ((state: State) => any)[];
    private readonly eventHandlers: {callback: (state: State) => any, name: string}[];

    // private utils: {
    //     [name: string]: (state: State) => any
    // };

    constructor(defaults?: Partial<State>) { // , utils?: {[name: string]: (state: State) => any}
        this.watchers = [];
        this.eventHandlers = [];

        this.globState = defaults as State;

        // this.utils = utils || {};
    }

    private invokeHandlers() {
        for (const handler of this.watchers)
            handler(this.globState);
    }

    get(): State {
        return this.globState;
    }

    setState(state?: Partial<State> | ((prev: State) => Partial<State>)): State {
        const _state: Partial<State> | undefined = state instanceof Function ? state(this.globState) : state;

        if (_state) {
            for (const i of Object.keys(_state))
                // @ts-ignore
                this.globState[i] = _state[i];

            this.invokeHandlers();
        }

        return this.globState;
    }

    async setStateAsync(state?: Promise<Partial<State>> | ((prev: State) => Promise<Partial<State>>)): Promise<State> {
        const _state: Partial<State> | undefined = await (state instanceof Function ? state(this.globState) : state);

        if (_state) {
            for (const i of Object.keys(_state))
                // @ts-ignore
                this.globState[i] = _state[i];

            this.invokeHandlers();
        }

        return this.globState;
    }

    onStateChange(callback: (state: State) => any): number {
        this.watchers.push(callback);

        return this.watchers.length;
    }

    removeStateListener(id: number): void {
        if (this.watchers[id])
            delete this.watchers[id];
    }

    on(event: string, callback: (state: State) => any): number {
        this.eventHandlers.push({
            callback: (state: State) => callback(state),
            name: event,
        });

        return this.eventHandlers.length;
    }

    off(id: number): void {
        if (this.eventHandlers[id])
            delete this.eventHandlers[id];
    }

    dispatch(event: string, state: Partial<State> | ((prev: State) => Partial<State>)): void {
        if (state instanceof Function)
            this.setState(state(this.globState));
        else
            this.setState(state);

        const events = this.eventHandlers.filter(i => i.name === event);

        for (const i of events)
            i.callback(this.globState);
    }

    broadcast(event: string): void {
        const events = this.eventHandlers.filter(i => i.name === event);

        for (const i of events)
            i.callback(this.globState);
    }
}
