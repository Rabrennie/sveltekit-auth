import { redirect, type Handle, fail, type RequestEvent } from '@sveltejs/kit';

import type { AuthProviderConfig, Profile } from '../AuthProviders/AuthProvider.js';
import type { AuthProvider } from '../AuthProviders/AuthProvider.js';
import type { OAuthProvider } from '../AuthProviders/OAuthProvider.js';
import type {
    SessionStrategyConfig,
    SessionStrategy,
} from '../SessionStrategies/SessionStrategy.js';

interface AuthHandlerHooks {
    afterCallback?: (event: RequestEvent, profile: Profile) => Promise<void>;
}

interface AuthHandlerConfig {
    providers: AuthProvider<AuthProviderConfig, Profile>[];

    sessionStrategy: SessionStrategy<SessionStrategyConfig>;

    hooks?: AuthHandlerHooks;

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

    /**
     * @example '/login'
     * @default '/login'
     */
    loginRoute?: string;
}

export function AuthHandler(config: AuthHandlerConfig) {
    return (async ({ event, resolve }) => {
        const { url } = event;
        const {
            routePrefix = '/auth',
            callbackPrefix = '/callback',
            redirectPrefix = '/redirect',
            providers,
            hooks = {},
        } = config;

        event.locals.auth = {
            getSession: async () => await config.sessionStrategy.getSession(event),
            loginRoute: '/login',
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

            if (hooks.afterCallback) {
                await hooks.afterCallback(event, profile);
            }

            throw redirect(302, '/');
        }

        if (url.pathname.startsWith(`${routePrefix}${redirectPrefix}`)) {
            if (provider && 'redirectToProvider' in provider) {
                throw await (
                    provider as OAuthProvider<AuthHandlerConfig, Profile>
                ).redirectToProvider(event, callbackUri);
            }

            throw fail(400);
        }

        return resolve(event);
    }) satisfies Handle;
}
