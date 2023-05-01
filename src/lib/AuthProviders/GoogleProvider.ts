import { type RequestEvent, type Redirect, redirect, fail } from '@sveltejs/kit';
import { Issuer, TokenSet, generators } from 'openid-client';

import { OAuthProvider } from './OAuthProvider.js';
import type { AuthProviderConfig } from './AuthProvider.js';
import type { Profile } from '../Profile.js';

interface GoogleProviderConfig extends AuthProviderConfig {
    clientId: string;
    clientSecret: string;
}

export class GoogleProvider extends OAuthProvider<GoogleProviderConfig, Profile> {
    constructor(config: GoogleProviderConfig) {
        super('google', config);
    }

    async getClient(callbackUri: string) {
        const issuer = await Issuer.discover('https://accounts.google.com');

        return new issuer.Client({
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            redirect_uris: [callbackUri],
            response_types: ['code'],
        });
    }

    async redirectToProvider({ cookies }: RequestEvent, callbackUri: string): Promise<Redirect> {
        const nonce = generators.nonce();
        const client = await this.getClient(callbackUri);

        cookies.set('nonce', nonce, { path: '/', httpOnly: true });

        const url = client.authorizationUrl({
            scope: 'openid email profile',
            response_mode: 'query',
            nonce,
        });

        return redirect(307, url);
    }

    async verify({ request, cookies }: RequestEvent, callbackUri: string): Promise<Profile> {
        const client = await this.getClient(callbackUri);
        const params = client.callbackParams(request.url);
        const nonce = cookies.get('nonce');

        let tokenSet: TokenSet;
        try {
            tokenSet = await client.callback(callbackUri, params, {
                nonce,
            });
        } catch {
            throw fail(403);
        } finally {
            cookies.delete('nonce', { path: '/', httpOnly: true });
        }

        if (tokenSet.error) {
            throw fail(403, tokenSet);
        }

        const userInfo = await client.userinfo(tokenSet);

        return {
            providerId: userInfo.sub,
            provider: this.name,
            name: userInfo.name,
            username: userInfo.email,
            email: userInfo.email as string,
            image: userInfo.picture,
        };
    }
}
