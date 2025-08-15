import axios, { AxiosError } from 'axios';

/**
 * Checks if the library has any redirects
 * @param library - The library to check
 * @returns The redirected library if it exists, otherwise the original library
 */
export async function checkRedirects(library: string, headerConfig: object): Promise<string> {
    try {
        const context7Libraries = `https://context7.com/api/v1/${library}?tokens=10000`;
        await axios.get(context7Libraries, headerConfig);
        return library;
    } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 404) {
            const redirectKeyword = `Library ${library} has been redirected to this library: `
            const errorMessage = error.response.data;
            if (errorMessage.includes(redirectKeyword)) {
                const newLibrary = errorMessage.split(redirectKeyword)[1].split(".").slice(0, -1).join(".").trim();
                return newLibrary;
            }
        }
        throw error
    }
}

/**
 * Scrapes snippets from the Context7 API
 * @param library - The library to scrape snippets from
 * @param headerConfig - The header config to use for the Context7 API
 * @returns The scraped snippets
 */
export async function scrapeContext7Snippets(library: string, headerConfig: object): Promise<string> {
    const context7Url = `https://context7.com/api/v1/${library}?tokens=10000`
    const response = await axios.get(context7Url, headerConfig);
    const snippet_title = "=".repeat(24) + "\nCODE SNIPPETS\n" + "=".repeat(24);
    const snippets = String(response.data).replace(snippet_title, "");
    return snippets;
}
