// See https://kit.svelte.dev/docs/types#app

import type { AuthClient } from '$lib';

// for information about these interfaces
declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            auth: AuthClient;
        }
        // interface PageData {}
        // interface Platform {}
    }
}

export {};
