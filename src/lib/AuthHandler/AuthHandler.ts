import { redirect, type Handle, fail } from '@sveltejs/kit';

import type { AuthProviderConfig, Profile } from '../AuthProviders/AuthProvider.js';
import type { AuthProvider } from '../AuthProviders/AuthProvider.js';
import { OAuthProvider } from '../AuthProviders/OAuthProvider.js';
import type {
    SessionStrategyConfig,
    SessionStrategy,
} from '../SessionStrategies/SessionStrategy.js';

interface AuthHandlerConfig {
    providers: AuthProvider<AuthProviderConfig, Profile>[];

    sessionStrategy: SessionStrategy<SessionStrategyConfig>;

    /**
     * @example '/auth'
     * @default '/auth'
     */
    routePrefix?: string;

    /**
     * @example '/callback'
     * @default '/callback'
     */
    callbackPrefix?: string;

    /**
     * @example '/redirect'
     * @default '/redirect'
     */
    redirectPrefix?: string;
}

export function AuthHandler(config: AuthHandlerConfig) {
    return (async ({ event, resolve }) => {
        const { url } = event;
        const {
            routePrefix = '/auth',
            callbackPrefix = '/callback',
            redirectPrefix = '/redirect',
            providers,
        } = config;

        event.locals.auth = {
            getSession: async () => await config.sessionStrategy.getSession(event),
        };

        if (!url.pathname.startsWith(routePrefix)) {
            return resolve(event);
        }

        const providerName = url.pathname.split('/').at(3);
        const provider = providers.find((p) => p.name === providerName);
        const callbackUri = `${url.origin}${routePrefix}${callbackPrefix}/${providerName}`;

        if (url.pathname.startsWith(`${routePrefix}${callbackPrefix}`)) {
            if (!provider) {
                throw fail(400);
            }

            const profile = await provider.verify(event, callbackUri);
            await config.sessionStrategy.store(event, profile);

            throw redirect(302, '/');
        }

        if (url.pathname.startsWith(`${routePrefix}${redirectPrefix}`)) {
            if (provider instanceof OAuthProvider) {
                throw provider.redirectToProvider(event, callbackUri);
            }

            throw fail(400);
        }

        return resolve(event);
    }) satisfies Handle;
}
