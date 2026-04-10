/**
 * SimpleContext - A minimal ExpEditorContext for CLI transformation
 *
 * This context allows creating models from rule JSON using:
 * 1. Grammar's node_type field (from annotated_subset_grammar.json)
 * 2. JSON structure fallback (choice/items/value properties)
 *
 * Model type determination:
 * - node_type: "CHOICE" → ChoiceModel
 * - node_type: "SEQUENCE" → SequenceModel
 * - node_type: "ARRAY" → ListModel
 * - node_type: "TERMINAL" or "LITERAL_TOKEN" → TerminalModel
 *
 * Special models (handled explicitly):
 * - ROOT → RootModel (extends SequenceModel)
 * - CONDITION → ConditionModel (extends ChoiceModel)
 * - SCRIPTMODEL → ScriptModel
 * - RULES → ListModel (meta-structure, not in grammar)
 */
'use strict';

(function (expeditor) {

    /**
     * Map grammar node_type to model classes
     * This is the core of Option C - using grammar's explicit node_type
     */
    var NODE_TYPE_TO_MODEL = {
        'SEQUENCE': 'SequenceModel',
        'CHOICE': 'ChoiceModel',
        'TERMINAL': 'TerminalModel',
        'ARRAY': 'ListModel',
        'LITERAL_TOKEN': 'TerminalModel'
    };

    /**
     * Special node names that need specific model classes
     * These can't be determined from node_type alone because they extend base models
     */
    var SPECIAL_MODELS = {
        'ROOT': 'RootModel',           // extends SequenceModel
        'CONDITION': 'ConditionModel', // extends ChoiceModel (has nested property)
        'SCRIPTMODEL': 'ScriptModel',  // code editor model
        'RULES': 'ListModel',          // meta-structure for rule list
        'FUNCTION_CALL': 'FunctionModel' // function calls have special JSON structure (functionName, params)
    };

    /**
     * SimpleScope - a scope implementation for CLI use
     *
     * Can operate in two modes:
     * 1. Synthetic mode (default) - returns synthetic data from ID
     * 2. Validated mode - uses treeJson to validate components exist
     *
     * Usage:
     *   var scope = new expeditor.SimpleScope();
     *   scope.loadFromTreeJson(treeJson, functions);  // Enable validation
     */
    var SimpleScope = expeditor.SimpleScope = expeditor.Class.extend({
        init: function () {
            this.variables = {};
            this.functions = {};
            this.varsByType = {};  // Index variables by type for findVarByType
            this.validationEnabled = false;
        },

        /**
         * Load components and functions from treeJson
         * This enables validation mode
         *
         * @param {Object} treeJson - Form tree JSON from transform-form.js
         * @param {Array} functions - Array of function definitions (optional)
         */
        loadFromTreeJson: function (treeJson, functions) {
            var self = this;
            this.variables = {};
            this.functions = {};
            this.varsByType = {};

            // Track displayNames for isDuplicate detection (mirrors TreeProcessor.js)
            var displayNameMap = {};

            // Traverse treeJson to extract all components
            function traverse(node, displayPath, parent) {
                if (!node) return;

                var nodeId = node.id || '';
                var nodeName = node.name || '';
                var displayName = node.displayName || nodeName;

                if (nodeId) {
                    // Check for duplicate displayNames (mirrors TreeProcessor.js)
                    var isDuplicate = false;
                    if (displayNameMap[displayName]) {
                        isDuplicate = true;
                        // Mark the original as duplicate too
                        var originalId = displayNameMap[displayName];
                        if (self.variables[originalId]) {
                            self.variables[originalId].element.isDuplicate = true;
                        }
                    } else {
                        displayNameMap[displayName] = nodeId;
                    }

                    // Build metadata object (mirrors TreeProcessor.js behavior)
                    var metadata = {};
                    if (node.isAncestorRepeatable !== undefined) {
                        metadata.isAncestorRepeatable = node.isAncestorRepeatable;
                    }
                    if (node.isFragment !== undefined) {
                        metadata.isFragment = node.isFragment;
                    }
                    if (node.qualifiedName !== undefined) {
                        metadata.qualifiedName = node.qualifiedName;
                    }
                    if (node.fieldType !== undefined) {
                        metadata.fieldType = node.fieldType;
                    }

                    // Build props object (mirrors VariableDefinition structure)
                    var props = {};
                    if (node.options) {
                        props.options = node.options;
                    }

                    var element = {
                        id: nodeId,
                        name: nodeName,
                        displayName: displayName,
                        type: node.type || 'STRING',
                        displayPath: displayPath,
                        parent: parent ? parent.id : '',
                        fieldType: node.fieldType || '',
                        isDuplicate: isDuplicate,
                        metadata: metadata,
                        props: props
                    };

                    var varEntry = { element: element, foundId: nodeId, props: props };
                    self.variables[nodeId] = varEntry;

                    // Index by type for findVarByType (mirrors RBScope behavior)
                    var types = (node.type || 'STRING').split('|');
                    types.forEach(function (t) {
                        var trimmedType = t.trim();
                        if (!self.varsByType[trimmedType]) {
                            self.varsByType[trimmedType] = [];
                        }
                        self.varsByType[trimmedType].push(varEntry);
                    });

                    // Also index by name for easier lookup
                    if (nodeName && nodeName !== nodeId) {
                        self.variables[nodeName] = varEntry;
                    }
                }

                // Traverse children
                var items = node.items || [];
                if (Array.isArray(items)) {
                    items.forEach(function (item) {
                        var childDisplayPath = displayPath + (item.displayName || item.name || '') + '/';
                        traverse(item, childDisplayPath, node);
                    });
                }
            }

            traverse(treeJson, 'FORM/', null);

            // For fragments, add $globalForm variable to allow referencing parent form
            // This mirrors the behavior in RBScope.addVars and ExpressionEditorUtil.js
            // isFragment can be at root level (from ExpressionEditorTree) or in metadata (from AEM authoring)
            var isFragment = treeJson.isFragment || (treeJson.metadata && treeJson.metadata.isFragment);
            if (isFragment) {
                // Update $form to have FRAGMENT name/displayName (matches AEM behavior)
                if (self.variables['$form']) {
                    self.variables['$form'].element.name = 'FRAGMENT';
                    self.variables['$form'].element.displayName = 'FRAGMENT';
                    self.variables['$form'].element.metadata = self.variables['$form'].element.metadata || {};
                    self.variables['$form'].element.metadata.isFragment = true;
                }

                // Add $globalForm to reference the actual parent form
                var globalFormEntry = {
                    element: {
                        id: '$globalForm',
                        name: 'FORM',
                        displayName: 'FORM',
                        type: 'FORM',
                        displayPath: 'FORM/',
                        fieldType: 'form',
                        metadata: {},
                        props: {}
                    },
                    foundId: '$globalForm',
                    props: {}
                };
                self.variables['$globalForm'] = globalFormEntry;

                // Also add to varsByType for FORM
                if (!self.varsByType['FORM']) {
                    self.varsByType['FORM'] = [];
                }
                self.varsByType['FORM'].push(globalFormEntry);
            }

            // Load functions
            if (functions && Array.isArray(functions)) {
                functions.forEach(function (func) {
                    var funcId = func.id || '';
                    if (funcId) {
                        self.functions[funcId] = { element: func };
                        // Also index by displayName
                        var displayName = func.displayName || '';
                        if (displayName) {
                            self.functions[displayName.toLowerCase()] = { element: func };
                        }
                    }
                });
            }

            this.validationEnabled = true;
            return this;
        },

        /**
         * Register a variable by ID (manual registration)
         */
        registerVar: function (id, element) {
            this.variables[id] = { element: element, foundId: id };
        },

        /**
         * Register a function by ID (manual registration)
         */
        registerFunction: function (id, element) {
            this.functions[id] = { element: element };
        },

        /**
         * Find variables by type
         * Returns array of { element, foundId, props } entries
         * Mirrors RBScope.findVarByType
         */
        findVarByType: function (types) {
            if (!types || types.length === 0) {
                return [];
            }

            var typesArray = types.split('|');
            if (typesArray.indexOf('ANY') > -1) {
                // Return all variables
                return Object.values(this.variables);
            }

            var result = [];
            var idsAdded = {};
            var self = this;

            typesArray.forEach(function (type) {
                var trimmedType = type.trim();
                var vars = self.varsByType[trimmedType] || [];
                vars.forEach(function (varEntry) {
                    var id = varEntry.foundId;
                    if (!idsAdded[id]) {
                        idsAdded[id] = true;
                        result.push(varEntry);
                    }
                });
            });

            return result;
        },

        /**
         * Find a variable by ID
         * Returns { element, foundId } or null
         *
         * In validation mode: returns null if component not found
         * In synthetic mode: returns synthetic element from ID
         */
        findVarById: function (id) {
            // First check registered variables
            if (this.variables[id]) {
                return this.variables[id];
            }

            // In validation mode, return null for missing components
            if (this.validationEnabled) {
                return null;
            }

            // Synthetic mode: return synthetic element from ID
            var name = id.split('.').pop();
            return {
                element: { id: id, name: name, displayName: name },
                foundId: id
            };
        },

        /**
         * Find a function by ID
         * Returns { element } or null
         */
        findFunctionById: function (id) {
            // Check registered functions
            if (this.functions[id]) {
                return this.functions[id];
            }

            // Try lowercase lookup
            var lowerKey = (id || '').toLowerCase();
            if (this.functions[lowerKey]) {
                return this.functions[lowerKey];
            }

            // In validation mode, return null for missing functions
            if (this.validationEnabled) {
                return null;
            }

            // Synthetic mode: return synthetic function definition
            return {
                element: { id: id, displayName: id }
            };
        },

        /**
         * Check if a component exists
         */
        hasVariable: function (id) {
            return this.variables.hasOwnProperty(id);
        },

        /**
         * Check if a function exists
         */
        hasFunction: function (id) {
            return this.functions.hasOwnProperty(id) ||
                   this.functions.hasOwnProperty((id || '').toLowerCase());
        },

        /**
         * Get all registered variable IDs
         */
        getAllVariableIds: function () {
            return Object.keys(this.variables);
        },

        /**
         * Get all registered function IDs
         */
        getAllFunctionIds: function () {
            return Object.keys(this.functions);
        },

        /**
         * Check if validation mode is enabled
         */
        isValidationEnabled: function () {
            return this.validationEnabled;
        }
    });

    /**
     * SimpleContext - creates models from JSON using grammar configuration
     *
     * Uses grammar's node_type field to determine model classes, with
     * JSON structure detection as fallback for backward compatibility.
     */
    var SimpleContext = expeditor.SimpleContext = expeditor.Class.extend({
        init: function () {
            this.config = {};
            this.scope = new SimpleScope();
            this.grammar = null;  // Will hold the grammar config (annotated_subset_grammar.json)
        },

        /**
         * Set the grammar configuration
         * @param {Object} grammar - Grammar object (e.g., annotated_subset_grammar.json)
         */
        setGrammar: function (grammar) {
            this.grammar = grammar;
            return this;
        },

        /**
         * Get the grammar configuration
         */
        getGrammar: function () {
            return this.grammar;
        },

        setScope: function (scope) {
            this.scope = scope;
        },

        getScope: function () {
            return this.scope;
        },

        getConfig: function (nodeName) {
            // Return minimal config - the model type is determined by _getModelClass
            return {
                impl: {
                    model: 'expeditor.model.SequenceModel'  // default
                }
            };
        },

        /**
         * Resolve model class name to actual class
         * @param {string} modelName - Model name (e.g., 'ChoiceModel')
         * @returns {Function} Model class constructor
         */
        _resolveModelClass: function (modelName) {
            var modelClass = expeditor.model[modelName];
            if (!modelClass) {
                // Fallback to TerminalModel if class not found
                return expeditor.model.TerminalModel;
            }
            return modelClass;
        },

        /**
         * Determine the model class to use based on nodeName and JSON structure
         *
         * Resolution order:
         * 1. Special models (ROOT, CONDITION, SCRIPTMODEL, RULES)
         * 2. Grammar's node_type field
         * 3. JSON structure fallback (choice/items/value)
         * 4. Default to TerminalModel
         */
        _getModelClass: function (nodeName, jsonObj) {
            // 1. Check special models first (these extend base models)
            if (SPECIAL_MODELS.hasOwnProperty(nodeName)) {
                return this._resolveModelClass(SPECIAL_MODELS[nodeName]);
            }

            // 2. Use grammar's node_type if available
            if (this.grammar && this.grammar[nodeName]) {
                var entry = this.grammar[nodeName];
                if (entry.node_type && NODE_TYPE_TO_MODEL[entry.node_type]) {
                    return this._resolveModelClass(NODE_TYPE_TO_MODEL[entry.node_type]);
                }
            }

            // 3. Fallback: Determine from JSON structure
            if (jsonObj) {
                if (jsonObj.hasOwnProperty('choice')) {
                    return expeditor.model.ChoiceModel;
                }
                if (jsonObj.hasOwnProperty('items')) {
                    return expeditor.model.SequenceModel;
                }
                if (jsonObj.hasOwnProperty('value')) {
                    return expeditor.model.TerminalModel;
                }
            }

            // 4. Default to TerminalModel for unknown nodes
            return expeditor.model.TerminalModel;
        },

        /**
         * Create a model for the given nodeName
         * This is called by ModelFactory.fromJson
         */
        createModel: function (nodeName, componentConfig, jsonObj) {
            var ModelClass = this._getModelClass(nodeName, jsonObj);
            return new ModelClass(nodeName, this);
        }
    });

    // Override ModelFactory.fromJson to pass jsonObj to context
    var originalFromJson = expeditor.Utils.ModelFactory.fromJson;
    expeditor.Utils.ModelFactory.fromJson = function (json, ctx) {
        if (ctx instanceof SimpleContext) {
            // For SimpleContext, pass the json to help determine model type
            var model = ctx.createModel(json.nodeName, null, json).fromJson(json);
            return model;
        }
        return originalFromJson.call(this, json, ctx);
    };

})(expeditor);
