import { redirect, type Handle, fail, type RequestEvent } from '@sveltejs/kit';

import type { AuthProviderConfig } from '../AuthProviders/AuthProvider.js';
import type { AuthProvider } from '../AuthProviders/AuthProvider.js';
import type { OAuthProvider } from '../AuthProviders/OAuthProvider.js';
import type {
    SessionStrategyConfig,
    SessionStrategy,
} from '../SessionStrategies/SessionStrategy.js';
import type { Profile } from '../Profile.js';

interface AuthHandlerHooks {
    onLogin?: (event: RequestEvent, profile: Profile) => Promise<void>;
}

export interface AuthHandlerConfig {
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
     * Where the user will be redirected to when using the RequireAuth helper if they are not logged in
     * @example '/login'
     * @default '/login'
     */
    loginRoute?: string;

    /**
     * Where the user will be redirected to on a successful login
     * @example '/'
     * @default '/'
     */
    loginRedirectRoute?: string;
}

export function AuthHandler(config: AuthHandlerConfig) {
    return (async ({ event, resolve }) => {
        const { url } = event;
        const {
            routePrefix = '/auth',
            callbackPrefix = '/callback',
            redirectPrefix = '/redirect',
            loginRoute = '/login',
            loginRedirectRoute = '/',
            providers,
            hooks = {},
        } = config;

        event.locals.auth = {
            getSession: async () => await config.sessionStrategy.getSession(event),
            getAuthPageData: async () => ({
                routePrefix,
                callbackPrefix,
                redirectPrefix,
                loginRoute,
                loginRedirectRoute,
            }),
            loginRoute: loginRoute,
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

            if (hooks.onLogin) {
                await hooks.onLogin(event, profile);
            }

            throw redirect(302, loginRedirectRoute);
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
