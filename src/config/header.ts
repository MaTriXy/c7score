/**
 * Builds the header config for the Context7 API
 * @param context7ApiToken - The Context7 API token
 * @returns The header config
 */
export const buildContext7Header = (context7ApiToken: string | undefined): Record<string, any> => {
    let headerConfig = {};
    if (context7ApiToken) {
        headerConfig = {
            headers: {
                "Authorization": "Bearer " + context7ApiToken
            }
        }
        return headerConfig;
    } else {
        throw new Error("Context7 API token is not set");
    }
}
