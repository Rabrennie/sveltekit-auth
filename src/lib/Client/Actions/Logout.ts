import { urlAction } from './UrlAction.js';

export function logout(node: HTMLElement) {
    return urlAction(node, (authPageData) => {
        const { routePrefix, logoutPrefix } = authPageData;
        return `${routePrefix}${logoutPrefix}`;
    });
}
