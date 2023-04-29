import type { ActionFailure, RequestEvent } from '@sveltejs/kit';

import type { Profile } from '../Profile.js';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AuthProviderConfig {}

export abstract class AuthProvider<C extends AuthProviderConfig, P extends Profile> {
    config: C;
    name: string;

    constructor(name: string, config: C) {
        this.config = config;
        this.name = name;
    }

    /**
     * @throws {ActionFailure}
     */
    abstract verify(event: RequestEvent, callbackUri?: string): Promise<P>;
}
