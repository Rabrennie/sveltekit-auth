import { loginUrl } from './LoginUrl.js';

export function goToLogin(pageData: App.PageData, provider: string) {
    window.location.assign(loginUrl(pageData, provider));
}
