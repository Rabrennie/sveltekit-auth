import { redirect } from '@sveltejs/kit';

import type { Profile } from '../AuthProviders/index.js';

// TODO: Tidy up these types, they work but are a mess

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OmitFirst<T extends any[]> = T extends [any, ...infer U] ? U : never;
type AuthenticatedSession<T, K extends keyof T> = {
    [K in keyof T]: { getSession: () => Promise<Profile> } & Omit<T[K], 'getSession'>;
} & Omit<T, K>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Authenticated<T extends (...args: any[]) => any, P extends any[] = Parameters<T>> = (
    event: Omit<P[0], 'locals'> & { locals: AuthenticatedSession<App.Locals, 'auth'> },
    ...args: OmitFirst<P>
) => ReturnType<T>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const RequireAuth = <T extends (event: any, ...args: any[]) => any>(
    cb: Authenticated<T>,
) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (async (event: Parameters<T>[0], ...args: OmitFirst<Parameters<T>>) => {
        const locals = event.locals as App.Locals;

        if (!(await locals.auth.getSession())) {
            throw redirect(303, locals.auth.loginRoute);
        }

        return await cb(event, ...args);
    }) as T;
};
