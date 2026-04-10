#!/usr/bin/env node
/**
 * Generate human-readable summary from rule JSON using ToSummaryTransformer
 *
 * This CLI uses the ACTUAL ToSummaryTransformer from the rule editor
 * to ensure summaries match exactly what the UI would display.
 *
 * Usage:
 *   node summary.js <rule.json>
 *   node summary.js <rule.json> --context <context.json>
 *   node summary.js --stdin
 *
 * Options:
 *   --context <file>  Load FormContext for component validation and rich display names
 *
 * Output:
 *   {
 *     "success": true,
 *     "title": "firstName - is changed",
 *     "content": "WHEN firstName is changed THEN Show fullName",
 *     "eventName": "is changed",
 *     "field": "$form.firstName",
 *     "validationEnabled": true
 *   }
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Load globals and transformers
require('../setup/globals');
const loader = require('../setup/loader');
loader.loadForRuleTransform();

// Load ContextLoader directly (not via vm)
const ContextLoader = require('../setup/ContextLoader');

// Trigger event value to event name mapping
const TRIGGER_EVENT_TO_NAME = {
    "is clicked": "Click",
    "is changed": "Value Commit",
    "is initialised": "Initialize",
    "is initialized": "Initialize"
};

/**
 * Extract trigger field and event from rule JSON
 */
function extractTriggerInfo(ruleJson) {
    if (!ruleJson || ruleJson.nodeName !== 'ROOT') {
        throw new Error('Invalid rule JSON');
    }

    const statement = ruleJson.items[0];
    if (!statement.choice || statement.choice.nodeName !== 'TRIGGER_SCRIPTS') {
        throw new Error('Only TRIGGER_SCRIPTS rules are supported');
    }

    const singleTriggerScripts = statement.choice.items[0];
    const items = singleTriggerScripts.items;
    const triggerComponent = items[0];
    const triggerEvent = items[1];

    const fieldValue = triggerComponent?.value;
    const fieldId = fieldValue?.id || fieldValue?.name || '$field';
    const fieldName = fieldValue?.name || fieldId.split('.').pop();

    const eventValue = triggerEvent?.value || 'is changed';
    const eventName = TRIGGER_EVENT_TO_NAME[eventValue] || eventValue;

    return { fieldId, fieldName, eventName, eventValue };
}

/**
 * Generate summary using actual ToSummaryTransformer
 *
 * @param {Object} ruleJson - Rule JSON to summarize
 * @param {Object} contextData - Optional FormContext data (treeJson + functions)
 */
function generateSummary(ruleJson, contextData) {
    const { fieldId, fieldName, eventName, eventValue } = extractTriggerInfo(ruleJson);

    // Create SimpleContext for model creation
    let ctx;
    let validationEnabled = false;

    if (contextData && contextData.treeJson) {
        // Use validated context with real component data
        ctx = ContextLoader.createValidatedContext(contextData.treeJson, contextData.functions);
        validationEnabled = true;
    } else {
        // Use synthetic context (default)
        ctx = new expeditor.SimpleContext();
    }

    // Set the currentFieldId for the context (used by transformer)
    ctx.currentFieldId = fieldId;

    // Create model hierarchy from rule JSON
    const model = expeditor.Utils.ModelFactory.fromJson(ruleJson, ctx);

    // Create ToSummaryTransformer
    // Use guidelib.author.ToSummaryTransformer which handles TRIGGER_SCRIPTS
    const transformer = new guidelib.author.ToSummaryTransformer(ctx);

    // Set to plain text mode (no HTML tags)
    transformer.setMode(transformer.PLAIN_TEXT_MODE);

    // Transform via visitor pattern
    model.accept(transformer);

    // Get result
    const result = transformer.getScript();

    return {
        success: true,
        title: result.title || `${fieldName} - ${eventValue}`,
        tooltipTitle: result.tooltipTitle,
        content: result.content,
        eventName: result.eventName || eventName,
        field: fieldId,
        isValid: result.isvalid !== false,
        enabled: result.enabled !== false,
        validationEnabled: validationEnabled,
        isBroken: result.isBroken || false
    };
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
    const result = {
        ruleFile: null,
        contextFile: null,
        useStdin: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--stdin') {
            result.useStdin = true;
        } else if (arg === '--context' && args[i + 1]) {
            result.contextFile = args[++i];
        } else if (!arg.startsWith('--') && !result.ruleFile) {
            result.ruleFile = arg;
        }
    }

    return result;
}

/**
 * Main CLI entry point
 */
function main() {
    const args = process.argv.slice(2);
    const parsedArgs = parseArgs(args);

    let ruleJson;
    let contextData = null;

    try {
        // Load rule JSON
        if (parsedArgs.useStdin) {
            const input = fs.readFileSync(0, 'utf-8');
            ruleJson = JSON.parse(input);
        } else if (parsedArgs.ruleFile) {
            if (!fs.existsSync(parsedArgs.ruleFile)) {
                throw new Error(`File not found: ${parsedArgs.ruleFile}`);
            }
            const content = fs.readFileSync(parsedArgs.ruleFile, 'utf-8');
            ruleJson = JSON.parse(content);
        } else {
            console.error('Usage: node summary.js <rule.json> [--context <context.json>]');
            console.error('       node summary.js --stdin [--context <context.json>]');
            process.exit(1);
        }

        // Load context if provided
        if (parsedArgs.contextFile) {
            contextData = ContextLoader.loadFromFile(parsedArgs.contextFile);
        }

        const result = generateSummary(ruleJson, contextData);
        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        console.log(JSON.stringify({
            success: false,
            error: error.message,
            stack: process.env.DEBUG === 'true' ? error.stack : undefined
        }, null, 2));
        process.exit(1);
    }
}

main();
