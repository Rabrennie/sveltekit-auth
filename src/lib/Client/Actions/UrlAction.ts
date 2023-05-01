import { page } from '$app/stores';
import type { AuthPageData } from '../../AuthClient.js';

export function urlAction(node: HTMLElement, getUrl: (authPageData: AuthPageData) => string) {
    let clickListener: undefined | (() => void);

    const unsubscribe = page.subscribe((pageData) => {
        // TODO: throw error in dev mode if pageData.data.auth is not set
        const authPageData = pageData.data.auth;

        const url = getUrl(authPageData);

        if (node instanceof HTMLAnchorElement) {
            node.setAttribute('href', url);
        } else {
            clickListener = () => {
                window.location.assign(url);
            };
            node.addEventListener('click', clickListener);
        }
    });

    return {
        destroy() {
            unsubscribe();
            if (clickListener) {
                node.removeEventListener('click', clickListener);
            }
        },
    };
}
