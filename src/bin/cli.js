#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const main_1 = require("../main");
const genai_1 = require("@google/genai");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const client = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_TOKEN });
const headerConfig = {
    headers: {
        "Authorization": "Bearer " + process.env.CONTEXT7_API_TOKEN
    }
};
const buildList = (item, list) => [...(list !== null && list !== void 0 ? list : []), ...item.split(', ')];
commander_1.program
    .command('worker')
    .option('--l, --library <items>', 'Library names', buildList, [])
    .action((options) => __awaiter(void 0, void 0, void 0, function* () {
    const libraries = options.library;
    if (libraries.length < 1) {
        throw new Error("Please provide at least one library name");
    }
    for (const library of libraries) {
        console.log(`Working on ${library}...`);
        try {
            const libraryList = [library];
            yield (0, main_1.getScore)(libraryList, client, headerConfig);
        }
        catch (error) {
            console.error(`Error in ${library}: ${error}`);
        }
    }
}));
commander_1.program
    .command('compare')
    .option('--l, --library <items>', 'Library names', buildList, [])
    .action((options) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Comparing...");
    const libraries = options.library;
    if (libraries.length !== 2) {
        throw new Error("Please provide exactly 2 library names");
    }
    const [library1, library2] = libraries;
    console.log(`Working on ${library1} vs ${library2}...`);
    try {
        const libraryList = [library1, library2];
        yield (0, main_1.getScore)(libraryList, client, headerConfig);
    }
    catch (error) {
        console.error(`Error in ${library1} vs ${library2}: ${error}.`);
    }
}));
commander_1.program.parse(process.argv);
