import type { AuthHandlerConfig } from './AuthHandler/AuthHandler.js';
import type { SessionStrategy, SessionStrategyConfig } from './SessionStrategies/index.js';

export type AuthPageData = Required<
    Omit<AuthHandlerConfig, 'providers' | 'sessionStrategy' | 'hooks'>
>;

export interface AuthClient {
    getSession: () => ReturnType<SessionStrategy<SessionStrategyConfig>['getSession']>;
    getAuthPageData: () => Promise<AuthPageData>;
    loginRoute: string;
}
