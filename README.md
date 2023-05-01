# sveltekit-auth <!-- omit from toc -->

Auth library for SvelteKit supporting OpenID/OAuth providers

## Table of Contents <!-- omit from toc -->

- [Installing](#installing)
- [Setup](#setup)
  - [Handle Hook](#handle-hook)
  - [App Types](#app-types)
  - [Server layout file](#server-layout-file)
- [Protecting Routes](#protecting-routes)
  - [Using the `RequireAuth` helper](#using-the-requireauth-helper)
  - [Checking the session manually](#checking-the-session-manually)
- [Client Helpers](#client-helpers)
  - [`use:login` and `use:logout`](#uselogin-and-uselogout)
  - [`loginUrl()` and `logoutUrl()`](#loginurl-and-logouturl)
  - [`goToLogin()` and `goToLogout()`](#gotologin-and-gotologout)
- [AuthHandler](#authhandler)
  - [AuthHandler Options](#authhandler-options)
- [License](#license)


## Installing

Using npm:

```bash
$ npm install @rabrennie/sveltekit-auth
```

Using yarn:

```bash
$ yarn add @rabrennie/sveltekit-auth
```

Using pnpm:

```bash
$ pnpm add @rabrennie/sveltekit-auth
```

## Setup

### Handle Hook

In order to be able to handle the auth routes and populate `event.locals` you must register a [handle hook](https://kit.svelte.dev/docs/hooks#server-hooks-handle) in `src/hooks.server.ts` (or `src/hooks.server.js` if not using typescript). Your hooks file should look like the following:

```typescript
import type { Handle } from '@sveltejs/kit';

export const handle = AuthHandler(config) satisfies Handle
```

or if using more than one handle function

```typescript
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { AuthHandler } from '@rabrennie/sveltekit-auth';

const authHandler = AuthHandler(config) satisfies Handle;

const anotherHandler = (async ({ event, resolve }) => {
    return resolve(event);
}) satisfies Handle;


// You should always have authHandler first in the sequence
export const handle = sequence(authHandler, anotherHandler)
```

[The config options for `AuthHandler` are defined here](#authhandler-options).

### App Types

You need to tell Sveltekit that we have objects in `PageData` and `Locals` so it can correctly type them. Your `src/app.d.ts` should look like the following:

```typescript
import type { AuthClient, AuthPageData } from '@rabrennie/sveltekit-auth';

declare global {
    namespace App {
        // ...other types
        interface Locals {
            // ...other types
            auth: AuthClient;
        }
        interface PageData {
            // ...other types
            auth: AuthPageData;
        }
    }
}

export {};
```

For more information about this see [the Sveltekit Docs](https://kit.svelte.dev/docs/types#app)

### Server layout file

In your root `/src/+layout.server.ts` (or `/src/+layout.server.js` if not using typescript) you will have to expose the data to the client in order to be able to use the helper methods. You can do this by making the file look like the following:

```typescript
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
    return {
        auth: await locals.auth.getAuthPageData(),
    };
};
```

## Protecting Routes

You have a few options to protect routes. You should always do route protection in `+page.server.ts` (or `+page.server.js` if not using typescript) files to ensure they are always run for the route. 

### Using the `RequireAuth` helper

In your `+page.server.ts` (or `+page.server.js` if not using typescript) for a route you can define a load function and wrap it in the `RequireAuth` helper. If the session is not set the user will be redirected to the `loginRoute` defined in the `AuthHandler` config.

Here is an example of using the helper:

```typescript
import type { PageServerLoad } from './$types';
import { RequireAuth, type Authenticated } from '@rabrennie/sveltekit-auth/helpers';

const loadFunction: Authenticated<PageServerLoad> = async ({ locals }) => {
   const session = await locals.auth.getSession();
   // do something with the session.
};

export const load = RequireAuth(loadFunction);
```

You can also use this to protect actions in the same way

```typescript
import type { Actions } from './$types';
import { RequireAuth } from '@rabrennie/sveltekit-auth/helpers';

export const actions = {
    anAction: RequireAuth(async ({ locals }) => {
        const session = await locals.auth.getSession();
        // do something with the session.
    })
} satisfies Actions;
```

### Checking the session manually 

In your `+page.server.ts` (or `+page.server.js` if not using typescript) for a route you can define a load function and check the session manually.

Here is an example of checking the session manually:

```typescript
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
    const session = await locals.auth.getSession();
 
    if (!session) {
        throw redirect(302, '/login');
    }
    
    // do something with the session.
 };
```

You can also use this to protect actions in the same way

```typescript
import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';

export const actions = {
    anAction: RequireAuth(async ({ locals }) => {
        const session = await locals.auth.getSession();
 
        if (!session) {
            throw redirect(302, '/login');
        }
        
        // do something with the session.
    })
} satisfies Actions;
```

## Client Helpers

### `use:login` and `use:logout`

> Note these can only be used on DOM elements

You can use these helpers to set the correct handler on an element for logging in and out. For anchor elements this will set the href attribute to the relevant url. For all other elements they will register a click handler that will navigate to the correct url.

Example usage:

```html
<script lang="ts">
    import { login, logout} from '@rabrennie/sveltekit-auth/client';
</script>

<a use:login={'github'}>Log in with GitHub</a>
<button use:logout>Logout</button>
```

### `loginUrl()` and `logoutUrl()`

You can use these helpers to get the relevant url for logging in and out.

Example usage:

```html
<script lang="ts">
    import { page } from '$app/stores';
    import { loginUrl, logoutUrl } from '@rabrennie/sveltekit-auth/client';
</script>

<a href={loginUrl($page.data, 'github')}>Log in with GitHub</a>
<a href={logoutUrl($page.data)}>Logout</a>
```

### `goToLogin()` and `goToLogout()`

You can use these helpers to navigate to the relevant url for logging in and out.

Example usage:

```html
<script lang="ts">
    import { page } from '$app/stores';
    import { goToLogin, goToLogout } from '@rabrennie/sveltekit-auth/client';
</script>

<button on:click={() => goToLogin($page.data, 'github')}>Log in with GitHub</button>
<button on:click={() => goToLogout($page.data)}>Logout</button>
```

## AuthHandler

### AuthHandler Options

Below is the definition for the AuthHandler config. You do not need to provide any of the optional parameters.

```typescript
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
```

## License

[MIT](LICENSE)
