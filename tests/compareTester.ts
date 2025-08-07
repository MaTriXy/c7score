import { compareLibraries } from "../src/compareLib";
import { config } from 'dotenv';

config();

const envConfig = {
  GEMINI_API_TOKEN: process.env.GEMINI_API_TOKEN,
  CONTEXT7_API_TOKEN: process.env.CONTEXT7_API_TOKEN,
};

async function main() {

    console.log("🧪 Running compare tester...")
    const libraries = [
        "/tailwindlabs/tailwindcss.com", 
        "/context7/tailwindcss",
    ]
    
    await compareLibraries(libraries[0], libraries[1], { 
        geminiToken: envConfig.GEMINI_API_TOKEN!,
        context7Token: envConfig.CONTEXT7_API_TOKEN,
        report: {
            console: true,
            folderPath: `${__dirname}/../compare-results`
        }
     });
}    

if (require.main === module) {
    main();
}