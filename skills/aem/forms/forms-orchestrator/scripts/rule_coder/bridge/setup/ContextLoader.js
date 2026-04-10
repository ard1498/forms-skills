/**
 * ContextLoader - Load and cache FormContext for CLI tools
 *
 * This module provides utilities to load FormContext data (treeJson + functions)
 * and configure SimpleContext/SimpleScope for validation mode.
 *
 * Usage:
 *   // Load from file
 *   const ctx = ContextLoader.loadFromFile('context.json');
 *
 *   // Load from JSON object
 *   const ctx = ContextLoader.loadFromJson({ treeJson: {...}, functions: [...] });
 *
 *   // Create context with validation enabled
 *   const simpleCtx = ContextLoader.createValidatedContext(treeJson, functions);
 */
'use strict';

// Use global require/fs/path if available (Node.js context)
var fs = typeof require !== 'undefined' ? require('fs') : null;
var path = typeof require !== 'undefined' ? require('path') : null;

// In-memory cache for loaded contexts
const contextCache = {};

// Cached grammar (loaded once)
var cachedGrammar = null;

/**
 * ContextLoader - manages loading and caching of FormContext data
 */
const ContextLoader = {
    /**
     * Load context from a JSON file
     *
     * @param {string} filePath - Path to context JSON file
     * @param {boolean} useCache - Whether to use cached version (default: true)
     * @returns {Object} Context data with treeJson and functions
     */
    loadFromFile: function (filePath, useCache = true) {
        const absPath = path.resolve(filePath);

        // Check cache
        if (useCache && contextCache[absPath]) {
            const cached = contextCache[absPath];
            const currentMtime = fs.statSync(absPath).mtimeMs;

            if (currentMtime === cached.mtime) {
                return cached.data;
            }
        }

        // Load fresh
        if (!fs.existsSync(absPath)) {
            throw new Error(`Context file not found: ${absPath}`);
        }

        const content = fs.readFileSync(absPath, 'utf-8');
        const data = JSON.parse(content);

        // Validate structure
        if (!data.treeJson) {
            throw new Error('Invalid context: missing treeJson');
        }

        // Cache it
        contextCache[absPath] = {
            data: data,
            mtime: fs.statSync(absPath).mtimeMs
        };

        return data;
    },

    /**
     * Load context from JSON object
     *
     * @param {Object} json - Context object with treeJson and optional functions
     * @returns {Object} Context data
     */
    loadFromJson: function (json) {
        if (!json || !json.treeJson) {
            throw new Error('Invalid context: missing treeJson');
        }

        return {
            treeJson: json.treeJson,
            functions: json.functions || []
        };
    },

    /**
     * Load context from stdin (for piped input)
     *
     * @returns {Promise<Object>} Context data
     */
    loadFromStdin: function () {
        return new Promise((resolve, reject) => {
            let input = '';

            process.stdin.setEncoding('utf-8');
            process.stdin.on('data', chunk => { input += chunk; });
            process.stdin.on('end', () => {
                try {
                    const data = JSON.parse(input);
                    resolve(this.loadFromJson(data));
                } catch (e) {
                    reject(new Error(`Failed to parse context from stdin: ${e.message}`));
                }
            });
            process.stdin.on('error', reject);
        });
    },

    /**
     * Load the annotated grammar for model class resolution
     * Caches the grammar after first load
     *
     * @returns {Object|null} Grammar object or null if not found
     */
    loadGrammar: function () {
        if (cachedGrammar) {
            return cachedGrammar;
        }

        // Try to load from global if already loaded by loader.js
        if (typeof global !== 'undefined' && global.AnnotatedGrammar) {
            cachedGrammar = global.AnnotatedGrammar;
            return cachedGrammar;
        }

        // Load from file
        const grammarPath = path.resolve(__dirname, '../../grammar/annotated_subset_grammar.json');

        if (!fs.existsSync(grammarPath)) {
            return null;
        }

        try {
            const content = fs.readFileSync(grammarPath, 'utf-8');
            cachedGrammar = JSON.parse(content);
            return cachedGrammar;
        } catch (e) {
            console.error('Error loading grammar:', e.message);
            return null;
        }
    },

    /**
     * Create a SimpleContext with validation enabled
     * Also sets the grammar for proper model class resolution
     *
     * @param {Object} treeJson - Form tree JSON
     * @param {Array} functions - Array of function definitions
     * @returns {expeditor.SimpleContext} Configured context
     */
    createValidatedContext: function (treeJson, functions) {
        const ctx = new expeditor.SimpleContext();

        // Load and set grammar for model class resolution
        const grammar = this.loadGrammar();
        if (grammar) {
            ctx.setGrammar(grammar);
        }

        ctx.getScope().loadFromTreeJson(treeJson, functions);
        return ctx;
    },

    /**
     * Create SimpleContext from context file
     *
     * @param {string} filePath - Path to context JSON file
     * @returns {expeditor.SimpleContext} Configured context with validation
     */
    createContextFromFile: function (filePath) {
        const data = this.loadFromFile(filePath);
        return this.createValidatedContext(data.treeJson, data.functions);
    },

    /**
     * Invalidate cached context
     *
     * @param {string} filePath - Path to context file to invalidate
     */
    invalidateCache: function (filePath) {
        const absPath = path.resolve(filePath);
        delete contextCache[absPath];
    },

    /**
     * Clear all cached contexts
     */
    clearCache: function () {
        Object.keys(contextCache).forEach(key => delete contextCache[key]);
    },

    /**
     * Get cache info for debugging
     *
     * @returns {Object} Cache statistics
     */
    getCacheInfo: function () {
        const entries = Object.keys(contextCache).map(key => ({
            path: key,
            mtime: contextCache[key].mtime,
            componentsCount: Object.keys(contextCache[key].data.treeJson.items || {}).length,
            functionsCount: (contextCache[key].data.functions || []).length
        }));

        return {
            entriesCount: entries.length,
            entries: entries
        };
    },

    /**
     * Export context to file (for sharing between processes)
     *
     * @param {Object} contextData - Context data to export
     * @param {string} filePath - Output file path
     */
    exportToFile: function (contextData, filePath) {
        const output = JSON.stringify(contextData, null, 2);
        fs.writeFileSync(filePath, output, 'utf-8');
    }
};

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContextLoader;
}

// Also attach to global for use in loaded scripts
if (typeof global !== 'undefined') {
    global.ContextLoader = ContextLoader;
}
