#!/usr/bin/env node
/**
 * Extract metadata from rule JSON
 *
 * This CLI analyzes a rule JSON and extracts metadata about its structure.
 * Useful for validation, debugging, and understanding rule contents
 * without generating the actual formula.
 *
 * Usage:
 *   node rule-metadata.js <rule.json>
 *   node rule-metadata.js --stdin
 *
 * Output:
 *   {
 *     "success": true,
 *     "field": "$form.fieldName",
 *     "event": "Click",
 *     "eventProperty": "fd:click",
 *     "ruleType": "TRIGGER_SCRIPTS",
 *     "actions": ["SHOW_STATEMENT", "SET_VALUE_STATEMENT"],
 *     "hasCondition": true,
 *     "hasElse": false
 *   }
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Load globals and setup
require('../setup/globals');

// Event name to property mapping
const EVENT_PROPERTY_MAPPING = {
    "Calculate": "fd:calc",
    "Visibility": "fd:visible",
    "Initialize": "fd:init",
    "Click": "fd:click",
    "Value Commit": "fd:valueCommit",
    "Enabled": "fd:enabled",
    "Validate": "fd:validate"
};

// Trigger event to event name mapping
const TRIGGER_EVENT_TO_NAME = {
    "is clicked": "Click",
    "is changed": "Value Commit",
    "is initialized": "Initialize",
    "is initialised": "Initialize"
};

/**
 * Extract field ID from COMPONENT node
 */
function extractFieldId(componentNode) {
    if (!componentNode || !componentNode.value) {
        return null;
    }
    return componentNode.value.id || null;
}

/**
 * Extract event name from TRIGGER_EVENT node
 */
function extractEventName(triggerEventNode) {
    if (!triggerEventNode || !triggerEventNode.value) {
        return "Value Commit"; // default
    }

    const eventValue = triggerEventNode.value;

    // Check if it's a known standard event
    if (TRIGGER_EVENT_TO_NAME[eventValue]) {
        return TRIGGER_EVENT_TO_NAME[eventValue];
    }

    // Custom event - prefix with "custom:"
    if (typeof eventValue === 'string') {
        return eventValue.startsWith('custom:') ? eventValue : `custom:${eventValue}`;
    }

    return "Value Commit";
}

/**
 * Extract actions from BLOCK_STATEMENTS node
 */
function extractActions(blockStatementsNode) {
    if (!blockStatementsNode || !blockStatementsNode.items) {
        return [];
    }

    return blockStatementsNode.items
        .filter(item => item.nodeName === 'BLOCK_STATEMENT' && item.choice)
        .map(item => item.choice.nodeName);
}

/**
 * Check if condition has actual content (not empty/null)
 */
function hasCondition(conditionNode) {
    if (!conditionNode) {
        return false;
    }
    // Empty condition has choice: null
    return conditionNode.choice !== null && conditionNode.choice !== undefined;
}

/**
 * Transform rule JSON to execution info
 */
function transformRule(ruleJson) {
    // Validate root structure
    if (!ruleJson || ruleJson.nodeName !== 'ROOT') {
        throw new Error('Invalid rule: must have ROOT node');
    }

    if (!ruleJson.items || ruleJson.items.length === 0) {
        throw new Error('Invalid rule: ROOT must have items');
    }

    const statement = ruleJson.items[0];
    if (!statement || statement.nodeName !== 'STATEMENT') {
        throw new Error('Invalid rule: first item must be STATEMENT');
    }

    if (!statement.choice || statement.choice.nodeName !== 'TRIGGER_SCRIPTS') {
        throw new Error('Invalid rule: STATEMENT choice must be TRIGGER_SCRIPTS');
    }

    const triggerScripts = statement.choice;
    if (!triggerScripts.items || triggerScripts.items.length === 0) {
        throw new Error('Invalid rule: TRIGGER_SCRIPTS must have items');
    }

    const singleTriggerScripts = triggerScripts.items[0];
    if (!singleTriggerScripts || singleTriggerScripts.nodeName !== 'SINGLE_TRIGGER_SCRIPTS') {
        throw new Error('Invalid rule: expected SINGLE_TRIGGER_SCRIPTS');
    }

    if (!singleTriggerScripts.items || singleTriggerScripts.items.length < 4) {
        throw new Error('Invalid rule: SINGLE_TRIGGER_SCRIPTS must have at least 4 items');
    }

    // Extract components
    const componentNode = singleTriggerScripts.items[0];
    const triggerEventNode = singleTriggerScripts.items[1];
    const triggerEventScripts = singleTriggerScripts.items[3];

    if (!triggerEventScripts || triggerEventScripts.nodeName !== 'TRIGGER_EVENT_SCRIPTS') {
        throw new Error('Invalid rule: fourth item must be TRIGGER_EVENT_SCRIPTS');
    }

    // Extract field and event info
    const fieldId = extractFieldId(componentNode);
    const eventName = extractEventName(triggerEventNode);
    const eventProperty = EVENT_PROPERTY_MAPPING[eventName] || eventName;

    // Extract condition and actions from TRIGGER_EVENT_SCRIPTS
    const items = triggerEventScripts.items || [];

    // Items structure: [CONDITION, "Then", BLOCK_STATEMENTS, ("Else", BLOCK_STATEMENTS)?]
    const conditionNode = items.find(item => item.nodeName === 'CONDITION');
    const hasConditionValue = hasCondition(conditionNode);

    // Find BLOCK_STATEMENTS (then actions)
    const thenBlockIndex = items.findIndex(item => item.nodeName === 'Then');
    let thenActions = [];
    if (thenBlockIndex !== -1 && items[thenBlockIndex + 1]) {
        thenActions = extractActions(items[thenBlockIndex + 1]);
    }

    // Check for else block
    const elseIndex = items.findIndex(item => item.nodeName === 'Else');
    let elseActions = [];
    const hasElse = elseIndex !== -1;
    if (hasElse && items[elseIndex + 1]) {
        elseActions = extractActions(items[elseIndex + 1]);
    }

    return {
        success: true,
        field: fieldId,
        event: eventName,
        eventProperty: eventProperty,
        ruleType: "TRIGGER_SCRIPTS",
        isValid: ruleJson.isValid !== false,
        enabled: ruleJson.enabled !== false,
        hasCondition: hasConditionValue,
        hasElse: hasElse,
        actions: thenActions,
        elseActions: elseActions,
        description: ruleJson.description || ""
    };
}

/**
 * Main CLI entry point
 */
function main() {
    const args = process.argv.slice(2);
    let ruleJson;

    try {
        if (args.includes('--stdin')) {
            // Read from stdin
            const input = fs.readFileSync(0, 'utf-8');
            ruleJson = JSON.parse(input);
        } else if (args.length > 0 && !args[0].startsWith('--')) {
            // Read from file
            const filePath = args[0];
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            const content = fs.readFileSync(filePath, 'utf-8');
            ruleJson = JSON.parse(content);
        } else {
            console.error('Usage: node rule-metadata.js <rule.json> or node rule-metadata.js --stdin');
            process.exit(1);
        }

        const result = transformRule(ruleJson);
        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        console.log(JSON.stringify({
            success: false,
            error: error.message
        }, null, 2));
        process.exit(1);
    }
}

main();
