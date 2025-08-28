import { fileURLToPath } from "url";
import { compareLibraries } from "../src/app/compareLib.ts";

async function main() {

    console.log("🧪 Running compare tester...")
    const libraries = [
        "tailwindlabs/tailwindcss.com",
        "websites/tailwindcss-com_vercel_app",
    ]

    await compareLibraries(libraries[0], libraries[1], {
        report: {
            console: true
        }
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    void main();
}