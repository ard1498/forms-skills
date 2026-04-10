/**
 * Load JavaScript files from local vendor directory
 *
 * This loader makes the AEM Forms JavaScript code available in a Node.js environment
 * for use by CLI scripts. All files are loaded from the local vendor/ directory
 * for complete independence from external repositories.
 */

'use strict';

const path = require('path');
const fs = require('fs');

// Base paths for the source files (LOCAL VENDOR DIRECTORY)
// __dirname is tools/rule_coder/bridge/setup
const VENDOR_BASE = path.resolve(__dirname, '../vendor');
const AF_EXP_EDITOR_BASE = path.join(VENDOR_BASE, 'af-exp-editor');
const EXP_EDITOR_BASE = path.join(VENDOR_BASE, 'exp-editor');

// Grammar path (tools/rule_coder/grammar/)
const GRAMMAR_BASE = path.resolve(__dirname, '../../grammar');

/**
 * Load a JavaScript file and execute it
 * @param {string} filePath - Path to the JS file
 * @param {boolean} silent - If true, don't log warnings for missing files
 */
function loadFile(filePath, silent = false) {
    if (!fs.existsSync(filePath)) {
        if (!silent) {
            console.error(`Warning: File not found: ${filePath}`);
        }
        return false;
    }
    const code = fs.readFileSync(filePath, 'utf-8');
    try {
        // Execute the code in global context
        const vm = require('vm');
        vm.runInThisContext(code, { filename: filePath });
        return true;
    } catch (e) {
        if (!silent) {
            console.error(`Error loading ${filePath}:`, e.message);
        }
        return false;
    }
}

/**
 * Load ExpressionEditorTree.js for form transformation
 * This sets up af.expeditor.author.ExpressionEditorTree
 */
function loadExpressionEditorTree() {
    // Load the ExpressionEditorTree.js file from local vendor
    const expressionEditorTreePath = path.join(AF_EXP_EDITOR_BASE, 'authoring/ExpressionEditorTree.js');
    loadFile(expressionEditorTreePath);
}

/**
 * Load the custom function parser
 * This sets up expeditor.rb.customFunctionParser
 */
function loadCustomFunctionParser() {
    const parserPath = path.join(AF_EXP_EDITOR_BASE, 'custom-function-parser/custom-function-parser.js');

    if (!fs.existsSync(parserPath)) {
        console.error('Warning: Custom function parser not found at:', parserPath);
        return;
    }

    // The bundled parser is a UMD module that will detect the global context
    try {
        const parserCode = fs.readFileSync(parserPath, 'utf-8');
        const vm = require('vm');

        // Create a context with module.exports support for UMD detection
        const script = new vm.Script(parserCode, { filename: parserPath });
        script.runInThisContext();

        // The parser should now be available on expeditor.rb.customFunctionParser
        if (!expeditor.rb.customFunctionParser) {
            // If not set by the module, check if it's exported globally
            if (typeof customFunctionParser !== 'undefined') {
                expeditor.rb.customFunctionParser = customFunctionParser;
            }
        }
    } catch (e) {
        console.error('Error loading custom function parser:', e.message);
    }
}

/**
 * Load FunctionsConfigV2 (OOTB functions)
 */
function loadFunctionsConfig() {
    const functionsConfigPath = path.join(AF_EXP_EDITOR_BASE, 'runtime/FunctionsConfigV2.js');
    loadFile(functionsConfigPath);
}

/**
 * Load all required files for transformation
 */
function loadForTransform() {
    loadExpressionEditorTree();
}

/**
 * Load all required files for function parsing
 */
function loadForParseFunctions() {
    loadCustomFunctionParser();
}

/**
 * Load functions configuration (OOTB functions)
 */
function loadForFunctionsConfig() {
    loadFunctionsConfig();
}

/**
 * Load RuntimeUtil.js for transformer utilities
 */
function loadRuntimeUtil() {
    const runtimeUtilPath = path.join(AF_EXP_EDITOR_BASE, 'runtime/RuntimeUtil.js');
    loadFile(runtimeUtilPath);
}

/**
 * Load exp-editor core files in dependency order
 * These are required for model classes and transformers
 * Files are loaded from the local vendor/exp-editor directory
 */
