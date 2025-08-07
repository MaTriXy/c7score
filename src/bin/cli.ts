#!/usr/bin/env node
import { program } from 'commander';
import { getScore } from '../main';
import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';
config();

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_TOKEN });

const headerConfig = {
  headers: {
    "Authorization": "Bearer " + process.env.CONTEXT7_API_TOKEN
  }
}

const buildList = (item: string, list: string[]) => [...(list ?? []), ...item.split(', ')];
program
    .command('worker')
    .option('--l, --library <items>', 'Library names', buildList, [])
    .action(async (options: { library: string[] }) => {
    const libraries = options.library;
    if (libraries.length < 1) {
        throw new Error("Please provide at least one library name")
    }

    for (const library of libraries) {
        console.log(`Working on ${library}...`)
        try {
        const libraryList = [library];
        await getScore(libraryList, client, headerConfig);
        } catch (error) {
        console.error(`Error in ${library}: ${error}`);
        }
    }
    });

program
    .command('compare')
    .option('--l, --library <items>', 'Library names', buildList, [])
    .action(async (options: { library: string[] }) => {
    console.log("Comparing...")
    const libraries = options.library;
    if (libraries.length !== 2) {
        throw new Error("Please provide exactly 2 library names")
    }
    const [library1, library2] = libraries;
    console.log(`Working on ${library1} vs ${library2}...`);
    try {
        const libraryList = [library1, library2];
        await getScore(libraryList, client, headerConfig);
    } catch (error) {
        console.error(`Error in ${library1} vs ${library2}: ${error}.`);
    }
    });

program.parse(process.argv);
