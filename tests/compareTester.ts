import { compareLibraries } from "../src/compareLib";

async function main() {

    console.log("🧪 Running compare tester...")
    const libraries = [
        "/tailwindlabs/tailwindcss.com", 
        "/context7/tailwindcss",
    ]
    
    await compareLibraries(libraries[0], libraries[1], {
        report: {
            console: true
        },
        llm: {
            temperature: 0.0,
            topP: 0.95,
            topK: 40
        }
     });
}    

if (require.main === module) {
    main();
}