function loadExpEditorCore() {
    const files = [
        // Core namespace and utilities (flattened in vendor/)
        'namespace.js',
        'jquery_oops.js',
        'utils.js',
        // Model classes (in vendor/exp-editor/model/)
        // Order matters! Base classes must be loaded before subclasses.
        'model/BaseModel.js',       // Base class for all models
        'model/TerminalModel.js',   // extends BaseModel
        'model/SequenceModel.js',   // extends BaseModel
        'model/ListModel.js',       // extends BaseModel
        'model/ChoiceModel.js',     // extends BaseModel
        'model/RootModel.js',       // extends SequenceModel (must come after)
        'model/ScriptModel.js',     // extends BaseModel
        'model/FunctionModel.js',   // extends SequenceModel
        'model/ConditionModel.js',  // extends ChoiceModel (must come after)
        // Core transformer classes (in vendor/exp-editor/core/)
        'core/BaseTransformer.js',
        'core/ToJsonFormulaTransformer.js',
        'core/ToSummaryTransformer.js',
        'core/RBScope.js'
    ];

    files.forEach(file => {
        const filePath = path.join(EXP_EDITOR_BASE, file);
        loadFile(filePath, true);  // silent=true, these are optional
    });
}

/**
 * Load AF-specific transformer files
 */
function loadAFTransformers() {
    // Load RuntimeUtil first (has dependencies)
    loadRuntimeUtil();

    // Load AF transformers from local vendor
    const transformerPath = path.join(AF_EXP_EDITOR_BASE, 'runtime/AFJSONFormulaTransformer.js');
    loadFile(transformerPath);

    const mergerPath = path.join(AF_EXP_EDITOR_BASE, 'runtime/AFJSONFormulaMerger.js');
    loadFile(mergerPath);

    const summaryPath = path.join(AF_EXP_EDITOR_BASE, 'authoring/ToSummaryTransformer.js');
    loadFile(summaryPath, true);
}

/**
 * Load SimpleContext for CLI transformation
 * This provides a minimal context that can create models without full grammar
 */
function loadSimpleContext() {
    const contextPath = path.join(__dirname, 'SimpleContext.js');
    loadFile(contextPath);
}

/**
 * Load all files needed for rule transformation
 * This includes exp-editor core, RuntimeUtil, AF transformers, and SimpleContext
 */
function loadForRuleTransform() {
    loadExpEditorCore();
    loadSimpleContext();  // Load after models but before transformers
    loadAFTransformers();
}

/**
 * Load ContextLoader for managing FormContext in CLI tools
 */
function loadContextLoader() {
    const contextLoaderPath = path.join(__dirname, 'ContextLoader.js');
    loadFile(contextLoaderPath);
}

/**
 * Load the annotated subset grammar for model class resolution
 * This grammar provides node_type annotations used by SimpleContext._getModelClass
 *
 * @returns {Object|null} The grammar object or null if not found
 */
function loadGrammar() {
    const grammarPath = path.join(GRAMMAR_BASE, 'annotated_subset_grammar.json');

    if (!fs.existsSync(grammarPath)) {
        console.error('Warning: Grammar file not found at:', grammarPath);
        return null;
    }

    try {
        const content = fs.readFileSync(grammarPath, 'utf-8');
        const grammar = JSON.parse(content);

        // Make grammar available globally
        if (typeof global !== 'undefined') {
            global.AnnotatedGrammar = grammar;
        }

        return grammar;
    } catch (e) {
        console.error('Error loading grammar:', e.message);
        return null;
    }
}

/**
 * Create a SimpleContext with grammar loaded
 * This is a convenience function for CLI tools
 *
 * @returns {expeditor.SimpleContext} Context with grammar set
 */
function createSimpleContextWithGrammar() {
    const grammar = loadGrammar();
    const ctx = new expeditor.SimpleContext();

    if (grammar) {
        ctx.setGrammar(grammar);
    }

    return ctx;
}

module.exports = {
    loadFile,
    loadExpressionEditorTree,
    loadCustomFunctionParser,
    loadFunctionsConfig,
    loadForTransform,
    loadForParseFunctions,
    loadForFunctionsConfig,
    loadRuntimeUtil,
    loadExpEditorCore,
    loadSimpleContext,
    loadAFTransformers,
    loadForRuleTransform,
    loadContextLoader,
    loadGrammar,
    createSimpleContextWithGrammar,
    // Export paths for direct access
    AF_EXP_EDITOR_BASE,
    EXP_EDITOR_BASE,
    VENDOR_BASE,
    GRAMMAR_BASE
};
