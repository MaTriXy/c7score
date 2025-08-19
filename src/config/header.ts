import { HeaderConfig } from "../lib/types";

/**
 * Builds the header config for the Context7 API
 * @param context7ApiToken - The Context7 API token
 * @returns The header config
 */
export const buildContext7Header = (context7ApiToken: string): HeaderConfig | {} => {
    let headerConfig = {};
    headerConfig = {
        headers: {
            "Authorization": "Bearer " + context7ApiToken
        }
    }
    return headerConfig;
}
