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
    /**
     * Registers all the providers that the current app supports
     *
     * @example [new GithubProvider(config)]
     */
    providers: AuthProvider<AuthProviderConfig, Profile>[];

    /**
     * Registers the session strategy that will be used in the current app.
     *
     * @example new JwtProvider(config)
     */
    sessionStrategy: SessionStrategy<SessionStrategyConfig>;

    /**
     * Allows hooking into certain parts of the auth process. Can be used for features such as persisting user data to database
     * or logging
     */
    hooks?: AuthHandlerHooks;

    /**
     * Changes the "root" path prefix for all routes used by sveltekit-auth. By default this is set to '/auth' and
     * all urls used by sveltekit-auth will start with '/auth' (example: '/auth/redirect/github')
     *
     * @example '/auth'
     * @default '/auth'
     */
    routePrefix?: string;

    /**
     * Changes the part of the path used to match a callback route. By default this is set to '/callback'
     * (example: '/auth/callback/github')
     *
     * @example '/callback'
     * @default '/callback'
     */
    callbackPrefix?: string;

    /**
     * Changes the part of the path used to match a redirect route. By default this is set to '/redirect'
     * (example: '/auth/redirect/github')
     *
     * @example '/redirect'
     * @default '/redirect'
     */
    redirectPrefix?: string;

    /**
     * Changes the part of the path used to match the logout route. By default this is set to '/logout'
     * (example: '/auth/logout')
     *
     * @example '/logout'
     * @default '/logout'
     */
    logoutPrefix?: string;

    /**
     * Where the user will be redirected to when using the RequireAuth helper if they are not logged in
     *
     * @example '/login'
     * @default '/login'
     */
    loginRoute?: string;

    /**
     * Where the user will be redirected to on a successful login
     *
     * @example '/'
     * @default '/'
     */
    loginRedirectRoute?: string;

    /**
     * Where the user will be redirected to after logging out, Defaults to loginRoute
     *
     * @example '/login'
     * @default '/login'
     */
    logoutRoute?: string;
}

export function AuthHandler(config: AuthHandlerConfig) {
    return (async ({ event, resolve }) => {
        const { url } = event;
        const {
            routePrefix = '/auth',
            callbackPrefix = '/callback',
            redirectPrefix = '/redirect',
            logoutPrefix = '/logout',
            loginRoute = '/login',
            loginRedirectRoute = '/',
            logoutRoute = loginRoute,
            providers,
            hooks = {},
        } = config;

        event.locals.auth = {
            getSession: async () => await config.sessionStrategy.getSession(event),
            getAuthPageData: async () => ({
                loginPaths: Object.fromEntries(
                    config.providers.map((p) => [
                        p.name,
                        `${routePrefix}${redirectPrefix}/${p.name}`,
                    ]),
                ),
                logOutPath: `${routePrefix}${logoutPrefix}`,
            }),
            loginRoute: loginRoute,
        };

        if (!url.pathname.startsWith(routePrefix)) {
            return resolve(event);
        }

        // logout
        if (url.pathname.startsWith(`${routePrefix}${logoutPrefix}`)) {
            await config.sessionStrategy.destroySession(event);

            throw redirect(302, logoutRoute);
        }

        const providerName = url.pathname.split('/').at(3);
        const provider = providers.find((p) => p.name === providerName);
        const callbackUri = `${url.origin}${routePrefix}${callbackPrefix}/${providerName}`;

        // callback
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

        // redirect
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
