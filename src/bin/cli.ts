#!/usr/bin/env node
import { program } from 'commander';
import { getScore } from '../app/getScore.js';
import { compareLibraries } from '../app/compareLib.js';
    
program
    .command('getscore')
    .argument("<library>", "Library name")
    .option("-c, --config [json]", "Optional configs")
    .action(async (library: string, options: { config: string }) => {
    console.log(`Working on ${library}...`);
    try {
        if (options.config) {
            const configOptions = JSON.parse(options.config);
            await getScore(library, configOptions);
        } else {
            await getScore(library);
        }
    } catch (error) {
    console.error(`Error in ${library}: ${error}`);
    }
    });

program
    .command('comparelibraries')
    .argument("<library1>", "First library name")
    .argument("<library2>", "Second library name")
    .option("-c, --config [json]", "Optional configs")
    .action(async (library1: string, library2: string, options: { config: string }) => {
    console.log(`Working on ${library1} vs ${library2}...`);
    try {
        if (options.config) {
            const configOptions = JSON.parse(options.config);
            await compareLibraries(library1, library2, configOptions);
        } else {
            await compareLibraries(library1, library2);
        }
    } catch (error) {
        console.error(`Error in ${library1} vs ${library2}: ${error}.`);
    }
    });

program.parse(process.argv);
