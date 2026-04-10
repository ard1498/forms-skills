/*******************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 * Copyright 2016 Adobe Systems Incorporated
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and are protected by all applicable intellectual property
 * laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 ******************************************************************************/

(function (guidelib, _) {

    var RuntimeUtil = guidelib.RuntimeUtil = {
        scopeCache : {},
        GrammarStr : JSON.stringify(guidelib.author.Grammar),
        SCRIPTS_NODE : "fd:scripts",
        RULES_NODE : "fd:rules",
        EVENTS_NODE : "fd:events",
        SECURE_EVENT_PROPERTY_MAPPING : {
            "Calculate" : "fd:calc",
            "Visibility" : "fd:visible",
            "Initialize" : "fd:init",
            "Click" : "fd:click",
            "Value Commit" : "fd:valueCommit",
            "Enabled" : "fd:enabled",
            "Validate" : "fd:validate",
            "Format"   : "fd:format",
            "Completion" : "fd:completion",
            "Summary" : "fd:summary",
            "Options" : "fd:options",
            "Navigation" : "fd:navigationChange",
            "Successful Submission" : "fd:submitSuccess",
            "Error in Submission" : "fd:submitError",
            "Saved successfully" : "fd:saveSuccess",
            "Error while saving the form" : "fd:saveError",

            // Communication Composer events
            "Layout Ready" : "fd:layoutReady",
            "Form Ready" : "fd:formReady",
            "Doc Ready" : "fd:docReady"
        },


        /**
         * The mapping is to specify the property name to be used to store the script for consumption by
         * runtime
         */
        EVENT_PROPERTY_MAPPING : {
            "Calculate" : "calcExp",
            "Visibility" : "visibleExp",
            "Initialize" : "initScript",
            "Click" : "clickExp",
            "Value Commit" : "valueCommitScript",
            "Enabled" : "enabledExp",
            "Validate" : "validateExp",
            "Format"   : "formatExp",
            "Completion" : "completionExp",
            "Summary" : "summaryExp",
            "Options" : "optionsExp",
            "Navigation" : "navigationChangeExp",
            "Successful Submission" : "submitSuccess",
            "Error in Submission" : "submitError",
            "Saved successfully" : "saveSuccess",
            "Error while saving the form" : "saveError",

            // Communication Composer events
            "Layout Ready" : "layoutReady",
            "Form Ready" : "formReady",
            "Doc Ready" : "docReady"
        },

        /**
         * converts old script properties into SCRIPTMODEL. Only used for migration of forms where JavaScript
         * was saved in JCR.
         * @param nodeProperties
         * @param id
         * @returns {{nodeName: string, items: *[]}}
         * @private
         */
        _scriptPropertiesToExpJson : function (nodeProperties, id) {
            var items = [];
            _.each(RuntimeUtil.EVENT_PROPERTY_MAPPING, function (eventPropertyName, eventName) {
                var scriptContent = nodeProperties[eventPropertyName];
                if (typeof scriptContent !== "undefined") {
                    var model = {
                        nodeName : "SCRIPTMODEL",
                        script : {
                            field : id,
                            event : eventName,
                            content : scriptContent
                        },
                        // marking it as old version
                        version : 0
                    };
                    items.push(model);
                }
            });
            if (items.length > 0) {
                return {
                    nodeName : "RULES",
                    items : items
                };
            }
        },

        /**
         * This function handles a unique case during migration
         * where for a given event a script object occurs before rule object
         * in which case all rules after first script object are converted to
         * script objects
         */
        _migrateSingleEventRulesAndScripts : function (rules, id) {
            var hasScriptAppeared = false;
            return rules.map(function (model) {
                if (hasScriptAppeared) {
                    if (model.nodeName != 'SCRIPTMODEL') {
                        return {
                            nodeName : 'SCRIPTMODEL',
                            script : {
                                field : id,
                                event : model.eventName,
                                content : model.script
                            }
                        };
                    } else {
                        return model;
                    }
                } else {
                    if (model.nodeName == 'SCRIPTMODEL') {
                        hasScriptAppeared = true;
                    }
                    return model;
                }
            });
        },

        /**
         * determines when migration is required
         * migration is required only if any of the legacy
         * properties are found
         */
        isMigrationRequired : function (nodeProperties) {
            var legacyProperties = RuntimeUtil.EVENT_PROPERTY_MAPPING;
            var isAnyScriptPropertyPresent = _.some(Object.keys(legacyProperties), function (key) {
                return typeof(nodeProperties[legacyProperties[key]]) != "undefined";
            });
            return isAnyScriptPropertyPresent || typeof(nodeProperties.expJson) != "undefined" ;
        },

        /**
         *  Given rules and scripts grouped by events
         *  separates rules and script
         */
        _splitRulesAndScripts : function (rulesAndScripts) {

            var obj = {};

            obj[RuntimeUtil.RULES_NODE] = _.mapValues(rulesAndScripts, function (models) {
                return models.filter(function (model) {
                    return model.nodeName != 'SCRIPTMODEL';
                });
            });

            obj[RuntimeUtil.SCRIPTS_NODE] = _.mapValues(rulesAndScripts, function (models) {
                return models.filter(function (model) {
                    return model.nodeName == 'SCRIPTMODEL';
                });
            });

            return obj;

        },
        /**
         * takes an array of rule json models and
         * groups them by events
         * input : [
         *     {nodeName:'ROOT',eventName:'Calculate', items:...},
         *     {nodeName:'SCRIPTMODEL',script:{event:'Value Commit',content:"..."}},
         *     {nodeName:'ROOT',eventName:'Value Commit', items:...}
         * ]
         * output:
         * {
         *    calc:[{nodeName:'ROOT',eventName:'Calculate', items:...}]
         *    valueCommit:[{nodeName:'SCRIPTMODEL',script:{event:'Value Commit',content:"..."}},
         *    {nodeName:'ROOT',eventName:'Value Commit', items:...}]
         * }
         */
        _groupModelsByEvents : function (modelsJson) {
            return _.groupBy(modelsJson, function (modelJson) {
                var eventName = modelJson.nodeName == 'SCRIPTMODEL' ? modelJson.script.event : modelJson.eventName;
                var event = RuntimeUtil.SECURE_EVENT_PROPERTY_MAPPING[eventName];
                if (event) {
                    return event;
                }
                if (eventName && eventName.startsWith('custom:')) {
                    event = eventName.replace('custom:', 'fd:');
                }
                return event;
            });
        },
        /**
         *  Returns true if for any event a visual rule is found after script
         *  Called from server
         */
        hasOrderConflict : function (nodeProperties) {
            var expJson = nodeProperties.expJson;
            if (!expJson) { // with no expJson we cannot have an order conflict
                return false;
            }
            var expJsonObj = null;
            try {
                expJsonObj = JSON.parse(expJson);
            } catch (error) {
                console.error("Error while parsing expJson");
                return false;
            }
            var rules = expJsonObj.items || [];
            var modelsByEvents = RuntimeUtil._groupModelsByEvents(rules);
            var orderConflictFound = _.some(_.values(modelsByEvents), function (rulesForAnEvent) {
                var hasScriptAppeared = false;
                var conflict = false;
                _.each(rulesForAnEvent, function (model) {
                    if (model.nodeName == 'SCRIPTMODEL') {
                        hasScriptAppeared = true;
                    } else if (hasScriptAppeared) {
                        conflict = true;
                    }
                });
                return conflict;
            });

            return orderConflictFound;
        },
        /**
         * Can be called from server to migrate component to new format
         */
        migrateComponent : function (nodeProperties, id) {
            var expJson = nodeProperties.expJson;
            if (!expJson) {
                expJson = RuntimeUtil._scriptPropertiesToExpJson(nodeProperties, id);
            } else {
                expJson = JSON.parse(expJson);
            }
            var modelsByEvents = RuntimeUtil._groupModelsByEvents(expJson.items);
            var migratedModels = _.mapValues(modelsByEvents, function (models) {
                return RuntimeUtil._migrateSingleEventRulesAndScripts(models, id);
            });
            var rulesAndScripts = RuntimeUtil._splitRulesAndScripts(migratedModels);
            return RuntimeUtil._stringifyEachModel(rulesAndScripts);
        },

        /**
         * Extract out the values of the rules object and creates a big array containing all of them. Equivalent of
         * `Object.values(rules).flatten` But we cannot do that since it is not supported in JavaScript
         * @param rules
         * @returns {*[]}
         * @private
         */
        _mergeGroupedValues : function (rules) {
            var events = Object.keys(rules);
            var allRules = events.map(function (e) {
                return rules[e];
            });
            return [].concat.apply([], allRules);
        },
        _stringifyEachModel : function (rulesAndScript) {
            return _.mapValues(rulesAndScript, function (rulesOrScripts) {
                return _.mapValues(rulesOrScripts, function (models) {
                    models = _.isArray(models) ? models : [];
                    return models.map(function (model) {
                        return JSON.stringify(model);
                    });
                });
            });
        },
        /**
         * parses each element in the array to JSON.
         * @param models
         * @returns {*}
         * @private
         */
        _parseEachModel : function (models) {
            return models.map(function (model) {
                if (typeof model === "string") {
                    return JSON.parse(model);
                }
                return model;
            });
        },

        _getExpJson : function (rules, scripts, props) {
            var validKeys = _.values(RuntimeUtil.SECURE_EVENT_PROPERTY_MAPPING);
            var rules = _.pickBy(rules || {}, function(value, key) {
                return validKeys.indexOf(key) !== -1 || key.startsWith('fd:');
            });
            var scripts = _.pickBy(scripts || {}, function(value, key) {
                return validKeys.indexOf(key) !== -1 || key.startsWith('fd:');
            });
            if (Object.keys(rules).length > 0 || Object.keys(scripts).length > 0) {
                var mergedRules = RuntimeUtil._mergeGroupedValues(rules);
                mergedRules = RuntimeUtil._parseEachModel(mergedRules);
                // filter rules and scripts and discard any script objects
                var filteredRules = mergedRules.filter(function (model) {
                    return model.nodeName != 'SCRIPTMODEL';
                });
                var mergedScripts = RuntimeUtil._mergeGroupedValues(scripts);
                mergedScripts = RuntimeUtil._parseEachModel(mergedScripts);

                var allRulesAndScripts = filteredRules.concat(mergedScripts);
                return {
                    nodeName : "RULES",
                    items : allRulesAndScripts
                };

            } else {
                //converting scripts and rules saved directly as javascript in JCR
                var items = [];
                if (!_.isUndefined(props)) {
                    _.each(RuntimeUtil.EVENT_PROPERTY_MAPPING, function (eventPropertyName, eventName) {
                        var scriptContent = props[eventPropertyName];
                        if (typeof scriptContent !== "undefined") {
                            var model = {
                                nodeName : "SCRIPTMODEL",
                                script : {
                                    event : eventName,
                                    content : scriptContent
                                },
                                // marking it as old version
                                version : 0
                            };
                            items.push(model);
                        }
                    });
                }

                return {
                    nodeName : "RULES",
                    items : items
                };
            }
        },

        prepareContext : function (fieldData, treeJson, path, guideNodeClass, formPath) {
            if (typeof treeJson == "string") {
                treeJson = JSON.parse(treeJson);
            }
            treeJson.items = [treeJson.rootPanel];
            treeJson.rootPanel = null;
            var element = this._getElement(path, treeJson);
            var options = {
                completionExpReq : fieldData.completionExpReq,
                summaryExpVisible : fieldData.summaryExpVisible === 'yes',
                elementType : element && element.type ? element.type.split("|") : []
            };
            var eventsAndExpressions = this._getEventsAndExpressionList(guideNodeClass, options);
            var config = this.createConfig(eventsAndExpressions, treeJson, path);
            var rbScope = RuntimeUtil.scopeCache[formPath] = (RuntimeUtil.scopeCache[formPath] || this.createScope(treeJson, guidelib.author.TypesConfig));
            var eeContext = new expeditor.ExpEditorContext(config, null, {});
            eeContext.setScope(rbScope);

            return eeContext;
        },

        /**
         * converts fd:rules and fd:scripts into JavaScript to be consumed by browser at server.
         * Only evaluated on server using Rhino
         * @param eeContext
         * @param rules
         * @param scripts
         * @param transformer
         * @param bJsonFormula
         * @returns {{}}
         */
        getScripts : function (eeContext, rules, scripts, transformer, bJsonFormula) {
            var expJson = RuntimeUtil._getExpJson(rules, scripts, true);
            transformer.setContext(eeContext);

            var listModel = new expeditor.model.ListModel('RULES', eeContext);
            listModel = listModel.fromJson(expJson);

            var merger = bJsonFormula === true ? guidelib.author.AFJSONFormulaMerger : guidelib.author.scriptMerger;

            var mergedScripts = merger.mergeScript(expeditor.Utils.listModelToScript(listModel, transformer));
            var events = mergedScripts[Object.keys(mergedScripts)[0]];

            var properties = {};
            _.each(events, function (script, evntName) {
                properties[guidelib.RuntimeUtil.EVENT_PROPERTY_MAPPING[evntName]] = script.content.toString();
            });
            return properties;
        },

        /**
         * Sets the enabled FTs for runtime
         * @param enabledFT comma separated list of enabled FTs, to be used in runtime. Granite.Toggles.enabledToggle is hardcoded and loaded in StaticScriptsManager in cq-guides
         */
        enableFeatureToggles : function (enabledFT) {
            try {
                if(enabledFT !== undefined && enabledFT !== null){
                    var enabledFTs = enabledFT.split(",");
                    for (var i = 0; i < enabledFTs.length; i++) {
                        window.Granite.Toggles.enableToggle(enabledFTs[i]);
                    }
                }
            } catch(err) {
                console.error("Error while processing enabledFT: "+JSON.stringify(enabledFT)+", Error: "+JSON.stringify(err));
            }
        },

        /**
         * Converts Adaptive Form Rules To Scripts/JSON Formula Expression
         * @param fieldData {completionExpReq: boolean, summaryExpVisible: enum("yes", "no")}
         * @param treeJson
         * @param path
         * @param guideNodeClass
         * @param rules
         * @param scripts
         * @param formPath
         * @param bindRefToAFNameMap
         * @param bJsonFormula whether to generate json formula or javascript
         * @returns {{}}
         */
        jsonToScripts : function (fieldData,
                                  treeJson,
                                  path,
                                  guideNodeClass,
                                  rules,
                                  scripts,
                                  formPath,
                                  bindRefToAFNameMap,
                                  bJsonFormula) {
            guidelib.RuntimeUtil.bindRefToAFNameMap = bindRefToAFNameMap;
            var eeContext = this.prepareContext(fieldData, treeJson, path, guideNodeClass, formPath);
            bJsonFormula = bJsonFormula || false
            var transformer = bJsonFormula ? new guidelib.author.AFJSONFormulaTransformer() :
                new guidelib.author.AFTransformer();
            return this.getScripts(eeContext, rules, scripts, transformer, bJsonFormula);
        },

        createScope : function (treeJson, typesConfig) {
            var rbScope = new expeditor.rb.RBScope({
                varStorage : "guidelib.author.TrieStorage"
            });
            var treeProcessor = new expeditor.TreeProcessor(treeJson);
            var flatModel = treeProcessor.getFlatModel();
            rbScope.addVars(flatModel);
            rbScope.addTypes(typesConfig || {});
            return rbScope;
        },

        removeFormRelatedActionsFromExpEditor : function () {
            var grammar = JSON.parse(RuntimeUtil.GrammarStr);
            // we don't support form related actions in web channel as part of block statement
            grammar.BLOCK_STATEMENT.rule = grammar.BLOCK_STATEMENT.rule.replace("SAVE_FORM | SUBMIT_FORM | RESET_FORM | VALIDATE_FORM |", "");
            grammar.BLOCK_STATEMENT.rule = grammar.BLOCK_STATEMENT.rule.replace("SET_VALUE_STATEMENT |", "");
            grammar.BLOCK_STATEMENT.rule = grammar.BLOCK_STATEMENT.rule.replace("CLEAR_VALUE_STATEMENT |", "");
            // store the new grammar
            RuntimeUtil.GrammarStr = JSON.stringify(grammar);
        },

        createConfig : function (eventsAndExpressions, treeJson, path, isV2, grammar) {
            var _isV2 = isV2 === true;
            var grammarString = grammar;
            if (!grammarString) {
                grammarString = _isV2 ? JSON.stringify(guidelib.author.Grammar_v2) :
                    RuntimeUtil.GrammarStr;
            }
            var configurator = new expeditor.rb.RuleBuilderConfigurator()


            var operators = configurator.getDefaultOperators()
            if (_isV2) {
                operators.push('CONCAT')
            }
            var configBuilder = configurator.addGrammar(grammarString)
                .addStatement(eventsAndExpressions.statements)
                .addChoice("EVENT_AND_COMPARISON_OPERATOR", eventsAndExpressions.events)
                .enableOperator(operators)
                .addChangeListener('ROOT', 'guidelib.author.ExpressionEditorUtil.eventChangeListener')
                .addChangeListener('EVENT_SCRIPTS', 'guidelib.author.ExpressionEditorUtil.eventChangeListener')
                .addChangeListener('TRIGGER_EVENT_SCRIPTS', 'guidelib.author.ExpressionEditorUtil.eventChangeListener')
            //configBuilder = configBuilder.addChoice("BLOCK_STATEMENT", "DISPATCH_EVENT")

            if (!expeditor.rb.FeatureToggles.isCommComposerChannel()) {
                configBuilder = configBuilder.addChoice("EVENT_AND_COMPARISON_OPERATOR", eventsAndExpressions.events);
                configBuilder = configBuilder.addChoice("EXPRESSION", "WSDL_VALUE_EXPRESSION");
                configBuilder = configBuilder.addChoice("BLOCK_STATEMENT", "DISPATCH_EVENT");
            }

            var config = configBuilder.getConfig();
            eventsAndExpressions.expressions = ["EVENT_AND_COMPARISON"];

            if(expeditor.rb.FeatureToggles.isCommComposerChannel()) {
                eventsAndExpressions.expressions.push("SINGLE_TRIGGER_SCRIPTS");
            }

            if (Granite.Toggles.isEnabled('FT_FORMS-19582')) {
                eventsAndExpressions.expressions.push("EVENT_AND_COMPARISON_LEFT_HAND_EXPRESSION");
            }
            /*
                ideally, element will never be null but some customer forms have components
                at wrong place e.g. under layout node, adding default value to avoid NPE
                see CQ-4209436
            */
            var element = this._getElement(path, treeJson) || {
                id : "",
                type : "",
                name : ""
            }
            if (_isV2 && !expeditor.rb.FeatureToggles.isCommComposerChannel()) {
                config =  guidelib.author.ConfigUpdater.updateGrammar(config, treeJson.adaptiveFormVersion);
            }
            else if(expeditor.rb.FeatureToggles.isCommComposerChannel()){
                config = guidelib.author.ConfigUpdater.updateGrammarForCommComposer(config);
            }
            config = guidelib.author.ConfigUpdater.appendCurrentFieldJsonInExpressionGrammar(element,
                eventsAndExpressions,
                config, _isV2);
            return config;
        },
        /**
         * Returns the element with the given path in the JSON
         * @param path
         * @param json
         * @returns {*}
         * @private
         */
        _getElement : function (path, json) {
            if (json.path == path) {
                return json;
            }
            if (json.items) {
                var returnJson = null;
                _.find(json.items, function (item, index) {
                    returnJson = RuntimeUtil._getElement(path, item);
                    return returnJson != null;
                });
                if (returnJson) {
                    return returnJson;
                }
            }
            if (json.toolbar) {
                return RuntimeUtil._getElement(path, json.toolbar);
            }
        },

        /**
         * Return event list from an editable. Currently it is hard coded, but would have been best to get it from
         * server. Need to figure out a way for doing that.
         * @param guideNodeClass
         * @param options
         * @private
         */
        _getEventsAndExpressionList : function (guideNodeClass, options, isV2) {
            if(isV2 && expeditor.rb.FeatureToggles.isCommComposerChannel()) {
                return guidelib.author.ExpressionList.commComposer(guideNodeClass, options);
            }
            return isV2 === true ? guidelib.author.ExpressionList.v2(guideNodeClass, options) :
                guidelib.author.ExpressionList.v1(guideNodeClass, options)
        },
        /*
         * Fixes SOM Expression by correctly putting indices (0) where not present.
         *
         */
        _fixSomExpression : function (som) {
            if (typeof som === "string") {
                if (som.length === 0) {
                    return som;
                }
                return som.replace(/\.|$/g, function (match, offset, str) {
                    var prevCharacter = str[offset - 1];
                    if (prevCharacter !== "]" && prevCharacter !== "\\") {
                        return "[0]" + match;
                    }
                    return match;
                });

            }
            return som;
        },

        _removeIndexFromSom : function (som) {
            if (typeof som === "string") {
                return som.replace(/\[[0-9]+\]/g, "");
            }
            return som;
        },

        getRelativeName : function (id, relativeTo, scope) {
            if (id === relativeTo) {
                return "this";
            }
            if (id.indexOf(".") === -1) {
                // case it is guide, otherwise this case will never occur
                return this._getRuntimeId(id);
            }
            if (scope !== null) {
                var def = scope.findVarById(id);
                if (def === null) {
                    return this._getRuntimeId(id);
                } else {
                    if (def.foundId !== id) {
                        id = def.foundId;
                    }
                }
                id = scope.findUniqueVarId(id);
            }
            // if id contains an index like [1] or [10], remove them
            if (id.match(/\[[1-9][0-9]*\]/)) {
                id = this._fixSomExpression(id);
                if (console) {
                    console.warn("Same named siblings are not supported");
                }
                var id1 = this._removeIndexFromSom(id);
                // this is not supported, but if it happens we need to add zeros
                return this._getRuntimeId(id1);
            } else if (scope === null) {
                // it should never happen though
                var currentFieldIdArray = relativeTo.split("."),
                    bMisMatch = false,
                    shortName = id.split(".").filter(function (item, index) {
                        var bMisMatchId = bMisMatch || (bMisMatch = currentFieldIdArray[index] !== item);
                        return bMisMatchId;
                    }).join(".");
                if (shortName.length === 0) {
                    id = id.substring(id.lastIndexOf(".") + 1);
                }
            }
            return this._getRuntimeId(id);
        },

        /**
         * As JS doesn't understand variable with hyphen in it. So, encapsulating it to an resolveNode.
         * ResolveNode takes this relative name as input and returns relevant forms component.
         * @param id
         * @returns id Id in resolve
         * @private
         */
        _getRuntimeId : function (id) {
            if (id.indexOf("-") > -1) {
                id = "guideBridge.resolveNode(\"" + id + "\")";
            }
            return id;
        },

        isValueCommit : function (condition) {
            if (expeditor.Utils.getOrElse(condition, "choiceModel.nodeName", null) == "EVENT_AND_COMPARISON") {
                var event_and_comparison = condition.choiceModel;
                if (event_and_comparison) {
                    var operatorModel = event_and_comparison.items[1];
                    var operator = expeditor.Utils.getOrElse(operatorModel, 'choiceModel.nodeName', null);
                    if (operator && guidelib.RuntimeUtil.eventToEventName.hasOwnProperty(operator)) {
                        return false;
                    }
                }
            }
            return true;
        },

        /* Checks if the condition is only an event. */
        isConditionOnlyAnEvent : function (condition) {
            if (expeditor.Utils.getOrElse(condition, "choiceModel.nodeName", null) == "EVENT_AND_COMPARISON") {
                var event_and_comparison = condition.choiceModel;
                if (event_and_comparison) {
                    var operatorModel = event_and_comparison.items[1];
                    var operator = expeditor.Utils.getOrElse(operatorModel, 'choiceModel.nodeName', null);
                    if (operator && guidelib.RuntimeUtil.eventToEventName.hasOwnProperty(operator)) {
                        return true;
                    }
                }
            }
            return false;
        },

        /* Returns the event if any is present in condition model. Returns null otherwise */
        getEventFromCondition : function (conditionModel) {
            if (expeditor.Utils.getOrElse(conditionModel, "nodeName", null) != "EVENT_CONDITION") {
                return null;
            }
            if (expeditor.Utils.getOrElse(conditionModel, "choiceModel.nodeName", null) == "EVENT_AND_COMPARISON") {
                var event_and_comparison = conditionModel.choiceModel;
                if (event_and_comparison) {
                    var operatorModel = event_and_comparison.items[1];
                    var operator = expeditor.Utils.getOrElse(operatorModel, 'choiceModel.nodeName', null);
                    if (RuntimeUtil.eventToEventName.hasOwnProperty(operator)) {
                        return operator;
                    }
                    return null;
                }
            } else if (expeditor.Utils.getOrElse(conditionModel, "choiceModel.nodeName", null) == "BINARY_EVENT_CONDITION") {
                var binaryEventCondition = expeditor.Utils.getOrElse(conditionModel, "choiceModel", null);
                if (binaryEventCondition) {
                    var condition1Event = this.getEventFromCondition(binaryEventCondition.items[0]);
                    var condition2Event = this.getEventFromCondition(binaryEventCondition.items[2]);
                    return condition1Event || condition2Event;
                }
            }
        },

        setCurrentEventField : function (model) {
            if (expeditor.Utils.getOrElse(model, "choiceModel.nodeName", null) == "BINARY_EVENT_CONDITION") {
                var binaryEventCondition = expeditor.Utils.getOrElse(model, "choiceModel", null);
                if (binaryEventCondition) {
                    if (expeditor.Utils.getOrElse(binaryEventCondition.items[0], "choiceModel.nodeName", null) == "EVENT_AND_COMPARISON") {
                        var eventAndComparison = expeditor.Utils.getOrElse(binaryEventCondition.items[0], "choiceModel", null);
                        if (eventAndComparison) {
                            if (Granite.Toggles.isEnabled('FT_FORMS-19582') && eventAndComparison.items[0].nodeName === 'EVENT_AND_COMPARISON_LEFT_HAND_EXPRESSION') {
                                return eventAndComparison.items[0].choiceModel.getValue().id;
                            } else if (eventAndComparison.items[0].nodeName === 'COMPONENT') {
                                return eventAndComparison.items[0].getValue().id;
                            }
                        }
                    }
                }
            }
            return null;
        },

        modifyRepeatablePanelFieldId : function (fieldId) {
            var openParenCount = 0;
            var foundParentheses = false;
            var balancedStartIndex = 0;
            var balancedLastIndex = -1;

            for (var i = fieldId.length - 1; i >= 0; i--) {
                if (fieldId[i] === ']') {
                    foundParentheses = true;
                    openParenCount++;
                    balancedLastIndex = balancedLastIndex === -1 ? i : balancedLastIndex;
                } else if (fieldId[i] === '[') {
                    openParenCount--;
                }

                // If counts are equal, we found last balanced pair of parentheses
                if (openParenCount === 0 && foundParentheses) {
                    balancedStartIndex = i+1;
                    break;
                }
            }

            var stringToReplace = fieldId.substring(balancedStartIndex, balancedLastIndex);

            if (foundParentheses) {
                fieldId = fieldId.replace(stringToReplace, '*');
            }

            return fieldId;
        },

        /**
         * escapes the scriptContent and encloses it an eval. Returns the final string
         * @param scriptContent scriptContent to escape and put inside eval
         * @returns {string} returns the scriptContent embedded inside eval
         */
        putScriptContentInEval : function (scriptContent) {
            return 'eval("' + scriptContent.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")
                .replace(/\r/g, "\\r").replace(/\n/g, "\\n") + '")';
        },

        eventToEventName : {
            "is initialized" : "Initialize",
            "is clicked" : "Click",
            "is changed" : "Value Commit",
            "is submitted successfully" : "Successful Submission",
            "submission fails" : "Error in Submission",
            "is saved successfully" : "Saved successfully",
            "fails to save" : "Error while saving the form"
            // "is layout ready" : "Layout Ready",
            // "is form ready" : "Form Ready",
            // "is doc ready" : "Doc Ready"
        },

        DEFAULT_EVENT : "is changed",

        SCRIPT_INDENT : "    "

    };
})(guidelib, fd._);
