import fs from "fs/promises";
import { defaultConfigOptions } from '../config/options';
import { evalOptions, FullResults } from '../lib/types';

/**
 * Writes the full results to a human-readable text file
 * @param library - The name of the library
 * @param fullResults - The full results to write
 * @param reportOptions - The options for the report, specifically the folder path and console output
 * @param compare - Whether the report is for a comparison or individual library
 */
export const humanReadableReport = async (
    library: string,
    fullResults: FullResults,
    reportOptions: evalOptions["report"] = defaultConfigOptions.report,
    compare: boolean = false): Promise<void> => {
    const toSave = [
        "== Average Score ==",
        fullResults.averageScore,
        "== Questions Score ==",
        fullResults.questionAverageScore,
        "== Questions Explanation ==",
        fullResults.questionExplanation,
        "== LLM Score ==",
        fullResults.llmAverageScore,
        "== LLM Explanation ==",
        fullResults.llmExplanation,
        "== Formatting Score ==",
        fullResults.formattingAvgScore,
        "== Project Metadata Score ==",
        fullResults.metadataAvgScore,
        "== Initialization Score ==",
        fullResults.initializationAvgScore,
    ]
    if (reportOptions.humanReadable) {
        const directory = reportOptions.folderPath;
        await fs.writeFile(`${directory}/result${compare ? "-compare" : ""}-${library.replace(/[/._]/g, "-").toLowerCase()}.txt`, toSave.join("\n\n"));
    }
    if (reportOptions.console) {
        console.log(toSave.join("\n\n"));
    }
}