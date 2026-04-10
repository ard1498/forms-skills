#!/usr/bin/env node
/**
 * Generate JSON Formula from rule JSON using AFJSONFormulaTransformer
 *
 * This CLI transforms a rule JSON into executable JSON Formula format
 * using Adobe's actual AFJSONFormulaTransformer with visitor pattern.
 * This ensures identical output to the rule editor.
 *
 * Usage:
 *   node generate-formula.js <rule.json>
 *   node generate-formula.js <rule.json> --context <context.json>
 *   node generate-formula.js --stdin
 *
 * Options:
 *   --context <file>  Load FormContext for component validation
 *
 * Output:
 *   {
 *     "success": true,
 *     "field": "$form.firstName",
 *     "event": "Value Commit",
 *     "formula": "if(...)",
 *     "fdProperty": "change",
 *     "validationEnabled": true
 *   }
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Load globals and transformers
require('../setup/globals');
require('../setup/loader').loadForRuleTransform();

// Load ContextLoader directly (not via vm)
const ContextLoader = require('../setup/ContextLoader');

// Event name to fd:events property mapping
const EVENT_TO_FD_PROPERTY = {
    "Value Commit": "change",
    "Click": "click",
    "Initialize": "initialize",
    "Calculate": "calc",
    "Visibility": "visible",
    "Enabled": "enabled",
    "Validate": "validate"
};

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
        throw new Error('Invalid rule: must have ROOT node');
    }

    if (!ruleJson.items || ruleJson.items.length === 0) {
        throw new Error('Invalid rule: ROOT must have items');
    }

    const statement = ruleJson.items[0];
    if (!statement.choice || statement.choice.nodeName !== 'TRIGGER_SCRIPTS') {
        throw new Error('Only TRIGGER_SCRIPTS rules are supported');
    }

    const singleTriggerScripts = statement.choice.items[0];
    if (!singleTriggerScripts || !singleTriggerScripts.items) {
        throw new Error('Invalid TRIGGER_SCRIPTS structure');
    }

    const items = singleTriggerScripts.items;
    const triggerComponent = items[0];
    const triggerEvent = items[1];

    // Get field ID
    const fieldValue = triggerComponent?.value;
    const fieldId = fieldValue?.id || fieldValue?.name || '$field';

    // Get event name
    const eventValue = triggerEvent?.value || 'is changed';
    const eventName = TRIGGER_EVENT_TO_NAME[eventValue] || eventValue;

    return { fieldId, eventName, eventValue };
}

/**
 * Generate JSON Formula from rule JSON using AFJSONFormulaTransformer
 *
 * @param {Object} ruleJson - Rule JSON to transform
 * @param {Object} contextData - Optional FormContext data (treeJson + functions)
 */
function generateFormula(ruleJson, contextData) {
    // Extract trigger info first
    const { fieldId, eventName, eventValue } = extractTriggerInfo(ruleJson);

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

    // Create model hierarchy from rule JSON
    let model;
    try {
        model = expeditor.Utils.ModelFactory.fromJson(ruleJson, ctx);
    } catch (e) {
        throw new Error(`Failed to create model from JSON: ${e.message}`);
    }

    // Create AFJSONFormulaTransformer
    if (!guidelib.author.AFJSONFormulaTransformer) {
        throw new Error('AFJSONFormulaTransformer not loaded');
    }

    const transformer = new guidelib.author.AFJSONFormulaTransformer();

    // Set event context - this is required for the transformer to work correctly
    transformer.setEvent({
        field: fieldId,
        name: eventName,
        model: null,
        otherEvents: null
    });

    // Transform via visitor pattern
    try {
        model.accept(transformer);
    } catch (e) {
        throw new Error(`Transform failed: ${e.message}`);
    }

    // Get result
    const result = transformer.getScript();

    // Determine fd:events property name
    const fdProperty = EVENT_TO_FD_PROPERTY[eventName] || 'change';

    // Format formula - result.content can be string or array
    let formula;
    if (Array.isArray(result.content)) {
        formula = result.content.length === 1 ? result.content[0] : result.content;
    } else {
        formula = result.content;
    }

    return {
        success: true,
        field: fieldId,
        event: eventName,
        eventProperty: `fd:events.${fdProperty}`,
        fdProperty: fdProperty,
        formula: formula,
        validationEnabled: validationEnabled,
        // Include raw result for debugging
        _raw: {
            field: result.field,
            event: result.event,
            model: result.model,
            content: result.content
        }
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
            console.error('Usage: node generate-formula.js <rule.json> [--context <context.json>]');
            console.error('       node generate-formula.js --stdin [--context <context.json>]');
            process.exit(1);
        }

        // Load context if provided
        if (parsedArgs.contextFile) {
            contextData = ContextLoader.loadFromFile(parsedArgs.contextFile);
        }

        const result = generateFormula(ruleJson, contextData);
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
