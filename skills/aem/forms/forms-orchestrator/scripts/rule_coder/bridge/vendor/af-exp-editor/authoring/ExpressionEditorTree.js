/*************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 * Copyright 2022 Adobe
 * All Rights Reserved.
 *
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 **************************************************************************/

(function () {
    /**
     * Each node in the tree must have the following properties
     * id
     * path
     * name
     * type
     * displayName
     * qualifiedName (SOM for AF 1)
     *
     * For backward compatibilty, the node should have the following properties
     * status
     * resourceType
     * isFragment
     */
    var ExpressionEditorTree = af.expeditor.author.ExpressionEditorTree = {


        /**
         * Converts the form json to exp-editor tree json
         * @param {object} formJson - The input form JSON
         * @returns {object|null} exp-editor tree json or null
         */
        transformJson: function(formJson) {
            if(!expeditor.rb.FeatureToggles.isCommComposerChannel()){
                return ExpressionEditorTree._getTreeJson("", "object", false, false)(formJson);
            }
            // Initial transformation for the main form structure
            // Note: _getTreeJson returns a function, which is then immediately called with formJson
            const baseTree = ExpressionEditorTree._getTreeJson("", "object", false, false)(formJson);

            // If source is COMM_COMPOSER, process DOR template items as well
            if (expeditor.rb.FeatureToggles.isCommComposerChannel() && baseTree) {
                // Safely access the nested template container
                const templateContainer = formJson?.properties?.["fd:dor"]?.pageTemplate?.template?.[':items'];
                const panelKey = Object.keys(templateContainer ?? {})?.[0];
                const panel = templateContainer?.[panelKey];

                console.log(panel);

                if (panel && (panel[':items'] || panel.items)) { // Check if template has items
                    try {
                        const templateTree = ExpressionEditorTree._filterTemplateTree(ExpressionEditorTree._getTreeJson("", "object", false, false)(panel));
                        console.debug("templateTree", templateTree);

                        // Merge templateNodes into the base tree's items
                        if (templateTree.items.length > 0) {
                            // Initialize items array if it doesn't exist
                            if (!baseTree.items) {
                                baseTree.items = [];
                            }

                            // Concatenate the processed template nodes
                            baseTree.items = [...templateTree.items, ...baseTree.items];
                        }
                    } catch (e) {
                        // Log error and return the base tree (or handle error differently)
                        console.error("ExpressionEditorTree: Error processing DOR template items.", e);
                    }
                }

                // Add data models to tree so they're included in scope, but mark them for filtering from tree display
                const dataDescriptions = formJson?.properties?.["fd:dor"]?.pageTemplate?.datasets?.dataDescriptions;
                if (dataDescriptions) {
                    try {
                        // Extract the template item name to prepend to data model IDs
                        const templateItems = formJson?.properties?.["fd:dor"]?.pageTemplate?.template?.[':items'];
                        let templateItemName = null;

                        if (templateItems) {
                            const firstItemKey = Object.keys(templateItems)[0];
                            templateItemName = templateItems[firstItemKey]?.name;
                            console.debug("DEBUG: Template item name =", templateItemName);
                        }

                        const dataModelItems = ExpressionEditorTree._parseDataModelsAsTreeItems(dataDescriptions, templateItemName);
                        if (dataModelItems.length > 0) {
                            if (!baseTree.dataModelItems) {
                                baseTree.dataModelItems = [];
                            }
                            // Add data models to dataModelItems (stored separately from regular items)
                            baseTree.dataModelItems = [...baseTree.dataModelItems, ...dataModelItems];
                        }
                    } catch (e) {
                        console.error("ExpressionEditorTree: Error processing data models.", e);
                    }
                }
            }

            return baseTree;
        },

        _filterTemplateTree : function (tree) {
            if (!tree.items || !Array.isArray(tree.items)) {
                return tree;
            }

            tree.items = tree.items
                .filter(item => item.path !== undefined && item.path !== null)
                .map(item => ExpressionEditorTree._filterTemplateTree(item)); // Recursively filter nested items

            return tree;
        },

        _parseDataModelsAsTreeItems: function(dataDescriptions, templateItemName) {
            const models = JSON.parse(dataDescriptions);
            const items = [];
            models.forEach(model => {
                if (model.dataConnection) {
                    const modelItems = ExpressionEditorTree._flattenDataModelToTree(model.dataConnection, templateItemName);
                    items.push(...modelItems);
                }
            });
            return items;
        },

        _flattenDataModelToTree: function(node, templateItemName = null) {
            const items = [];
            if (node.key && node.datapath !== undefined) {
                // Build ID with template name prefix if provided
                let itemId = node.datapath || ('/' + node.key);

                if (templateItemName) {
                    itemId = `${templateItemName}${itemId}`;
                }
                const item = {
                    id: itemId,
                    name: node.key,
                    displayName: node.title || node.key,
                    type: ExpressionEditorTree._mapDataModelType(node.type),
                    fieldType: 'data-model',
                    path: node.datapath || ('/' + node.key),
                    status: 'none',
                };
                items.push(item);
            } else {
                console.log("DEBUG: Skipping node - condition failed. node.key =", node.key, "node.datapath =", node.datapath);
            }
            if (node.children && Array.isArray(node.children)) {
                node.children.forEach(child => {
                    const childItems = ExpressionEditorTree._flattenDataModelToTree(child, templateItemName);
                    items.push(...childItems);
                });
            }
            return items;
        },

        _mapDataModelType: function(dataType) {
            const typeMap = {
                'string': 'STRING',
                'number': 'NUMBER',
                'boolean': 'BOOLEAN',
                'object': 'OBJECT',
                'array': 'ARRAY'
            };
            return typeMap[dataType?.toLowerCase()] || 'STRING';
        },


        _isSiteContainer : function(item) {
            // for example, some custom components in AEM (like demo) is also returning items
            return (':items' in item || 'items' in item) && !('fieldType' in item);
        },


        _walkThroughContainer : function(parentId, container, isAncestorRepeatable) {
            const oldItems = container.items instanceof Array ? container.items : [];
            const cqItems = container[':items'] ? container[':items'] : {};
            const cqItemsOrder = container[':itemsOrder'] ? container[':itemsOrder'] : [];
            const items = (oldItems.length > 0 ? oldItems : (cqItemsOrder.map(x => cqItems[x])));
            return items.flatMap(ExpressionEditorTree._getTreeJson(parentId, container.type, container.repeatable, isAncestorRepeatable || !!container.repeatable))
                .filter(i => i != null);
        },

        _sanitizeFieldName(name) {
            // regex: name should start with a letter and have only [A-Za-z0-9_] else add quotes
            const nameRegex = /^[A-Za-z][A-Za-z0-9_]*$/;
            if (!nameRegex.test(name)) {
                name = `"${name}"`;
            }
            return name;
        },

        _getTreeJson: (parentSOM, parentType, isParentRepeatable, isAncestorRepeatable) => (json, index) => {
            if (json.hasOwnProperty("fieldType") || ExpressionEditorTree._isSiteContainer(json)) {
                if (ExpressionEditorTree._isSiteContainer(json)) {
                    return ExpressionEditorTree._walkThroughContainer(parentSOM, json, isAncestorRepeatable).flat();
                } else {
                    const unnamed = json.name == null || json.name === "";
                    let selfJson;
                    if (Granite.Toggles.isEnabled("FT_FORMS-14303")) {
                        selfJson = ExpressionEditorTree._getTreeJsonForNode(json, isAncestorRepeatable && !unnamed);
                    } else {
                        selfJson = ExpressionEditorTree._getTreeJsonForNode(json);
                    }

                    if (parentSOM === "") {
                        if (Granite.Toggles.isEnabled(guidelib.author.ConfigUpdater.FT_FORMS_11581)) {
                            // form id is required to generate save form action so before replacing adding the same in options.
                            const originalFormId = {
                                'originalId': selfJson.id
                            }
                            selfJson.options = {...selfJson.options, ...originalFormId};
                        }

                        if (Granite.Toggles.isEnabled(guidelib.author.ConfigUpdater.FT_FORMS_9611) || Granite.Toggles.isEnabled(guidelib.author.ConfigUpdater.FT_FORMS_15407)) {
                            var schemaInfo = ExpressionEditorTree._getSchemaInfo(json['properties']);
                            selfJson.options = { ...selfJson.options, ...schemaInfo };
                        }
                        selfJson.id = "$form"
                    } else if (isParentRepeatable && !unnamed) {
                        if (Granite.Toggles.isEnabled('FT_FORMS-16466')) {
                            selfJson.id = parentSOM + "[getRelativeInstanceIndex(" + parentSOM + ")]" + "." + ExpressionEditorTree._sanitizeFieldName(selfJson.name);
                        } else {
                            selfJson.id = parentSOM + "[length(" + parentSOM + ") - 1]" + "." + ExpressionEditorTree._sanitizeFieldName(selfJson.name);
                        }
                    } else if (parentType !== "array" && !unnamed) {
                        selfJson.id = parentSOM + "." + ExpressionEditorTree._sanitizeFieldName(selfJson.name);
                    } else if (parentType === "array") {
                        selfJson.id = `${parentSOM}[${index}]`
                    } else if (unnamed) {
                        selfJson.id = parentSOM;
                    }
                    if (expeditor.rb.FeatureToggles.isCommComposerChannel()) {
                        selfJson.fieldId = json.id;
                    }

                    if (expeditor.rb.FeatureToggles.isCommComposerChannel() && json.fieldType === "panel") {
                        const dorContainerItems = json?.properties?.["fd:dor"]?.dorContainer?.[":items"];
                        if (dorContainerItems) {
                            try {
                                const processedItems = Object.values(dorContainerItems).map(item =>
                                    ExpressionEditorTree._getTreeJsonForNode(item, isAncestorRepeatable)
                                );
                                selfJson.items = [...(selfJson.items || []), ...processedItems];
                                return selfJson;
                            } catch (e) {
                                console.error("ExpressionEditorTree: Error processing dorcontainer items.", e);
                            }
                        }
                    }

                    if (json.hasOwnProperty("fieldType") && (json.fieldType !== 'panel' && json.fieldType !== 'form' && json.fieldType !== 'pageset' && json.fieldType !== 'pagearea')) {
                        if (unnamed) {
                            //unnamed leaf elements are not visible in the tree
                            return null;
                        }
                        return selfJson
                    } else {
                        selfJson.items = ExpressionEditorTree._walkThroughContainer(selfJson.id, json, isAncestorRepeatable);
                        selfJson.isFragment = json.properties?.['fd:fragment'] || false;
                        return selfJson;
                    }
                }
            }
        },

        //TODO: Support all field types
        _getExpEditorDataType: function(nodeJson, isAncestorRepeatable) {
            var type = [];

            if(expeditor.rb.FeatureToggles.isCommComposerChannel() && nodeJson.fieldType && nodeJson.fieldType === 'radio-group') {
                nodeJson.fieldType = 'panel';
            }

            var isField = function (fieldType) {
                //pageset and pagearea are for communication composer template items
                return (fieldType.length > 0 &&
                    [ 'panel', 'form', 'image', 'plain-text', 'pageset', 'pagearea', 'contentarea'].indexOf(fieldType) === -1);
            }

            var fieldTypeMapping = {
                'pageset' : ['PAGESET'],
                'pagearea' : ['PAGEAREA'],
                'text-input' : ["TEXT FIELD"],
                'number-input' : ["NUMBER FIELD"],
                'date-input' : ['DATE FIELD'],
                'file-input' : ['FILE ATTACHMENT', 'BINARY'],
                'drop-down' : ['DROPDOWN'],
                'radio-group' : ['RADIO BUTTON'],
                'checkbox-group' : ['CHECK BOX'],
                'plain-text' : ['STATIC TEXT', 'STRING'],
                'checkbox' : [], //todo: define a type
                'captcha' : [],
                'button' : ['BUTTON'],
                'image' : ['IMAGE', 'STRING'],
                'multiline-input' : ['TEXT FIELD'],
                'email' : ['TEXT FIELD'],
                'panel' : ['PANEL'],
                'form' : ['FORM']
            }

            if (nodeJson.hasOwnProperty("fieldType")) {
                var fieldType = nodeJson.fieldType
                if (fieldType === 'form') {
                    type.push('FORM')
                } else {
                    type.push("AFCOMPONENT")
                    if (isField(fieldType)) {
                        type.push("FIELD")
                    }
                    if (fieldTypeMapping.hasOwnProperty(fieldType)) {
                        type = type.concat(fieldTypeMapping[fieldType])
                    } else {
                        console.error("Unsupported fieldType " + fieldType)
                    }
                    switch (nodeJson.type) {
                        case 'number':
                        case 'integer':
                            type.push('NUMBER')
                            if (isAncestorRepeatable) {
                                type.push('NUMBER[]')
                            }
                            break;
                        case 'number[]':
                        case 'string[]':
                        case 'boolean[]':
                        case 'object':
                        case 'array':
                            type.push(nodeJson.type.toUpperCase());
                            break;
                        case 'file':
                            type.push('FILE');
                            break;
                        case 'file[]':
                            type.push('FILE[]');
                            break;
                        case 'boolean':
                            type.push('BOOLEAN')
                            if (isAncestorRepeatable) {
                                type.push('BOOLEAN[]')
                            }
                            break;
                        case "string":
                        default:
                            if (nodeJson.format === "date") {
                                type.push('DATE');
                                if (isAncestorRepeatable) {
                                    type.push('DATE[]')
                                }
                            } else if (isField(fieldType) && nodeJson.fieldType !== 'button') { //hack to disable comparison operators in button
                                type.push('STRING');
                                if (isAncestorRepeatable) {
                                    type.push('STRING[]')
                                }
                            }
                            break;
                    }
                }
            }
            return type.join("|");
        },

        _getOptionsObject : function(nodeJson) {
            const _enum = nodeJson.enum;
            if (_enum && _enum.length > 0) {
                const _enumNames = nodeJson.enumNames || _enum;
                return {
                    options: Object.fromEntries(
                        _enum.map((x, i) => [x, i < _enumNames.length ? (!!_enumNames[i].value ? _enumNames[i].value : _enumNames[i]) : x])
                    )
                };
            }
            return {}
        },

        _hasEventsOrRules : function (nodeJson) {
            const events = nodeJson.events || {}
            const rules = nodeJson.rules || {}
            const ootbEvents = Object.keys(events).filter(x => !x.startsWith("custom:"))
            return Object.keys(ootbEvents).length > 0 || Object.keys(rules).length > 0
        },

        _getExpEditorNodeName: function(nodeJson) {
            if (expeditor.rb.FeatureToggles.isCommComposerChannel()) {
                if (nodeJson.id === "$form" || nodeJson.fieldType === "form") {
                    return "FORM";
                }

                return nodeJson.name || nodeJson.id;
            }
            return nodeJson.name || "FORM";
        },

        _getTreeJsonForNode: function(nodeJson, isAncestorRepeatable) {
            let resultNode;
            const icon = 'properties' in nodeJson && 'fd:icon' in nodeJson.properties ?
                nodeJson.properties['fd:icon'] : undefined;
            if (Granite.Toggles.isEnabled("FT_FORMS-14303")) {
                resultNode = {
                    id: nodeJson.id || nodeJson.name || "$form",
                    name: this._getExpEditorNodeName(nodeJson),
                    displayName: nodeJson.label && nodeJson.label.value ? nodeJson.label.value : nodeJson.name || "FORM",
                    type: this._getExpEditorDataType(nodeJson, isAncestorRepeatable),
                    status: nodeJson.properties?.['fd:rules']?.validationStatus || "none",
                    path : nodeJson.properties?.['fd:path'],
                    ...(this._getOptionsObject(nodeJson)),
                    fieldType : nodeJson.fieldType,
                    adaptiveFormVersion: nodeJson.adaptiveform,
                    isAncestorRepeatable: isAncestorRepeatable,
                    icon
                }
            } else {
                resultNode = {
                    id: nodeJson.id || nodeJson.name || "$form",
                    name: this._getExpEditorNodeName(nodeJson),
                    displayName: nodeJson.label && nodeJson.label.value ? nodeJson.label.value : nodeJson.name || "FORM",
                    type: this._getExpEditorDataType(nodeJson),
                    status: nodeJson.properties?.['fd:rules']?.validationStatus || "none",
                    path : nodeJson.properties?.['fd:path'],
                    ...(this._getOptionsObject(nodeJson)),
                    fieldType : nodeJson.fieldType,
                    adaptiveFormVersion: nodeJson.adaptiveform,
                    icon
                }
            }

            if (expeditor.rb.FeatureToggles.isCommComposerChannel()) {
                const dorContainer = nodeJson.properties?.["fd:dor"]?.dorContainer;
                resultNode.qualifiedName = dorContainer?.qualifiedName || nodeJson.id;
                resultNode.templateLock = dorContainer?.policies?.contentLock?.enabled || false;
            }
            if (Granite.Toggles.isEnabled("FT_FORMS-17789")) {
                resultNode.isDorEnabled = nodeJson.properties?.['fd:dor'] && nodeJson.properties?.['fd:dor']['dorType'] && nodeJson.properties?.['fd:dor']['dorType'] !== 'none'  || false;
            }
            return resultNode;
        },

        _isEmpty: function (obj) {
            return obj
                && Object.keys(obj).length === 0
                && Object.getPrototypeOf(obj) === Object.prototype
        },

        _getSchemaInfo(propJson) {
                // schema info is required for direct connector integrations
            propJson = (propJson && typeof propJson === 'object') ? propJson : {};
            var schemaInfo = {
                'schemaRef': propJson['schemaRef'] || "",
                'schemaType': propJson['schemaType'] || ""
            };
            return schemaInfo;
        }

    }
})();
