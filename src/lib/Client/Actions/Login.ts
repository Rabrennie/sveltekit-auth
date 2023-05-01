import { urlAction } from './UrlAction.js';

export function login(node: HTMLElement, provider: string) {
    return urlAction(node, (authPageData) => {
        const { routePrefix, redirectPrefix } = authPageData;
        return `${routePrefix}${redirectPrefix}/${provider}`;
    });
}
