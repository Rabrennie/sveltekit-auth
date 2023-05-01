import type { RequestEvent } from '@sveltejs/kit';

import type { Profile } from '../Profile.js';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SessionStrategyConfig {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Session extends Profile {}

export abstract class SessionStrategy<C extends SessionStrategyConfig> {
    config: C;

    constructor(config: C) {
        this.config = config;
    }

    abstract store(event: RequestEvent, profile: Profile): Promise<void>;
    abstract getSession(event: RequestEvent): Promise<Session | undefined>;
    abstract destroySession(event: RequestEvent): Promise<void>;
}
