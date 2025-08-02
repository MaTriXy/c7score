import { fuzzy } from "fast-fuzzy";
import fs from "fs";

/**
 * Identifies the product of a library
 * @param library - The library to identify the product of
 * @returns The name of the product for the library
 */
export function identifyProduct(library: string): string {
    const cleanLibrary = library.replace(".com", "").replace(".org", "").replace("docs", "").replace(".", "-").replace("/", "-").replace("_", "-").toLowerCase();
    const prodSplit = cleanLibrary.split("/");
    const finalProduct = prodSplit[prodSplit.length - 1];
    return finalProduct;
}

/**
 * Determines if a product has an existing questions file
 * @param newProduct - The product to identify the file for
 * @returns The name of the file if a match is found, null otherwise
 */
export function identifyProductFile(newProduct: string): string | null {
    const folderName = `${__dirname}/../benchmark-questions/`;
    fs.readdirSync(folderName).forEach(file => {
        const prodSplit = file.split("/");
        const fileName = prodSplit[prodSplit.length - 1].split(".")[0];
        console.log(file, fileName);

        const score = fuzzy(newProduct, fileName);
        if (score > 0.8) {
            return file;
        }
    });
    return null;


}

