import { type BaseClient, Issuer, generators } from 'openid-client';
import { redirect, fail, type RequestEvent } from '@sveltejs/kit';

import type { AuthProviderConfig, Profile } from './AuthProvider.js';
import { OAuthProvider } from './OAuthProvider.js';

export interface GithubUser {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string | null;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
    name: string | null;
    company: string | null;
    blog: string | null;
    location: string | null;
    email: string | null;
    hireable: boolean | null;
    bio: string | null;
    twitter_username: string | null;
    public_repos: number;
    public_gists: number;
    followers: number;
    following: number;
    created_at: string;
    updated_at: string;
    private_gists: number;
    total_private_repos: number;
    owned_private_repos: number;
    disk_usage: number;
    collaborators: number;
    two_factor_authentication: boolean;
    plan: {
        collaborators: number;
        name: string;
        space: number;
        private_repos: number;
    };
    suspended_at: string | null;
    business_plus: boolean;
    ldap_dn: string;
}

export interface GithubEmail {
    email: string;
    primary: boolean;
    verified?: boolean;
    visibility?: 'private' | 'public' | null;
}

export interface GithubProfile extends Profile {
    user: GithubUser;
    emails: GithubEmail[];
}

interface GithubProviderConfig extends AuthProviderConfig {
    clientId: string;
    clientSecret: string;
}

export class GithubProvider extends OAuthProvider<GithubProviderConfig, GithubProfile> {
    issuer: Issuer;
    client: BaseClient;

    readonly authorizationEndpoint = 'https://github.com/login/oauth/authorize';
    readonly tokenEndpoint = 'https://github.com/login/oauth/access_token';
    readonly userinfoEndpoint = 'https://api.github.com/user';
    readonly emailsEndpoint = 'https://api.github.com/user/emails';

    constructor(config: GithubProviderConfig) {
        super('github', config);

        this.issuer = new Issuer({
            issuer: 'github.com',
            authorization_endpoint: this.authorizationEndpoint,
            token_endpoint: this.tokenEndpoint,
            userinfo_endpoint: this.userinfoEndpoint,
        });

        this.client = new this.issuer.Client({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            token_endpoint_auth_method: 'client_secret_post',
        });
    }

    async redirectToProvider({ cookies }: RequestEvent, callbackUri: string) {
        const state = generators.state();
        cookies.set('state', state, { path: '/', httpOnly: true });

        const url = this.client.authorizationUrl({
            client_id: this.config.clientId,
            state,
            scope: 'read:user user:email',
            redirect_uri: callbackUri,
        });

        return redirect(307, url);
    }

    async verify({ request, cookies }: RequestEvent, callbackUri?: string): Promise<GithubProfile> {
        const params = this.client.callbackParams(request.url);
        const tokenSet = await this.client.oauthCallback(callbackUri, params, {
            state: cookies.get('state'),
        });

        cookies.delete('state');

        if (tokenSet.error) {
            throw fail(403, tokenSet);
        }

        // TODO: validate this
        const user = (await this.client.userinfo(tokenSet)) as GithubUser;

        const emailResource = await this.client.requestResource(this.emailsEndpoint, tokenSet);
        if (!emailResource.body) {
            throw fail(400);
        }

        // TODO: validate this
        const emails = JSON.parse(emailResource.body.toString()) as GithubEmail[];

        return {
            providerId: user.id.toString(),
            provider: this.name,
            username: user.login,
            name: user.name ?? undefined,
            email: emails.find((e) => e.primary)?.email ?? emails[0].email,
            emails,
            user,
        };
    }
}
