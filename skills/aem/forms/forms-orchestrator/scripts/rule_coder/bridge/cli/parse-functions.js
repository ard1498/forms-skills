#!/usr/bin/env node
/**
 * Parse custom function scripts to extract function metadata
 *
 * Usage:
 *   node parse-functions.js <function-script.js>
 *   node parse-functions.js --stdin (read from stdin)
 *
 * Output:
 *   JSON object with parsed function metadata and static imports
 *   {
 *     success: boolean,
 *     customFunction: [...],  // Array of function definitions
 *     imports: [...]          // Array of import paths (for EDS forms)
 *   }
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Load globals first
require('../setup/globals');

// Load the custom function parser
require('../setup/loader').loadCustomFunctionParser();

/**
 * Parse a custom function script
 * @param {string} scriptContent - The JavaScript source code
 * @returns {object} Parsed result with customFunction array and imports
 */
function parseCustomFunctionScript(scriptContent) {
    if (!expeditor.rb.customFunctionParser) {
        throw new Error('Custom function parser not loaded. Check that the JS file exists.');
    }

    const parser = expeditor.rb.customFunctionParser;

    // Parse the script to extract function definitions
    const parsed = parser.parse(scriptContent);

    // Extract static imports for EDS forms
    let imports = [];
    if (typeof parser.extractStaticImports === 'function') {
        imports = parser.extractStaticImports(scriptContent) || [];
    }

    return {
        customFunction: parsed.customFunction || [],
        imports: imports
    };
}

/**
 * Main function
 */
function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error('Usage: node parse-functions.js <function-script.js>');
        console.error('       node parse-functions.js --stdin');
        process.exit(1);
    }

    let scriptContent;

    if (args[0] === '--stdin') {
        // Read from stdin
        scriptContent = fs.readFileSync(0, 'utf-8');
    } else {
        // Read from file
        const filePath = path.resolve(args[0]);
        if (!fs.existsSync(filePath)) {
            console.error(JSON.stringify({
                success: false,
                error: 'File not found: ' + filePath
            }));
            process.exit(1);
        }

        try {
            scriptContent = fs.readFileSync(filePath, 'utf-8');
        } catch (e) {
            console.error(JSON.stringify({
                success: false,
                error: 'Error reading file: ' + e.message
            }));
            process.exit(1);
        }
    }

    // Parse the script
    try {
        const result = parseCustomFunctionScript(scriptContent);

        console.log(JSON.stringify({
            success: true,
            customFunction: result.customFunction,
            imports: result.imports
        }, null, 2));
    } catch (e) {
        console.error(JSON.stringify({
            success: false,
            error: 'Parse error: ' + e.message,
            stack: e.stack
        }));
        process.exit(1);
    }
}

main();
