import { page } from '$app/stores';

export function urlAction(node: HTMLElement, getUrl: (pageData: App.PageData) => string) {
    let clickListener: undefined | (() => void);

    const unsubscribe = page.subscribe((pageData) => {
        // TODO: throw error in dev mode if pageData.data.auth is not set
        const url = getUrl(pageData.data);

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
