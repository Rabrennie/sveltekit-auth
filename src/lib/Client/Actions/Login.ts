import { loginUrl } from '../LoginUrl.js';
import { urlAction } from './UrlAction.js';

export function login(node: HTMLElement, provider: string) {
    return urlAction(node, (pageData) => {
        return loginUrl(pageData, provider);
    });
}
