#!/usr/bin/env node
/**
 * Merge rules by field and event
 *
 * This CLI merges multiple rules, grouping them by field and event type.
 * Rules for the same field/event are combined appropriately.
 *
 * Usage:
 *   node merge.js <rules.json>
 *   node merge.js --stdin
 *
 * Input format (array of transformed rules):
 *   [
 *     { "field": "$form.field1", "event": "Click", "actions": [...] },
 *     { "field": "$form.field1", "event": "Click", "actions": [...] },
 *     { "field": "$form.field2", "event": "Value Commit", "actions": [...] }
 *   ]
 *
 * Output:
 *   {
 *     "success": true,
 *     "merged": {
 *       "$form.field1": {
 *         "Click": { "rules": [...], "count": 2 }
 *       },
 *       "$form.field2": {
 *         "Value Commit": { "rules": [...], "count": 1 }
 *       }
 *     },
 *     "summary": {
 *       "totalRules": 3,
 *       "totalFields": 2,
 *       "totalEvents": 2
 *     }
 *   }
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Load globals
require('../setup/globals');

// Events that can have multiple rules merged
const MERGEABLE_EVENTS = [
    "Value Commit",
    "Click",
    "Initialize"
];

// Event property mapping for fd:* properties
const EVENT_PROPERTY_MAPPING = {
    "Calculate": "fd:calc",
    "Visibility": "fd:visible",
    "Initialize": "fd:init",
    "Click": "fd:click",
    "Value Commit": "fd:valueCommit",
    "Enabled": "fd:enabled",
    "Validate": "fd:validate"
};

/**
 * Check if an event can have multiple rules
 */
function isEventMergeable(eventName) {
    return MERGEABLE_EVENTS.includes(eventName) ||
           (eventName && eventName.startsWith('custom:'));
}

/**
 * Merge an array of rules by field and event
 */
function mergeRules(rules) {
    if (!Array.isArray(rules)) {
        throw new Error('Input must be an array of rules');
    }

    const merged = {};
    let totalRules = 0;
    const fieldsSet = new Set();
    const eventsSet = new Set();

    rules.forEach((rule, index) => {
        if (!rule.field) {
            console.error(`Warning: Rule at index ${index} has no field`);
            return;
        }

        const field = rule.field;
        const event = rule.event || "Value Commit";

        fieldsSet.add(field);
        eventsSet.add(event);

        // Initialize field entry
        if (!merged[field]) {
            merged[field] = {};
        }

        // Initialize event entry
        if (!merged[field][event]) {
            merged[field][event] = {
                rules: [],
                count: 0,
                eventProperty: EVENT_PROPERTY_MAPPING[event] || event,
                isMergeable: isEventMergeable(event)
            };
        }

        // Add rule
        merged[field][event].rules.push({
            index: totalRules,
            actions: rule.actions || [],
            elseActions: rule.elseActions || [],
            hasCondition: rule.hasCondition || false,
            hasElse: rule.hasElse || false,
            isValid: rule.isValid !== false,
            enabled: rule.enabled !== false,
            description: rule.description || ""
        });
        merged[field][event].count++;
        totalRules++;
    });

    return {
        success: true,
        merged: merged,
        summary: {
            totalRules: totalRules,
            totalFields: fieldsSet.size,
            totalEvents: eventsSet.size,
            fields: Array.from(fieldsSet),
            events: Array.from(eventsSet)
        }
    };
}

/**
 * Merge rules from raw rule JSON array
 * This transforms each rule first, then merges
 */
function mergeRawRules(rawRules) {
    if (!Array.isArray(rawRules)) {
        throw new Error('Input must be an array of rule JSONs');
    }

    // Import transform function
    const transformedRules = rawRules.map((ruleJson, index) => {
        try {
            return transformRuleForMerge(ruleJson);
        } catch (e) {
            console.error(`Warning: Could not transform rule at index ${index}: ${e.message}`);
            return null;
        }
    }).filter(r => r !== null);

    return mergeRules(transformedRules);
}

/**
 * Simple transform for merge (extracts field/event info)
 */
function transformRuleForMerge(ruleJson) {
    if (!ruleJson || ruleJson.nodeName !== 'ROOT') {
        throw new Error('Invalid rule: must have ROOT node');
    }

    const statement = ruleJson.items?.[0];
    if (!statement?.choice || statement.choice.nodeName !== 'TRIGGER_SCRIPTS') {
        throw new Error('Only TRIGGER_SCRIPTS rules supported');
    }

    const singleTriggerScripts = statement.choice.items?.[0];
    if (!singleTriggerScripts?.items || singleTriggerScripts.items.length < 4) {
        throw new Error('Invalid TRIGGER_SCRIPTS structure');
    }

    const componentNode = singleTriggerScripts.items[0];
    const triggerEventNode = singleTriggerScripts.items[1];
    const triggerEventScripts = singleTriggerScripts.items[3];

    // Extract field ID
    const field = componentNode?.value?.id || null;

    // Extract event name
    const eventValue = triggerEventNode?.value || "is changed";
    const eventMap = {
        "is clicked": "Click",
        "is changed": "Value Commit",
        "is initialized": "Initialize",
        "is initialised": "Initialize"
    };
    const event = eventMap[eventValue] || (eventValue.startsWith('custom:') ? eventValue : `custom:${eventValue}`);

    // Extract actions
    const items = triggerEventScripts?.items || [];
    const conditionNode = items.find(item => item.nodeName === 'CONDITION');
    const hasCondition = conditionNode?.choice !== null && conditionNode?.choice !== undefined;

    const thenIndex = items.findIndex(item => item.nodeName === 'Then');
    const actions = [];
    if (thenIndex !== -1 && items[thenIndex + 1]?.items) {
        items[thenIndex + 1].items.forEach(item => {
            if (item.nodeName === 'BLOCK_STATEMENT' && item.choice) {
                actions.push(item.choice.nodeName);
            }
        });
    }

    const elseIndex = items.findIndex(item => item.nodeName === 'Else');
    const elseActions = [];
    const hasElse = elseIndex !== -1;
    if (hasElse && items[elseIndex + 1]?.items) {
        items[elseIndex + 1].items.forEach(item => {
            if (item.nodeName === 'BLOCK_STATEMENT' && item.choice) {
                elseActions.push(item.choice.nodeName);
            }
        });
    }

    return {
        field,
        event,
        actions,
        elseActions,
        hasCondition,
        hasElse,
        isValid: ruleJson.isValid !== false,
        enabled: ruleJson.enabled !== false,
        description: ruleJson.description || ""
    };
}

/**
 * Main CLI entry point
 */
function main() {
    const args = process.argv.slice(2);
    let input;

    try {
        if (args.includes('--stdin')) {
            input = JSON.parse(fs.readFileSync(0, 'utf-8'));
        } else if (args.length > 0 && !args[0].startsWith('--')) {
            const filePath = args[0];
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            input = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } else {
            console.error('Usage: node merge.js <rules.json> or node merge.js --stdin');
            process.exit(1);
        }

        // Check if input is raw rules or transformed rules
        let result;
        if (Array.isArray(input) && input.length > 0) {
            if (input[0].nodeName === 'ROOT') {
                // Raw rule JSONs - need to transform first
                result = mergeRawRules(input);
            } else if (input[0].field) {
                // Already transformed rules
                result = mergeRules(input);
            } else {
                throw new Error('Invalid input format: expected array of rule JSONs or transformed rules');
            }
        } else {
            throw new Error('Input must be a non-empty array');
        }

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
