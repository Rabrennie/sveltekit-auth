import type { RequestEvent } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';

import type { Profile } from '../Profile.js';
import { SessionStrategy, type Session, type SessionStrategyConfig } from './SessionStrategy.js';

export interface JwtStrategyConfig extends SessionStrategyConfig {
    authKey: string;
}

export class JwtStrategy extends SessionStrategy<JwtStrategyConfig> {
    async store(event: RequestEvent, profile: Profile) {
        const { providerId, provider, username, name, email } = profile;
        const token = jwt.sign(
            { sub: `${provider}_${providerId}`, providerId, provider, username, name, email },
            this.config.authKey,
        );

        event.cookies.set('jwt', token, { path: '/', httpOnly: true });
    }

    async getSession(event: RequestEvent) {
        const jwtToken = event.cookies.get('jwt');

        if (jwtToken) {
            try {
                return jwt.verify(jwtToken, this.config.authKey) as Session;
            } catch {
                return;
            }
        }
    }
}
