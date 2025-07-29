import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

config();

// Configuration
const PROJECT_NAME = "Tailwind CSS";
const CONTEXT_ID_1 = "/tailwindlabs/tailwindcss.com";
const CONTEXT_ID_2 = "/context7/tailwindcss";
const BASE_API_URL = "https://context7.com";

interface ComparisonResult {
  questionNumber: number;
  questionText: string;
  topicsSearched: string;
  context1Score: number;
  context2Score: number;
  scoreDifference: number;
  explanation: string;
  winner: "Context 1" | "Context 2";
}

// Initialize Anthropic client
function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
    return null;
  }
  return new Anthropic({ apiKey });
}

// Generate test questions using Claude
async function generateTestQuestions(
  anthropic: Anthropic,
  projectName: string
): Promise<string[]> {
  console.log(`🎯 Generating test questions for ${projectName}...`);

  const prompt = `Generate 15 questions, 10 of which should be common and practical questions that developers frequently ask when using ${projectName}. These should represent real-world use cases and coding challenges.

  Add 5 more questions that might not be very common but relevant to edge cases and less common use cases.

Format each question on a new line, numbered 1-15. Questions should be specific and actionable, the kind that a developer would ask an AI coding assistant.

Focus on diverse topics like:
- Component building (cards, navigation, forms, modals)
- Responsive design patterns
- Animation and transitions
- Dark mode implementation
- Custom styling and configuration
- Performance optimization
- Common UI patterns

Example format:
1. "Show me how to build a card component with shadow, hover effects, and truncated text in ${projectName}"
2. "How to create a responsive navigation bar with dropdown menus in ${projectName}"`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-20250514",
      max_tokens: 2000,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    });

    const content =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse questions from response
    const questions = content
      .split("\n")
      .filter((line) => /^\d+\./.test(line.trim()))
      .map((line) => line.replace(/^\d+\.\s*"?/, "").replace(/"?\s*$/, ""));

    return questions.slice(0, 15); // Ensure we have exactly 10
  } catch (error) {
    console.error("Error generating questions:", error);
    throw error;
  }
}

// Generate search topics for a question
async function generateSearchTopics(
  anthropic: Anthropic,
  question: string,
  projectName: string
): Promise<string> {
  const prompt = `For the following ${projectName} question, generate 4-5 relevant search topics as comma-separated keywords/phrases. These topics should help find the most relevant documentation and code examples.

Question: "${question}"

Return ONLY the comma-separated topics, nothing else. Be concise and specific.

Example output format: "card components, box shadow, hover effects, text truncation, transition utilities"`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-20250514",
      max_tokens: 8000,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    return response.content[0].type === "text"
      ? response.content[0].text.trim()
      : "";
  } catch (error) {
    console.error("Error generating topics:", error);
    throw error;
  }
}

// Fetch context from API with retry logic
async function fetchContext(
  contextId: string,
  topics: string,
  retries: number = 3
): Promise<string> {
  const encodedTopics = encodeURIComponent(topics);
  const url = `${BASE_API_URL}${contextId}/llms.txt?tokens=10000&topic=${encodedTopics}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          "User-Agent": "Context-Comparison-Script/1.0",
        },
      });
      return response.data;
    } catch (error) {
      console.warn(
        `  ⚠️  Attempt ${attempt}/${retries} failed for ${contextId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      if (attempt === retries) {
        throw error;
      }
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
  return "";
}

// Compare and score contexts using Claude
async function compareContexts(
  anthropic: Anthropic,
  question: string,
  context1: string,
  context2: string
): Promise<{
  score1: number;
  score2: number;
  explanation: string;
}> {
  const prompt = `You are evaluating two different documentation contexts for their quality and relevance in helping an AI coding assistant answer the following question:

Question: "${question}"

Context 1 (${CONTEXT_ID_1}):
${context1.substring(0, 8000)}

Context 2 (${CONTEXT_ID_2}):
${context2.substring(0, 8000)}

Evaluate and score each context from 0-100 based on:
1. Relevance to the specific question (40%)
2. Code example quality and completeness (25%)
3. Practical applicability (15%)
4. Coverage of requested features (15%)
5. Clarity and organization (5%)

Provide your response in this exact format:
SCORE_1: [number 0-100]
SCORE_2: [number 0-100]
EXPLANATION: [Exactly 3 sentences explaining the scoring decision. First sentence should state which context is better and why. Second sentence should highlight the most significant strength of the winning context. Third sentence should mention what the losing context lacks or could improve.]`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-20250514",
      max_tokens: 8000,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    const content =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse scores and explanation
    const score1Match = content.match(/SCORE_1:\s*(\d+)/);
    const score2Match = content.match(/SCORE_2:\s*(\d+)/);
    const explanationMatch = content.match(/EXPLANATION:\s*(.+)/s);

    return {
      score1: score1Match ? parseInt(score1Match[1]) : 0,
      score2: score2Match ? parseInt(score2Match[1]) : 0,
      explanation: explanationMatch
        ? explanationMatch[1].trim()
        : "No explanation provided",
    };
  } catch (error) {
    console.error("Error comparing contexts:", error);
    throw error;
  }
}

