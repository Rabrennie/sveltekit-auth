import type { Redirect, RequestEvent } from '@sveltejs/kit';
import { type AuthProviderConfig, AuthProvider } from './AuthProvider.js';
import type { Profile } from '../Profile.js';

export abstract class OAuthProvider<
    C extends AuthProviderConfig,
    P extends Profile,
> extends AuthProvider<C, P> {
    abstract redirectToProvider(event: RequestEvent, callbackUri: string): Promise<Redirect>;
}
