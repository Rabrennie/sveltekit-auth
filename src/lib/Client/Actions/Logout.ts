import { logoutUrl } from '../LogoutUrl.js';
import { urlAction } from './UrlAction.js';

export function logout(node: HTMLElement) {
    return urlAction(node, (pageData) => {
        return logoutUrl(pageData);
    });
}
