import { describe, it, expect, vi, beforeEach } from 'vitest';
import { any, anyFunction, mock, type MockProxy } from 'vitest-mock-extended';
import { redirect, type Handle, type RequestEvent } from '@sveltejs/kit';

import type { AuthProvider, AuthProviderConfig } from '$lib/AuthProviders';
import type { SessionStrategy, SessionStrategyConfig } from '$lib/SessionStrategies';
import { AuthHandler } from '$lib/AuthHandler/AuthHandler';
import type { OAuthProvider } from '$lib/AuthProviders';
import type { Profile } from '$lib/Profile';

describe('AuthHandler', () => {
    let mockProvider: MockProxy<AuthProvider<AuthProviderConfig, Profile>>;
    let mockSessionStrategy: MockProxy<SessionStrategy<SessionStrategyConfig>>;
    let mockRequestEvent: MockProxy<RequestEvent>;
    let handlerInput: Parameters<Handle>[0];

    beforeEach(() => {
        mockProvider = mock<AuthProvider<AuthProviderConfig, Profile>>();
        mockProvider.name = 'MockAuthProvider';

        mockSessionStrategy = mock<SessionStrategy<SessionStrategyConfig>>();
        mockRequestEvent = mock<RequestEvent>();
        mockRequestEvent.url = new URL('http://example.com/');

        handlerInput = {
            event: mockRequestEvent,
            resolve: vi.fn(),
        };
    });

    it('calls resolve if url doesnt start with route prefix', async () => {
        const handler = AuthHandler({
            providers: [mockProvider],
            sessionStrategy: mockSessionStrategy,
        });

        await handler(handlerInput);

        expect(handlerInput.resolve).toHaveBeenCalledOnce();
    });

    it('calls resolve if url starts with route prefix but doesnt match sub path', async () => {
        mockRequestEvent.url = new URL('/auth/something', 'http://example.com/');

        const handler = AuthHandler({
            providers: [mockProvider],
            sessionStrategy: mockSessionStrategy,
        });

        await handler(handlerInput);

        expect(handlerInput.resolve).toHaveBeenCalledOnce();
    });

    it('sets event.locals.auth', async () => {
        const handler = AuthHandler({
            providers: [mockProvider],
            sessionStrategy: mockSessionStrategy,
        });

        await handler(handlerInput);

        expect(mockRequestEvent.locals.auth).toEqual({
            getSession: anyFunction(),
            loginRoute: '/login',
        });
    });

    describe('callback', () => {
        it('throws 400 if provider does not exist', async () => {
            mockRequestEvent.url = new URL('/auth/callback/does-not-exist', 'http://example.com');

            const handler = AuthHandler({
                providers: [mockProvider],
                sessionStrategy: mockSessionStrategy,
            });

            await expect(handler(handlerInput)).rejects.toEqual({ data: undefined, status: 400 });
        });

        it('verifies callback and stores session', async () => {
            const profile = {
                providerId: '123321',
                provider: 'myProvider',
                username: 'abc',
                name: 'Some One',
                email: 'test@example.com',
            };
            mockProvider.verify.mockResolvedValue(profile);
            mockRequestEvent.url = new URL('/auth/callback/MockAuthProvider', 'http://example.com');

            const handler = AuthHandler({
                providers: [mockProvider],
                sessionStrategy: mockSessionStrategy,
            });

            await expect(handler(handlerInput)).rejects.toEqual({ location: '/', status: 302 });
            expect(mockProvider.verify).toHaveBeenCalledWith(
                any(),
                'http://example.com/auth/callback/MockAuthProvider',
            );
            expect(mockSessionStrategy.store).toHaveBeenCalledWith(any(), profile);
        });

        it('calls onLogin hook', async () => {
            const profile = {
                providerId: '123321',
                provider: 'myProvider',
                username: 'abc',
                name: 'Some One',
                email: 'test@example.com',
            };
            mockProvider.verify.mockResolvedValue(profile);
            mockRequestEvent.url = new URL('/auth/callback/MockAuthProvider', 'http://example.com');

            const mockHook = vi.fn();

            const handler = AuthHandler({
                providers: [mockProvider],
                sessionStrategy: mockSessionStrategy,
                hooks: { onLogin: mockHook },
            });

            await expect(handler(handlerInput)).rejects.toEqual({ location: '/', status: 302 });
            expect(mockHook).toHaveBeenCalledWith(any(), profile);
        });

        it('verifies callback and stores session when route prefix and callback prefix are changed', async () => {
            const profile = {
                providerId: '123321',
                provider: 'myProvider',
                username: 'abc',
                name: 'Some One',
                email: 'test@example.com',
            };
            mockProvider.verify.mockResolvedValue(profile);
            mockRequestEvent.url = new URL('/login/cb/MockAuthProvider', 'http://example.com');

            const handler = AuthHandler({
                providers: [mockProvider],
                sessionStrategy: mockSessionStrategy,
                routePrefix: '/login',
                callbackPrefix: '/cb',
            });

            await expect(handler(handlerInput)).rejects.toEqual({ location: '/', status: 302 });
            expect(mockProvider.verify).toHaveBeenCalledWith(
                any(),
                'http://example.com/login/cb/MockAuthProvider',
            );
            expect(mockSessionStrategy.store).toHaveBeenCalledWith(any(), profile);
        });
    });

    describe('redirect', () => {
        it('throws 400 if provider does not exist', async () => {
            mockRequestEvent.url = new URL('/auth/redirect/does-not-exist', 'http://example.com');

            const handler = AuthHandler({
                providers: [mockProvider],
                sessionStrategy: mockSessionStrategy,
            });

            await expect(handler(handlerInput)).rejects.toEqual({ data: undefined, status: 400 });
        });

        it('throws 400 if provider does exist but is not OAuthProvider', async () => {
            mockRequestEvent.url = new URL('/auth/redirect/MockAuthProvider', 'http://example.com');

            const handler = AuthHandler({
                providers: [mockProvider],
                sessionStrategy: mockSessionStrategy,
            });

            await expect(handler(handlerInput)).rejects.toEqual({ data: undefined, status: 400 });
        });

        it('throws redirect if provider does exist and is OAuthProvider', async () => {
            const oauthMockProvider = mock<OAuthProvider<AuthProviderConfig, Profile>>();
            oauthMockProvider.name = 'MockAuthProvider';
            oauthMockProvider.redirectToProvider.mockResolvedValue(
                redirect(307, 'http://example.com/somepath'),
            );

            mockRequestEvent.url = new URL('/auth/redirect/MockAuthProvider', 'http://example.com');

            const handler = AuthHandler({
                providers: [oauthMockProvider],
                sessionStrategy: mockSessionStrategy,
            });

            await expect(handler(handlerInput)).rejects.toEqual({
                location: 'http://example.com/somepath',
                status: 307,
            });
        });

        it('throws redirect if provider does exist and is OAuthProvider when route prefix and callback prefix are changed', async () => {
            const oauthMockProvider = mock<OAuthProvider<AuthProviderConfig, Profile>>();
            oauthMockProvider.name = 'MockAuthProvider';
            oauthMockProvider.redirectToProvider.mockResolvedValue(
                redirect(307, 'http://example.com/somepath'),
            );

            mockRequestEvent.url = new URL('/login/oauth/MockAuthProvider', 'http://example.com');

            const handler = AuthHandler({
                providers: [oauthMockProvider],
                sessionStrategy: mockSessionStrategy,
                routePrefix: '/login',
                redirectPrefix: '/oauth',
            });

            await expect(handler(handlerInput)).rejects.toEqual({
                location: 'http://example.com/somepath',
                status: 307,
            });
        });
    });
});
