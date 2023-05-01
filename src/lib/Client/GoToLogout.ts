import { logoutUrl } from './LogoutUrl.js';

export function goToLogout(pageData: App.PageData) {
    window.location.assign(logoutUrl(pageData));
}
