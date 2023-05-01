import type { SessionStrategy, SessionStrategyConfig } from './SessionStrategies/index.js';

export interface AuthPageData {
    loginPaths: Record<string, string>;
    logOutPath: string;
}

export interface AuthClient {
    getSession: () => ReturnType<SessionStrategy<SessionStrategyConfig>['getSession']>;
    getAuthPageData: () => Promise<AuthPageData>;
    loginRoute: string;
}
