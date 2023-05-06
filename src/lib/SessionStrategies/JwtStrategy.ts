import type { RequestEvent } from '@sveltejs/kit';
import * as jose from 'jose';

import type { Profile } from '../Profile.js';
import { SessionStrategy, type Session, type SessionStrategyConfig } from './SessionStrategy.js';

export interface JwtStrategyConfig extends SessionStrategyConfig {
    authKey: string;
    issuer: string;
}

export class JwtStrategy extends SessionStrategy<JwtStrategyConfig> {
    async store(event: RequestEvent, profile: Profile) {
        const { providerId, provider, username, name, email } = profile;

        const token = await new jose.SignJWT({ providerId, provider, username, name, email })
            .setProtectedHeader({ alg: 'HS256' })
            .setSubject(`${provider}_${providerId}`)
            .setIssuer(this.config.issuer)
            .setExpirationTime('1d')
            .sign(this.getKey());

        event.cookies.set('jwt', token, { path: '/', httpOnly: true });
    }

    async getSession(event: RequestEvent) {
        const jwtToken = event.cookies.get('jwt');

        if (!jwtToken) {
            return;
        }

        try {
            const verified = await jose.jwtVerify(jwtToken, this.getKey(), {
                issuer: this.config.issuer,
                algorithms: ['HS256'],
                requiredClaims: [
                    'providerId',
                    'provider',
                    'username',
                    'name',
                    'email',
                    'sub',
                    'iss',
                    'exp',
                ],
            });

            return verified.payload as unknown as Session;
        } catch (e) {
            return;
        }
    }

    async destroySession(event: RequestEvent): Promise<void> {
        event.cookies.delete('jwt', { path: '/', httpOnly: true });
    }

    getKey() {
        return Buffer.from(this.config.authKey, 'hex');
    }
}
