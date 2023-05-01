export function loginUrl(pageData: App.PageData, provider: string) {
    return pageData.auth.loginPaths[provider];
}
