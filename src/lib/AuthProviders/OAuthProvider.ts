import type { Redirect, RequestEvent } from '@sveltejs/kit';
import { type AuthProviderConfig, type Profile, AuthProvider } from './AuthProvider.js';

export abstract class OAuthProvider<
    C extends AuthProviderConfig,
    P extends Profile,
> extends AuthProvider<C, P> {
    /**
     * @throws {Redirect}
     */
    abstract redirectToProvider(event: RequestEvent, callbackUri: string): Redirect;
}
