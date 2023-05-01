// See https://kit.svelte.dev/docs/types#app

import type { AuthClient, AuthPageData } from '$lib';

// for information about these interfaces
declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            auth: AuthClient;
        }
        interface PageData {
            auth: AuthPageData;
        }
        // interface Platform {}
    }
}

export {};
