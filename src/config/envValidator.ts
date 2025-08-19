import { config } from 'dotenv';
import { Env } from '../lib/types';

/**
 * Validates the environment variables
 * @returns The environment variables if they are all set, throws an error otherwise
 */
export function validateEnv(): Env {
    config();
    const envConfig = {
        GEMINI_API_TOKEN: process.env.GEMINI_API_TOKEN,
        CONTEXT7_API_TOKEN: process.env.CONTEXT7_API_TOKEN,
        GITHUB_API_TOKEN: process.env.GITHUB_API_TOKEN,
    };
    // Check that all environment variables are set
    for (const [api, token] of Object.entries(envConfig)) {
        if (!token) {
            throw new Error(`Missing environment variable: ${api}`);
        }
    }
    return envConfig as Env;
}