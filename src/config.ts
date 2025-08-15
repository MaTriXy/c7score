/**
 * Default configuration options for the score evaluation
 */
export const defaultConfigOptions = {
    report: {
        console: true,
        humanReadable: false,
        returnScore: false,
    },
    weights: {
        question: 0.8,
        llm: 0.05,
        formatting: 0.05,
        metadata: 0.025,
        initialization: 0.025,
    },
    llm: {
        temperature: 1.0,
        topP: 0.95,
        topK: 64
    }
}

