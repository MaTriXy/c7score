import { GoogleGenAI } from '@google/genai';
import { backOff } from 'exponential-backoff';

/**
 * Runs the LLM on a prompt. This is for evaluating question and LLM metrics.
 * @param prompt - The prompt to run the LLM on
 * @param config - The config to use, which specifies formatting, tool calling, and model configuration.
 * @param client - The client to use for the LLM evaluation
 * @returns The response from the LLM
 */
export async function runLLM(prompt: string, config: Record<string, any>, client: GoogleGenAI): Promise<any> {
    const countTokensResponse = await client.models.countTokens({
        model: "gemini-2.5-pro",
        contents: prompt,
    });
    if (countTokensResponse.totalTokens !== undefined && countTokensResponse.totalTokens > 1048576) {
        console.error("Prompt is too long: ", countTokensResponse.totalTokens, " condensing prompt to 1048576 tokens");
        // 1 Gemini token = roughly 4 characters, using 3 to not go over limit
        prompt = prompt.slice(0, 1048576 * 3);
    }
    const generate = async (): Promise<any> => {
        const response = await client.models.generateContent({
            model: "gemini-2.5-pro",
            contents: [prompt],
            config: {
                ...config
            }
        });
        if (response.text === undefined) {
            throw new Error("Response is undefined");
        }
        return response.text;
    }
    try {
        const retryResponse = await backOff(() => generate(), {
            numOfAttempts: 5,
            delayFirstAttempt: true,
        });
        return retryResponse;
    } catch (error) {
        throw new Error("Error in LLM call (context or llm evaluation): " + error);
    }
}