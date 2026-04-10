/**
 * Mock browser globals required by exp-editor and af-exp-editor JS files
 *
 * This file sets up the global namespace and mocks that allow the AEM Forms
 * JavaScript code to run in a Node.js environment.
 */

'use strict';

// Create global window object
global.window = global;
global.self = global;

// Mock document (minimal)
global.document = {
    createElement: () => ({}),
    createTextNode: () => ({}),
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    body: {}
};

// Known feature toggles - all enabled for full functionality
// Extracted from vendor JS files via: grep -r "Granite.Toggles.isEnabled\|FT_FORMS" vendor/
const ENABLED_FEATURE_TOGGLES = [
    // ExpressionEditorTree.js
    'FT_FORMS-14303',
    'FT_FORMS-16466',
    'FT_FORMS-17789',
    // ToSummaryTransformer.js
    'FT_FORMS-13519',
    // FunctionsConfigV2.js
    'FT_FORMS-13209',
    'FT_FORMS-19884',
    'FT_FORMS-20002',
    'FT_FORMS-20129',
    // RuntimeUtil.js
    'FT_FORMS-19582',
    // AFJSONFormulaTransformer.js
    'FT_FORMS-19810',  // RETRY_REQUEST_HANDLER_FT
    'FT_FORMS-17090',
    'FT_FORMS-21266',
    'FT_FORMS-21359',
    'FT_FORMS-13193',
    'FT_FORMS-21264',
    'FT_FORMS-19581',
    // Via guidelib.author.ConfigUpdater
    'FT_FORMS_11581',
    'FT_FORMS_11584',
    'FT_FORMS_9611',
    'FT_FORMS_15407',
];

// Track which toggles are checked (for debugging)
const checkedToggles = new Set();

// Mock Granite (AEM's client-side framework)
global.Granite = {
    Toggles: {
        isEnabled: (featureFlag) => {
            // Track checked toggles
            checkedToggles.add(featureFlag);
            // All feature flags return true for full functionality
            return true;
        },
        // Utility to see which toggles were checked
        getCheckedToggles: () => Array.from(checkedToggles),
        // List of known toggles
        KNOWN_TOGGLES: ENABLED_FEATURE_TOGGLES
    },
    I18n: {
        get: (key) => key,
        getVar: (key) => key  // Same as get, returns key as-is
    },
    HTTP: {
        handleError: () => {}
    }
};

// Create expeditor namespace (exp-editor base)
global.expeditor = {
    rb: {
        FeatureToggles: {
            isCommComposerChannel: () => false,  // Default to AF (not COMM_COMPOSER)
            isHighlightBrokenRulesInSummaryViewEnabled: () => false
        },
        customFunctionParser: null  // Will be set when parser is loaded
    },
    Utils: {},
    model: {},  // Model classes will be added here
    Class: null  // Will be set by jquery_oops.js
};

// Create af namespace (af-exp-editor)
global.af = {
    expeditor: {
        author: {
            ExpressionEditorTree: null  // Will be set when loaded
        }
    }
};

// Create guidelib namespace (AEM Forms)
global.guidelib = {
    author: {
        ConfigUpdater: {
            FT_FORMS_11581: 'FT_FORMS_11581',
            FT_FORMS_11584: 'FT_FORMS_11584',
            FT_FORMS_9611: 'FT_FORMS_9611',
            FT_FORMS_15407: 'FT_FORMS_15407'
        },
        FunctionsConfig_v2: null,  // Will be loaded from JSON
        AFJSONFormulaTransformer: null,
        ToSummaryTransformer: null,
        AFJSONFormulaMerger: null
    },
    // RuntimeUtil will be populated from RuntimeUtil.js, but we set defaults here
    RuntimeUtil: null  // Will be set by RuntimeUtil.js
};

