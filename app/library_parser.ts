import { fuzzy } from "fast-fuzzy";
import fs from "fs";

/**
 * Identifies the product of a library
 * @param library - The library to identify the product of
 * @returns The name of the product for the library
 */
export function identifyProduct(library: string): string {
    const clean_library = library.replace(".com", "").replace(".org", "").replace("docs", "").replace(".", "-").replace("/", "-").replace("_", "-").toLowerCase();
    const prod_split = clean_library.split("/");
    const final_product = prod_split[prod_split.length - 1];
    return final_product;
}

/**
 * Determines if a product has an existing questions file
 * @param new_product - The product to identify the file for
 * @returns The name of the file if a match is found, null otherwise
 */
export function identifyProductFile(new_product: string): string | null {
    const folder_name = `${__dirname}/../benchmark-questions/`;
    fs.readdirSync(folder_name).forEach(file => {
        const prod_split = file.split("/");
        const file_name = prod_split[prod_split.length - 1].split(".")[0];
        console.log(file, file_name);

        const score = fuzzy(new_product, file_name);
        if (score > 0.8) {
            console.log("Match found for", new_product, file);
            return file;
        }
    });
    console.log("No match found for", new_product);
    return null;


}

