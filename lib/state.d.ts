declare module "@j-cake/jcake-utils/state" {
    export default class StateManager<State extends {}> {
        private readonly globState;
        private readonly watchers;
        private readonly eventHandlers;
        constructor(defaults?: Partial<State>);
        private invokeHandlers;
        get(): State;
        setState(state?: Partial<State> | ((prev: State) => Partial<State>)): State;
        setStateAsync(state?: Promise<Partial<State>> | ((prev: State) => Promise<Partial<State>>)): Promise<State>;
        onStateChange(callback: (state: State) => any): number;
        removeStateListener(id: number): void;
        on(event: string, callback: (state: State) => any): number;
        off(id: number): void;
        dispatch(event: string, state: Partial<State> | ((prev: State) => Partial<State>)): void;
        broadcast(event: string): void;
    }
    
}

// declare module "#state" {
//     export * from '@j-cake/jcake-utils/state';
// }