// Main execution function
async function main() {
  console.log("🚀 Starting Context Comparison Script");
  console.log(`📊 Comparing: ${CONTEXT_ID_1} vs ${CONTEXT_ID_2}\n`);

  // Check for API key
  const anthropic = getAnthropicClient();
  if (!anthropic) {
    process.exit(1);
  }

  const results: ComparisonResult[] = [];

  try {
    // Step 1: Generate test questions
    const questions = await generateTestQuestions(anthropic, PROJECT_NAME);
    console.log(`✅ Generated ${questions.length} test questions\n`);

    // Process each question
    for (let i = 0; i < questions.length; i++) {
      const questionNumber = i + 1;
      const questionText = questions[i];

      console.log(
        `📝 Processing question ${questionNumber}/${questions.length}...`
      );
      console.log(`   Question: "${questionText}"`);

      try {
        // Step 2: Generate search topics
        const topics = await generateSearchTopics(
          anthropic,
          questionText,
          PROJECT_NAME
        );
        console.log(`   Topics: ${topics}`);

        // Step 3: Fetch contexts
        console.log(`   Fetching contexts...`);
        const [context1, context2] = await Promise.all([
          fetchContext(CONTEXT_ID_1, topics),
          fetchContext(CONTEXT_ID_2, topics),
        ]);

        console.log(`   Context 1 size: ${context1.length} chars`);
        console.log(`   Context 2 size: ${context2.length} chars`);

        // Step 4: Compare and score
        console.log(`   Comparing contexts...`);
        const comparison = await compareContexts(
          anthropic,
          questionText,
          context1,
          context2
        );

        // Store result
        const result: ComparisonResult = {
          questionNumber,
          questionText,
          topicsSearched: topics,
          context1Score: comparison.score1,
          context2Score: comparison.score2,
          scoreDifference: comparison.score1 - comparison.score2,
          explanation: comparison.explanation,
          winner:
            comparison.score1 > comparison.score2 ? "Context 1" : "Context 2",
        };

        results.push(result);
        console.log(
          `   ✅ Winner: ${result.winner} (${comparison.score1} vs ${comparison.score2})`
        );
        console.log(`   📝 Explanation:`);
        const explanationSentences = comparison.explanation
          .split(". ")
          .filter((s) => s.trim());
        explanationSentences.forEach((sentence, idx) => {
          console.log(
            `      ${idx + 1}. ${sentence}${sentence.endsWith(".") ? "" : "."}`
          );
        });
        console.log();
      } catch (error) {
        console.error(
          `   ❌ Error processing question ${questionNumber}:`,
          error
        );
        // Add error result
        results.push({
          questionNumber,
          questionText,
          topicsSearched: "ERROR",
          context1Score: 0,
          context2Score: 0,
          scoreDifference: 0,
          explanation: `Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          winner: "Context 1",
        });
      }
    }

    // Generate CSV output
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputDir = join(process.cwd(), "context-test");

    // Create output directory if it doesn't exist
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const filename = join(
      outputDir,
      `context_comparison_results_${timestamp}.csv`
    );

    // Calculate summary statistics
    const validResults = results.filter((r) => r.topicsSearched !== "ERROR");
    const avgScore1 =
      validResults.reduce((sum, r) => sum + r.context1Score, 0) /
      validResults.length;
    const avgScore2 =
      validResults.reduce((sum, r) => sum + r.context2Score, 0) /
      validResults.length;
    const context1Wins = validResults.filter(
      (r) => r.winner === "Context 1"
    ).length;
    const context2Wins = validResults.filter(
      (r) => r.winner === "Context 2"
    ).length;

    // Create CSV content
    const csvHeader =
      "Question Number,Question Text,Topics Searched,Context 1 ID,Context 1 Score,Context 2 ID,Context 2 Score,Score Difference,Brief Explanation,Winner";
    const csvRows = results.map(
      (r) =>
        `${r.questionNumber},"${r.questionText.replace(
          /"/g,
          '""'
        )}","${r.topicsSearched.replace(/"/g, '""')}","${CONTEXT_ID_1}",${
          r.context1Score
        },"${CONTEXT_ID_2}",${r.context2Score},${
          r.scoreDifference
        },"${r.explanation.replace(/"/g, '""')}",${r.winner}`
    );

    // Add summary row
    const overallWinner = avgScore1 > avgScore2 ? "Context 1" : "Context 2";
    const summaryRow = `SUMMARY,"Average Scores","${CONTEXT_ID_1}: ${avgScore1.toFixed(
      1
    )} | ${CONTEXT_ID_2}: ${avgScore2.toFixed(
      1
    )}","${CONTEXT_ID_1}",${avgScore1.toFixed(
      1
    )},"${CONTEXT_ID_2}",${avgScore2.toFixed(1)},${(
      avgScore1 - avgScore2
    ).toFixed(
      1
    )},"Context 1 wins: ${context1Wins} | Context 2 wins: ${context2Wins}",${overallWinner}`;

    const csvContent = [csvHeader, ...csvRows, summaryRow].join("\n");

    // Write CSV file
    writeFileSync(filename, csvContent);

    // Print summary
    console.log("\n" + "=".repeat(80));
    console.log("📊 COMPARISON COMPLETE!");
    console.log("=".repeat(80));
    console.log(`\n📈 Summary Statistics:`);
    console.log(`   Context 1 (${CONTEXT_ID_1}):`);
    console.log(`   - Average Score: ${avgScore1.toFixed(1)}/100`);
    console.log(`   - Wins: ${context1Wins}/${validResults.length}`);
    console.log(`\n   Context 2 (${CONTEXT_ID_2}):`);
    console.log(`   - Average Score: ${avgScore2.toFixed(1)}/100`);
    console.log(`   - Wins: ${context2Wins}/${validResults.length}`);
    console.log(`\n🏆 Overall Winner: ${overallWinner}`);
    console.log(`\n💾 Results saved to: ${filename}`);
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
