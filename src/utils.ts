import axios from 'axios';

export async function scrapeContext7Snippets(context7Url: string): Promise<string> {
    const response = await axios.get(context7Url);
    const snippets = response.data;
    const snippetsString = String(snippets);
    if (snippetsString.split("redirected to this library: ").length > 1) {
        const getLibrary = snippetsString.split("redirected to this library: ")
        const newLibrary = getLibrary[getLibrary.length - 1].split(".", 1)[0];
        const newUrl = `https://context7.com${newLibrary}/llms.txt`;
        console.log("New URL:", newUrl);
        const newResponse = await axios.get(newUrl);
        const finalSnippets = String(newResponse.data);
        return finalSnippets;
    } else {
        const finalSnippets = snippetsString;
        return finalSnippets;
    }
}