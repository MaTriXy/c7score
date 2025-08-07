import { getScore } from "../src/main";
import { GoogleGenAI } from "@google/genai";
import { config } from 'dotenv';

config();

const envConfig = {
  GEMINI_API_TOKEN: process.env.GEMINI_API_TOKEN,
  CONTEXT7_API_TOKEN: process.env.CONTEXT7_API_TOKEN,
};

const client = new GoogleGenAI({ apiKey: envConfig.GEMINI_API_TOKEN });

const headerConfig = {
  headers: {
    "Authorization": "Bearer " + envConfig.CONTEXT7_API_TOKEN
  }
}

async function main() {

    console.log("🧪 Running compare tester...")
    const libraries = [
        "/tailwindlabs/tailwindcss.com", 
        "/context7/tailwindcss",
      
    ]
    
    await getScore(libraries, { geminiToken: envConfig.GEMINI_API_TOKEN!, context7Token: envConfig.CONTEXT7_API_TOKEN });
}    

if (require.main === module) {
    main();
}