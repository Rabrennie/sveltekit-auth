import type { SessionStrategy, SessionStrategyConfig } from './SessionStrategies/index.js';

export interface AuthClient {
    getSession: () => ReturnType<SessionStrategy<SessionStrategyConfig>['getSession']>;
}

export * from './AuthHandler/AuthHandler.js';
