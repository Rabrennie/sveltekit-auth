import { page } from '$app/stores';

export function login(node: HTMLElement, provider: string) {
    let clickListener: undefined | (() => void);

    const unsubscribe = page.subscribe((pageData) => {
        // TODO: throw error in dev mode if pageData.data.auth is not set
        const { routePrefix, redirectPrefix } = pageData.data.auth;

        const url = `${routePrefix}${redirectPrefix}/${provider}`;

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