// Pre-initialize RuntimeUtil with event mappings (will be overwritten by RuntimeUtil.js)
// This ensures these properties exist even if RuntimeUtil.js fails to load
global.guidelib.RuntimeUtil = {
    bindRefToAFNameMap: null,
    SCRIPT_INDENT: '  ',
    DEFAULT_EVENT: 'Value Commit',
    // Event name to trigger event mapping
    eventToEventName: {
        'is changed': 'Value Commit',
        'is clicked': 'Click',
        'is initialised': 'Initialize',
        'is initialized': 'Initialize'
    },
    // Inverse mapping
    eventNameToEvent: {
        'Value Commit': 'is changed',
        'Click': 'is clicked',
        'Initialize': 'is initialised'
    },
    // fd:events property names
    SECURE_EVENT_PROPERTY_MAPPING: {
        'Calculate': 'fd:calc',
        'Visibility': 'fd:visible',
        'Initialize': 'fd:init',
        'Click': 'fd:click',
        'Value Commit': 'fd:valueCommit',
        'Enabled': 'fd:enabled',
        'Validate': 'fd:validate'
    },
    // Get event from condition (used by transformer)
    getEventFromCondition: function(condition) {
        return null;  // Default - let transformer handle it
    },
    setCurrentEventField: function(condition) {
        return null;
    },
    isConditionOnlyAnEvent: function(condition) {
        return false;
    }
};

// Mock jQuery (minimal - for code that uses $() syntax)
const mockjQuery = function(selector) {
    return {
        find: () => mockjQuery(),
        each: () => mockjQuery(),
        attr: () => '',
        val: () => '',
        text: () => '',
        html: () => '',
        on: () => mockjQuery(),
        off: () => mockjQuery(),
        trigger: () => mockjQuery(),
        proxy: (fn, context) => fn.bind(context),
        extend: Object.assign,
        isArray: Array.isArray,
        isFunction: (fn) => typeof fn === 'function',
        isPlainObject: (obj) => obj && typeof obj === 'object' && obj.constructor === Object,
        map: (arr, fn) => arr.map(fn),
        each: (obj, fn) => {
            if (Array.isArray(obj)) {
                obj.forEach((item, i) => fn(i, item));
            } else {
                Object.keys(obj).forEach(key => fn(key, obj[key]));
            }
        }
    };
};

mockjQuery.extend = Object.assign;
mockjQuery.isArray = Array.isArray;
mockjQuery.isFunction = (fn) => typeof fn === 'function';
mockjQuery.isPlainObject = (obj) => obj && typeof obj === 'object' && obj.constructor === Object;
mockjQuery.map = (arr, fn) => arr.map(fn);
mockjQuery.each = (obj, fn) => {
    if (Array.isArray(obj)) {
        obj.forEach((item, i) => fn(i, item));
    } else {
        Object.keys(obj).forEach(key => fn(key, obj[key]));
    }
};
mockjQuery.proxy = (fn, context) => fn.bind(context);
mockjQuery.Deferred = () => {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return {
        resolve: (val) => { resolve(val); return promise; },
        reject: (err) => { reject(err); return promise; },
        promise: () => promise
    };
};

global.jQuery = global.$ = mockjQuery;

// Mock lodash if not available
if (typeof global._ === 'undefined') {
    try {
        global._ = require('lodash');
    } catch (e) {
        // Minimal lodash mock
        global._ = {
            isUndefined: (val) => val === undefined,
            isNull: (val) => val === null,
            isEmpty: (val) => {
                if (val == null) return true;
                if (Array.isArray(val) || typeof val === 'string') return val.length === 0;
                return Object.keys(val).length === 0;
            },
            get: (obj, path, defaultVal) => {
                const keys = path.split('.');
                let result = obj;
                for (const key of keys) {
                    if (result == null) return defaultVal;
                    result = result[key];
                }
                return result === undefined ? defaultVal : result;
            },
            set: (obj, path, value) => {
                const keys = path.split('.');
                let current = obj;
                for (let i = 0; i < keys.length - 1; i++) {
                    if (!(keys[i] in current)) current[keys[i]] = {};
                    current = current[keys[i]];
                }
                current[keys[keys.length - 1]] = value;
                return obj;
            },
            extend: Object.assign,
            merge: (target, ...sources) => {
                sources.forEach(source => {
                    Object.keys(source || {}).forEach(key => {
                        if (typeof source[key] === 'object' && source[key] !== null) {
                            target[key] = target[key] || {};
                            global._.merge(target[key], source[key]);
                        } else {
                            target[key] = source[key];
                        }
                    });
                });
                return target;
            }
        };
    }
}

// Create fd namespace (AEM Forms client library namespace)
// fd._ is lodash used by AF transformers
global.fd = {
    _: global._  // Reference to lodash
};

// Console debug - can be controlled via environment variable
if (process.env.DEBUG !== 'true') {
    console.debug = () => {};
}

module.exports = {
    expeditor: global.expeditor,
    af: global.af,
    guidelib: global.guidelib,
    Granite: global.Granite
};
