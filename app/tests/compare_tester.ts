import { snippetEvaluationCompare } from "../main";
import { GoogleGenAI } from "@google/genai";
import { config } from 'dotenv';

config();

const envConfig = {
  GEMINI_API_TOKEN: process.env.GEMINI_API_TOKEN,
};

const client = new GoogleGenAI({ apiKey: envConfig.GEMINI_API_TOKEN });

async function main() {

    console.log("🧪 Running compare tester...")
    const libraries = [
        "/tailwindlabs/tailwindcss.com", 
        "/context7/tailwindcss",
      
    ]
    
    await snippetEvaluationCompare(libraries[0], libraries[1], client);
}    

if (require.main === module) {
    main();
}