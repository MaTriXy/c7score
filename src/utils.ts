import axios from 'axios';

export async function scrapeContext7Snippets(context7Url: string): Promise<string> {
    const response = await axios.get(context7Url);
    return response.data;
}