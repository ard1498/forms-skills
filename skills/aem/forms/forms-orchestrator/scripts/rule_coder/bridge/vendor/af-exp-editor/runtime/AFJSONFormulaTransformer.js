/*************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 *  Copyright 2022 Adobe Systems Incorporated
 *  All Rights Reserved.
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
 **************************************************************************/
(function ($, _) {
    var RuntimeUtil = guidelib.RuntimeUtil,
        RETRY_REQUEST_HANDLER_FT = 'FT_FORMS-19810';
        customTransformer = guidelib.author.AFJSONFormulaTransformer = expeditor.rb.ToJsonFormulaTransformer.extend({
            reset : function () {
                this.script = "";
                this.currentEvent = {
                    name : null,
                    field : null,
                    model : null,
                    otherEvents: null
                };
                this.blockStatements = {}
                this.stringConcatenation = false;
            },

            setEvent(event) {
                this.currentEvent = event;
            },

            writeTab : function () {
                this.write(RuntimeUtil.SCRIPT_INDENT);
            },

            _getRelativeName : function (fieldToCheck, currentField) {
                var relativeName;

                if (fieldToCheck === currentField) {
                    return '$field'
                } else {
                    var parentOfField = fieldToCheck.split(".").slice(0, -1).join(".")
                    if (parentOfField.startsWith(currentField)) {
                        // current field is a parent/ancestor of the field, it will be in the context
                        // todo: check for sibling having same name as child
                        relativeName = fieldToCheck.substring(currentField.length + 1);
                    } else {
                        var parentOfCurrentField = currentField.split(".").slice(0, -1).join(".");
                        if (parentOfCurrentField === parentOfField) {
                            relativeName = fieldToCheck.split(".").slice(-1)[0];
                        } else {
                            relativeName = fieldToCheck; //.replace(/^guide/, "$form")
                        }
                    }
                }

                return relativeName;
            },

            enterSTATEMENT : function (model) {
                this.currentEvent.model = {
                    nodeName : model.choiceModel.nodeName
                };
            },

            exitSTATEMENT : function (model) {

            },

            enterSCRIPTMODEL : function (model) {
                this.reset();
                this.newScript();
                if (model.script) {
                    this.currentEvent.field = model.script.field;
                    this.currentEvent.name = model.script.event;
                    this.currentEvent.model = {
                        nodeName : model.nodeName,
                        version : model.version
                    };
                    this.script = model.script.content;
                }
            },

            enterEVENT_SCRIPTS : function (model) {
                var condition = model.items[0];
                var conditionEvent = RuntimeUtil.getEventFromCondition(condition) || RuntimeUtil.DEFAULT_EVENT;
                var field = RuntimeUtil.setCurrentEventField(condition);
                if (field) {
                    this.currentEvent.field = field;
                }
                this.currentEvent.name = RuntimeUtil.eventToEventName[conditionEvent];
                if (!RuntimeUtil.isConditionOnlyAnEvent(condition)) {
                    this.currentEvent.hasCondition  = true;
                    condition.accept(this)
                    this.currentEvent.condition = this.script;
                    model.items[2].accept(this)

                    if (model.items.length > 4) {
                        var previousIfConditionStatement = this.script;
                        this.currentEvent.condition = '!('+this.currentEvent.condition+')';
                        model.items[4].accept(this);

                        const mergedScript = [];
                        for (var i = 0; i < previousIfConditionStatement.length; i++) {
                            mergedScript.push(previousIfConditionStatement[i]);
                        }
                        for (var i = 0; i < this.script.length; i++) {
                            mergedScript.push(this.script[i]);
                        }
                        this.script = mergedScript;
                    }
                    return true;
                } else {
                    this.currentEvent.hasCondition = false;
                }
            },
            enterEVENT_AND_COMPARISON : function (model) {
                if (!this.currentEvent.field) {
                    var field;
                    if (Granite.Toggles.isEnabled('FT_FORMS-19582') && model.items[0].nodeName === "EVENT_AND_COMPARISON_LEFT_HAND_EXPRESSION") {
                        field = model.items[0].choiceModel.getValue().id;
                    } else {
                        field = model.items[0].getValue().id;
                    }
                    this.currentEvent.field = field;
                }
                if (this.currentEvent.hasCondition) {
                    return this.enterCOMPARISON_EXPRESSION(model);
                }
                return false;
            },

            enterBINARY_EVENT_CONDITION : function (model) {
                this.write("(");
            },

            exitBINARY_EVENT_CONDITION : function (model) {
                this.write(")");
            },

            /**
             * Returns the transformed script(s) having the following signature
             * {
             *   field : <field name>,
             *   event : <event name>,
             *   content : <transformed script content>
             * }
             * @returns {{field: null, event: null, model: null, content: string}}
             */
            getScript : function () {
                return {
                    field : this.currentEvent.field,
                    event : this.currentEvent.name,
                    model : this.currentEvent.model,
                    content : this.script,
                    otherEvents : this.currentEvent.otherEvents
                };
            },

            _findEventFromEventName : function(eventName) {
                for (var key in RuntimeUtil.eventToEventName) {
                    if (RuntimeUtil.eventToEventName[key] === eventName) {
                        return key;
                    }
                }
                if (eventName && eventName.startsWith('custom:')) {
                    return eventName;
                }
                return null;
            },

            enterCOMPONENT : function (model) {
                var val = model.getValue();
                var addValueOperator = true;
                if (val) {
                    var fieldName,
                        fieldId = val.id;
                    var metadata = val.metadata;
                    if (!_.isUndefined(metadata) && metadata.source === "fdm") {
                        var bindRef = "/" + fieldId.replace(/\./g, '/');
                        if (!_.isNull(RuntimeUtil.bindRefToAFNameMap)) {
                            fieldName = RuntimeUtil.bindRefToAFNameMap[bindRef];
                        }
                        //If FDM field is AF bound
                        if (!_.isUndefined(fieldName)) {
                            var shortName = this._getRelativeName(fieldName, this.currentEvent.field);
                            this.write(shortName);
                        } else {
                            this.write("guidelib.util.GuideUtil.getValueForBindRefField(\"" + bindRef + "\")");
                        }
                    } else {
                        var shortName = this._getRelativeName(fieldId, this.currentEvent.field);
                        // As click and initialize events are allowed in binary condition, so set first condition to true
                        var eventName = this.currentEvent.name;
                        if ((Granite.Toggles.isEnabled('FT_FORMS-17090') || Granite.Toggles.isEnabled('FT_FORMS-21266')) && eventName !== 'Value Commit' && this._findEventFromEventName(eventName) && this.currentEvent.field === fieldId && val.metadata && val.metadata.isFirstField) {
                            this.write("true()");
                            // In case of click and initialize, for first field true() will be added and $value should be avoided
                            addValueOperator = false;
                        } else {
                            this.write(shortName);
                        }
                        if (expeditor.Utils.isPrimitive(val.type) && addValueOperator) {
                            this.write(".$value");
                        }
                    }
                }
            },

            enterVALUE_FIELD : function (model) {
                var val = this._getComponentName(model);
                if (val != null) {
                    this.write(val);
                }
            },

            _getComponentName : function (model) {
                var val = model.getValue();
                if (val) {
                    return this._getRelativeName(val.id, this.currentEvent.field);
                }
                return null;
            },

            enterAFCOMPONENT : function (model) {
                var val = this._getComponentName(model);
                if (val != null) {
                    this.write(val);
                }
            },

            enterPANEL : function (model) {
                var val = this._getComponentName(model);
                if (val != null) {
                    this.write(val);
                }
            },

            enterTOOLBAR_BUTTON : function (model) {
                var val = model.getValue();
                if (val) {
                    var shortName = this._getRelativeName(val.id, this.currentEvent.field);
                    this.write(shortName);
                }
            },

            enterEVENT : function (model) {
                var event = model.choiceModel.nodeName;
                if (event === "is clicked") {
                    this.currentEvent.name = "Click";
                } else {
                    this.currentEvent.name = "Initialize";
                }
            },

            _exitBlockStatementsTransformer : function (model) {
                var _self = this;
                function withCondition(str) {
                    var result;
                    if (_self.currentEvent.condition) {
                        if(typeof str === 'string') {
                            result = "if(" + _self.currentEvent.condition + ", " + str + ", {})";
                        } else {
                            result = str.map(function (statement) {
                                return "if(" + _self.currentEvent.condition + ", " + statement + ", {})";
                            });
                        }
                    } else {
                        result = str;
                    }
                    return typeof result === 'string' ? [result] : result;
                }

                if (Granite.Toggles.isEnabled("FT_FORMS-21359")) {
                    // Process constraint messages - merge multiple constraintMessage entries into arrays
                    Object.keys(this.blockStatements).forEach(function(fieldName) {
                        var props = _self.blockStatements[fieldName];
                        var constraintMessages = [];
                        var otherProps = [];
                        
                        // Separate constraint messages from other properties
                        props.forEach(function(prop) {
                            if (typeof prop === 'string' && prop.startsWith('constraintMessage :')) {
                                // Extract the constraint object part
                                var constraintPart = prop.substring(prop.indexOf('{'));
                                constraintMessages.push(constraintPart);
                            } else {
                                otherProps.push(prop);
                            }
                        });
                        
                        // If we have constraint messages, merge them into a single array
                        if (constraintMessages.length > 0) {
                            var constraintArray = "constraintMessage : [" + constraintMessages.join(", ") + "]";
                            otherProps.push(constraintArray);
                        }
                        
                        _self.blockStatements[fieldName] = otherProps;
                    });
                }

                this.script = Object.entries(this.blockStatements).flatMap(function (arg) {
                    var fieldName = arg[0];
                    var props = arg[1];
                    var updates =  "{" + props.join(", ") + "}"
                    if (fieldName === "$field") {
                        return withCondition(updates)
                    } else if (fieldName === "$GLOBAL") {
                        return withCondition(props)
                    } else {
                        return withCondition("dispatchEvent(" + fieldName + ", 'custom:setProperty', " + updates + ")")
                    }
                });
                return true;
            },

            enterBLOCK_STATEMENTS : function (model) {
                if (this.currentEvent.hasCondition) {
                    this.blockStatements = {}
                }
            },

            exitBLOCK_STATEMENTS : function (model) {
                return this._exitBlockStatementsTransformer(model);
            },

            enterWSDL_BLOCK_STATEMENTS : function (model) {
                if (this.currentEvent.hasCondition) {
                    this.blockStatements = {}
                }
            },

            exitWSDL_BLOCK_STATEMENTS : function (model) {
                return this._exitBlockStatementsTransformer(model);
            },

            _setProperty : function (model, update) {
                var fieldName = typeof model === 'string' ? model : this._getComponentName(model)
                if (fieldName) {
                    this.blockStatements[fieldName] = this.blockStatements[fieldName] || [];
                    this.blockStatements[fieldName].push(update)
                }
                return true;
            },

            enterHIDE_STATEMENT : function (model) {
                return this._setProperty(model.items[0], "visible : false()")
            },

            enterSHOW_STATEMENT : function (model) {
                return this._setProperty(model.items[0], "visible : true()")
            },

            enterENABLE_STATEMENT : function (model) {
                return this._setProperty(model.items[0], "enabled : true()")
            },

            enterDISABLE_STATEMENT : function (model) {
                return this._setProperty(model.items[0], "enabled : false()")
            },

            _writeCondition : function (model, statementFn) {
                var always = model == null;
                if (!always) {
                    this.write("if (");
                    model.accept(this);
                    this.writeLn(") {");
                }
                if (typeof statementFn === 'function') {
                    statementFn.call();
                }
                if (!always) {
                    this.writeLn("");
                    this.writeLn("}");
                }
            },

            /**
             * Write a If Else Condition with condition being the conditionModel and value being the code inside the
             * if block. If value is instance of Model, that will be transformed into a script otherwise the value
             * will be written as string
             * @param conditionModel condition for the if block
             * @param value {String|BaseModel}
             * @param elseModel {String}
             * @member AFTransformer
             * @private
             */
            _writeIfElseCondition : function (conditionModel, value, elseModel) {
                var always =  conditionModel.choiceModel === null;
                if (!always) {
                    this.write("if(");
                    conditionModel.accept(this);
                    this.write(',')
                }
                if (typeof value === "string") {
                    this.write(value);
                } else if (value instanceof expeditor.model.BaseModel) {
                    value.accept(this);
                }
                if (!always) {
                    if (typeof elseModel === "string") {
                        this.write(",");
                        this.write(elseModel);
                    }
                    this.write(")");
                }
            },

            enterCALC_EXPRESSION : function (model) {
                this.currentEvent.field = model.items[0].getValue().id;
                this.currentEvent.name = "Calculate";
                this._writeIfElseCondition(model.items[4], model.items[2], '$field')
                return true;
            },

            enterCLEAR_EXPRESSION : function (model) {
                this.currentEvent.field = model.items[0].getValue().id;
                this.currentEvent.name = "Calculate";
                this._writeIfElseCondition(model.items[2], 'null()', '$field')
                return true;
            },

            enterVALUE_COMMIT_EXPRESSION : function (model) {
                this.currentEvent.field = model.items[0].getValue().id;
                this.currentEvent.name = "Value Commit";
                this.write("if (");
                this.write("this.value");
                model.items[1].choiceModel.accept(this);
                model.items[2].choiceModel.accept(this);
                this.writeLn(") {");
                model.items[4].accept(this);
                this.writeLn("");
                this.writeLn("}");
                return true;
            },

            enterSUMMARY_EXPRESSION : function (model) {
                this.currentEvent.field = model.items[0].getValue().id;
                this.currentEvent.name = "Summary";
                var self = this;
                this._writeCondition(model.items[4].choiceModel, function () {
                    model.items[2].accept(self);
                });
                return true;
            },

            enterEXPRESSION : function (model) {
                this.needsValue = true;
            },

            exitEXPRESSION : function (model) {
                this.needsValue = false;
            },

            enterSTRING_LITERAL : function (model) {
                if (model && model.getValue() !== null) {
                    return this._super.apply(this, arguments);
                }
            },

            enterEVENT_PAYLOAD : function (model) {
                if (model && model.getValue()) {
                    var key = model.getValue();
                    // when there is encryption on, we need to return payload only, body is only for WSDL request
                    if (this.ctx && this.ctx._apiIntegrationJson && this.ctx._apiIntegrationJson.encryptionRequired) {
                        this.write('toObject($event.payload)' + (key.startsWith("[*]") ? key : ("." + key)));
                    } else {
                        if (key === 'invokeServiceResponse.rawPayloadBody') {
                            this.write('toObject($event.payload).body');
                        } else {
                            this.write('toObject($event.payload.body)' + (key.startsWith("[*]") ? key : ("." + key)));
                        }
                    }
                }
            },

            enterNUMERIC_LITERAL : function (model) {
                return this._super.apply(this, arguments);
            },

            enterDATE_LITERAL : function (model) {
                return this._super.apply(this, arguments);
            },

            enterCONCAT : function (model) {
                this.write(' & ')
            },

            /**
             * This will enable to handle null values of the component.
             * Otherwise, null when used with string is casted to "null".
             * @param model
             * @returns {boolean}
             * @private
             */
            _isPlusOperator : function (model) {
                var operator = expeditor.Utils.getOrElse(model.get(1), "choiceModel.nodeName", null);
                return operator === 'PLUS';
            },

            enterCONDITIONORALWAYS : function (model) {
                if (!model.choiceModel) {
                    this.write("true");
                }
            },

            _handleBooleanProperty : function (model, retVal, toggle, event, property) {
                this.currentEvent.field = model.items[0].getValue().id;
                this.currentEvent.name = event;
                var conditionModel = model.items[2];
                if (toggle) {
                    var hasCondition =  conditionModel.choiceModel !== null;
                    if (hasCondition) {
                        if (retVal === "false()") {
                            this.write("!(")
                        }
                        conditionModel.accept(this);
                        if (retVal === "false()") {
                            this.write(")")
                        }
                    } else {
                        this.write(retVal)
                    }
                } else {
                    this._writeIfElseCondition(model.items[2], retVal, "$field.$" + property);
                }
                return true
            },

            enterVISIBLE_EXPRESSION : function (model) {
                return this._handleBooleanProperty(model, "false()",
                    model.items[4].choiceModel.nodeName === "Show", "Visibility", "visible")
            },

            enterSHOW_EXPRESSION : function (model) {
                return this._handleBooleanProperty(model, "true()",
                    model.items[4].choiceModel.nodeName === "Hide", "Visibility", "visible")
            },

            enterACCESS_EXPRESSION : function (model) {
                return this._handleBooleanProperty(model, "true()",
                    model.items[4].choiceModel.nodeName === "Disable", "Enabled", "enabled");
            },

            enterDISABLE_EXPRESSION : function (model) {
                return this._handleBooleanProperty(model, "false()",
                    model.items[4].choiceModel.nodeName === "Enable", "Enabled", "enabled");
            },

            enterVALIDATE_EXPRESSION : function (model) {
                this.currentEvent.field = model.items[0].getValue().id;
                this.currentEvent.name = "Validate";
                model.items[3].accept(this);
                return true;
            },

            enterFORMAT_EXPRESSION : function (model) {
                if(Granite.Toggles.isEnabled("FT_FORMS-13193")) {
                    this.currentEvent.field = model.items[0].getValue().id;
                    this.currentEvent.name = "Format";
                    model.items[3].accept(this);
                    return true;
                }
            },

            _handleHasSelected : function (model) {
                var operator = expeditor.Utils.getOrElse(model.get(1), "choiceModel.nodeName", null);
                if (operator === "HAS_SELECTED") {
                    var input = [model.get(0), model.get(2)];
                    this._writeFunction('contains', input);
                    return true;
                }
            },

            _handleIsValidNotValidSelected : function (model) {
                if (Granite.Toggles.isEnabled('FT_FORMS-17090')) {
                    var operator = expeditor.Utils.getOrElse(model.get(1), "choiceModel.nodeName", null);
                    if (operator === "IS_VALID" || operator === "IS_NOT_VALID") {
                        this.write('validate(');
                        var item = model.items[0];
                        if (item.nodeName === 'EVENT_AND_COMPARISON_LEFT_HAND_EXPRESSION') {
                            item = item.choiceModel;
                        }
                        var id = item.getValue().id;
                        this.write(id);
                        if (operator === "IS_VALID") {
                            this.write(').length==0');
                        } else {
                            this.write(').length!=0');
                        }
                        return true;
                    }
                    return false;
                }
                return false;

            },

            enterHAS_SELECTED : function () {
                // override default implementation
            },

            enterCOMPARISON_EXPRESSION : function (model) {
                return this._super.apply(this, arguments)
                    || this._handleHasSelected(model) || this._handleIsValidNotValidSelected(model);
            },

            enterCOMPLETION_EXPRESSION : function (model) {
                this.currentEvent.field = model.items[0].getValue().id;
                this.currentEvent.name = "Completion";
                model.items[2].accept(this);
                this.writeLn(";");
                return true;
            },

            enterOPTIONS_EXPRESSION : function (model) {
                this.currentEvent.field = model.items[0].getValue().id;
                this.currentEvent.name = "Options";
                var self = this;
                this._writeCondition(model.items[4].choiceModel, function () {
                    model.items[2].accept(self);
                });
                return true;
            },

            enterNAVIGATION_EXPRESSION : function (model) {
                this.currentEvent.name = "Navigation";
                var self = this;
                this._writeCondition(model.items[2].choiceModel, function () {
                    model.items[0].accept(self);
                });
                return true;
            },
            /**
             *  Method to generate a indented string representation of json object
             */
            _stringify : function (indentation, varName, jsonObj, quote) {
                var out = "var " + varName + " = " + JSON.stringify(jsonObj, null, RuntimeUtil.SCRIPT_INDENT.length);
                return out.split('\n').map(function (line) {
                    return indentation + line;
                }).join('\n');
            },

            enterWSDL_OPTIONS_EXPRESSION : function (model) {
                var val = model.getValue();

                if (val == null) {
                    return;
                }

                var indent = this.currentEvent.hasCondition ? RuntimeUtil.SCRIPT_INDENT : "";
                this._writeWsdlInfo(val, indent);

                /* inputs */
                this._writeWsdlInput(val, indent);
                var savedValue = val.outputModel.saveValue;
                var displayValue = val.outputModel.displayValue;

                if (savedValue && !displayValue) {
                    displayValue = savedValue;
                }

                this.writeLn(indent + "var outputs={");
                this.writeLn(indent + RuntimeUtil.SCRIPT_INDENT + "savedValue:'" + savedValue + "',");
                this.writeLn(indent + RuntimeUtil.SCRIPT_INDENT + "displayedValue:'" + displayValue + "',");
                this.writeLn(indent + RuntimeUtil.SCRIPT_INDENT + "field:this");
                this.writeLn(indent + "};");

                this.write(indent + "guidelib.dataIntegrationUtils.setOptionsFromService(operationInfo, inputs, outputs);");
            },

            enterWSDL_VALUE_EXPRESSION : function (model) {
                var val = model.getValue();
                if (val == null) {
                    return;
                }
                var indent = this.currentEvent.hasCondition ? RuntimeUtil.SCRIPT_INDENT : "";
                this._writeWsdlInfo(val, indent);

                /* inputs */
                this._writeWsdlInput(val, indent);
                var value = val.outputModel.value;

                this.writeLn(indent + "var outputs={");
                this.writeLn(indent + RuntimeUtil.SCRIPT_INDENT + "value:'" + value + "',");
                this.writeLn(indent + RuntimeUtil.SCRIPT_INDENT + "field:this");
                this.writeLn(indent + "};");

                this.write(indent + "guidelib.dataIntegrationUtils.setValueFromService(operationInfo, inputs, outputs);");
            },

            _writeWsdlInfo : function (val, indent) {
                /* wsdlInfo */
                var wsdlInfoString = this._stringify(indent, "operationInfo", val.wsdlInfo);
                if (wsdlInfoString && wsdlInfoString.length > indent.length) {
                    wsdlInfoString = wsdlInfoString.substring(indent.length);
                }
                this.writeLn(wsdlInfoString + ";");
            },

            /**
             * Method to update an object with a key value pair with the key a dot seperated location within the object
             * @private
             */
            _updateObject: function(object, key, value) {
                var parts = key.split('.');
                var ref = object;
                for(var i = 0; i < parts.length - 1; i++) {
                    // Check if the current property exists and is an object
                    // If not (e.g., it's a string like 'null()'), replace it with an empty object
                    if (!ref[parts[i]] || typeof ref[parts[i]] !== 'object') {
                        ref[parts[i]] = {};
                    }
                    ref = ref[parts[i]];
                }
                // Only set the value if we're setting a nested property OR if the existing value is not an object
                // This prevents overwriting an object that already has nested properties
                // Example scenario:
                //   Step 1: _updateObject(obj, "abc.def", "value1")
                //           Result: {abc: {def: "value1"}}
                //   Step 2: _updateObject(obj, "abc", "null()")
                //           Without protection: {abc: "null()"} - nested data lost!
                //           With protection: {abc: {def: "value1"}} - preserved!
                var finalKey = parts[parts.length - 1];
                if (parts.length > 1 || !ref[finalKey] || typeof ref[finalKey] !== 'object' || Object.keys(ref[finalKey]).length === 0) {
                    ref[finalKey] = value;
                }
            },

            _getWsdlInput : function (val, apiIntegrationJson) {
                var input = ""
                var header = "";
                var self = this;
                if (val.inputModel) {
                    var inputObj = {};
                    var headerObj = {};
                    var pathParams = {};
                    var inputMapping = apiIntegrationJson.inputMapping || [];
                    var contentType = apiIntegrationJson.contentType || "application/json";
                    if (!apiIntegrationJson.executeAtClient) { // todo: this is done since we need to call "af.apiintegration" servlet
                        contentType = "application/x-www-form-urlencoded";
                    }
                    self._updateObject(headerObj, "Content-Type", "'" + contentType + "'");

                    // First pass - collect all entries and track keys with non-null values
                    var entries = [];
                    var keysWithValues = new Set();
                    
                    Object.entries(val.inputModel).forEach(function (entry) {
                        var key = entry[0];
                        var value = entry[1];
                        var valueToBeWritten = "";
                        var isValueComponent = false;
                        if (value && value.choice) {
                            var transformer = new customTransformer();
                            transformer.setContext(self.ctx);
                            transformer.setEvent({
                                field: self.currentEvent.field
                            });
                            var copyModel = expeditor.Utils.ModelFactory.fromJson(value, self.ctx).choiceModel;
                            copyModel.accept(transformer);
                            if(copyModel.nodeName === 'COMPONENT' || copyModel.nodeName === 'AFCOMPONENT') {
                                isValueComponent = true;
                            }
                            valueToBeWritten = transformer.script;
                        }
                        var mapping = inputMapping.find(function (map) {
                            return map.apiKey === key;
                        });

                        if (valueToBeWritten && mapping) {
                            var isMappingArrayType = false;
                            var arrayTypes = ['ARRAY', 'STRING[]', 'NUMBER[]', 'BOOLEAN[]'];
                            if (_.includes(arrayTypes, mapping.type.trim().toUpperCase())) {
                                isMappingArrayType = true;
                            }
                            valueToBeWritten = isMappingArrayType ? RuntimeUtil.modifyRepeatablePanelFieldId(valueToBeWritten) : valueToBeWritten;
                            if (isValueComponent && ('OBJECT' === mapping.type.trim().toUpperCase() || 'ARRAY' === mapping.type.trim().toUpperCase())) {
                                valueToBeWritten = valueToBeWritten.endsWith(".$value") ? valueToBeWritten : valueToBeWritten + ".$value";
                            }
                        }
                        
                        var newValue = (valueToBeWritten ? valueToBeWritten : (mapping && mapping.defaultValue ? (mapping.type === 'string' ? "'" + mapping.defaultValue + "'" : mapping.defaultValue) :  "null()"));
                        
                        if (newValue !== "null()") {
                            keysWithValues.add(key);
                        }
                        
                        entries.push({
                            key: key,
                            newValue: newValue,
                            mapping: mapping
                        });
                    });
                    
                    // Build skip set for API integration - skip nested keys if parent has value
                    var skipKeys = new Set();
                    if (inputMapping && inputMapping.length > 0) {
                        keysWithValues.forEach(function(keyWithValue) {
                            entries.forEach(function(entry) {
                                if (entry.key.indexOf(keyWithValue + '.') === 0) {
                                    skipKeys.add(entry.key);
                                }
                            });
                        });
                    }
                    
                    // Second pass - apply values
                    entries.forEach(function(entry) {
                        var key = entry.key;
                        var newValue = entry.newValue;
                        var mapping = entry.mapping;
                        
                        if (newValue.length > 0 && newValue !== "null()") {
                            if (mapping) { // API integration only
                                if (mapping.in === "header") {
                                    self._updateObject(headerObj, key, newValue);
                                } else if (mapping.in === "path") {
                                    pathParams[key] = newValue;
                                } else {
                                    // Skip nested keys if parent has value
                                    if (!skipKeys.has(key)) {
                                        self._updateObject(inputObj, key, newValue);
                                    }
                                }
                            } else { // FDM integration
                                self._updateObject(inputObj, key, newValue);
                            }
                        }
                    });

                    // Handle path parameters in URL if they exist
                    if (Object.keys(pathParams).length > 0 && apiIntegrationJson.url) {
                        var urlParts = apiIntegrationJson.url.split(/[{}]/);
                        var newUrl = urlParts.map(function(part, index) {
                            // Even indices are regular URL parts, odd indices are parameters
                            if (index % 2 === 0) {
                                return part ? "'" + part + "'" : "";
                            } else {
                                // Check if this parameter exists in our pathParams
                                var paramValue = pathParams[part];
                                return paramValue || "{" + part + "}";
                            }
                        }).filter(function(part) {
                            return part !== "";
                        }).join(' & ');
                        
                        apiIntegrationJson.url = newUrl;
                    }

                    // now serialize this into a json-formula multi-dict
                    function serialize(obj) {
                      if (typeof obj !== "object") {
                        return obj;
                      }
                      var result = Object.entries(obj).map(function (elem){
                          // For now we are not checking if key itself contains double quotes or not because FDM doesn't send them in inputModel
                          // FDM itself converts xyz\"er to xyz_er, \"xyz\" to _xyz_ in input model when key has double quotes.
                          // If FDM starts supporting them then we will have to change here as well.
                          var key = '"' + elem[0] + '"';
                          return key + ': ' + serialize(elem[1]);
                      }).join(',');
                      return "{" + result + "}";
                    }
                    input = serialize(inputObj);
                    header = serialize(headerObj);
                }
                return { input: input, header: header };
            },

            _getWsdlOutput : function (val, apiIntegrationJson) {
                var output = [];
                const self = this;
                if (val.outputModel) {
                    Object.entries(val.outputModel).forEach(function(x) {
                        var key = x[1].id || x[0];
                        var arg = x[1];
                        if (arg !== "") {
                            var fieldId = expeditor.Utils.getOrElse(arg, "value.id", null);
                            if (fieldId !== null) {
                                var relativeName = self._getRelativeName(arg.value.id, self.currentEvent.field);
                                if (apiIntegrationJson && apiIntegrationJson.encryptionRequired) {
                                    output.push("dispatchEvent(" + relativeName + ",'custom:setProperty', {value: toObject(decrypt($event.payload.body, $event.payload.originalRequest))" + (key.startsWith("[*]") ? key : ("." + key)) + "})")
                                } else {
                                    output.push("dispatchEvent(" + relativeName + ",'custom:setProperty', {value: toObject($event.payload.body)" + (key.startsWith("[*]") ? key : ("." + key)) + "})")
                                }
                            }
                        }
                    });
                }
                return output;
            },

            _getEnhancedWsdlOutput : function (successCallbacks, apiIntegrationJson) {
                var self = this;
                var output = [];
                if(Granite.Toggles.isEnabled("FT_FORMS-11584")) {
                    for (var successCallback in successCallbacks) {
                        var model = successCallbacks[successCallback];
                        if (model.items && model.items.length) {
                            var transformer = new customTransformer();
                            this.ctx._apiIntegrationJson = apiIntegrationJson;
                            transformer.setContext(this.ctx);
                            transformer.setEvent({
                                field: self.currentEvent.field
                            })
                            model.accept(transformer);
                            var script = transformer.getScript();

                            script.content.forEach(function(scriptLine) {
                                output.push(scriptLine);
                            });
                        }
                    }
                }
                return output;
            },

            _getEnhancedWsdlCustomError : function (failureCallbacks, apiIntegrationJson) {
                var self = this;
                var customError = [];
                if(Granite.Toggles.isEnabled("FT_FORMS-11584")) {
                    for (failureCallback in failureCallbacks) {
                        var model = failureCallbacks[failureCallback];
                        if (model.items && model.items.length) {
                            var transformer = new customTransformer();
                            this.ctx._apiIntegrationJson = apiIntegrationJson;
                            transformer.setContext(this.ctx);
                            transformer.setEvent({
                                field: self.currentEvent.field
                            })
                            model.accept(transformer);
                            var script = transformer.getScript();
                            script.content.forEach(function(scriptLine) {
                                customError.push(scriptLine);
                            });
                        }
                    }
                }
                return customError;
            },

            _handleError : function (val, apiIntegrationJson) {
                var output = [];
                if (val.customErrorHandlerFunctionModel && val.customErrorHandlerFunctionModel.functionName) {
                    var funcId = val.customErrorHandlerFunctionModel.functionName.id;

                    if (funcId === "defaultErrorHandler") {
                        if (apiIntegrationJson && apiIntegrationJson.encryptionRequired) {
                            output.push(funcId + "(toObject(decrypt($event.payload.body, $event.payload.originalRequest)), $event.payload.headers)");
                        } else {
                            output.push(funcId + "(toObject($event.payload.body), $event.payload.headers)");
                        }
                    } else {
                        if (apiIntegrationJson && apiIntegrationJson.encryptionRequired) {
                            output.push(funcId + "(toObject(decrypt($event.payload.body, $event.payload.originalRequest)), $event.payload.headers) && defaultErrorHandler(toObject(decrypt($event.payload.body, $event.payload.originalRequest)), $event.payload.headers)");
                        } else {
                            output.push(funcId + "(toObject($event.payload.body), $event.payload.headers) && defaultErrorHandler(toObject($event.payload.body), $event.payload.headers)");
                        }
                    }
                }
                return output;
            },

            enterCALLBACK : function (model) {
                if(Granite.Toggles.isEnabled("FT_FORMS-13519")) {
                    if (model.items && model.items.length) {
                        this.script = [];
                        for (var i =0; i< model.items.length; i++) {
                            var transformer = new customTransformer();
                            transformer.setContext(this.ctx);
                            transformer.setEvent({
                                field: this.currentEvent.field
                            })
                            model.items[i].accept(transformer);
                            var script = transformer.getScript();
                            if (typeof script.otherEvents === 'object') {
                                this.currentEvent.otherEvents = this.currentEvent.otherEvents || {};
                                var self = this;
                                Object.entries(script.otherEvents).forEach(function (e) {
                                    if (e[0].length > 0) {
                                        self.currentEvent.otherEvents[e[0]] = e[1]
                                    }
                                })
                            }
                            this.script = this.script.concat(script.content)
                        }
                    }
                }
                return true;
            },

            enterCONDITION_BLOCK_STATEMENTS: function (model) {
                if (Granite.Toggles.isEnabled("FT_FORMS-13519")) {
                    this.blockStatements = {};
                    var condition = model.items[1];
                    this.currentEvent.hasCondition = true;
                    // create a new transformer for the condition
                    var transformer = new customTransformer();
                    transformer.setContext(this.ctx);
                    transformer.setEvent({
                        field: this.currentEvent.field
                    })
                    condition.accept(transformer);
                    this.currentEvent.condition = transformer.getScript().content
                    return false;
                }
                return true;
            },

            enterWSDL_CALLBACK_STATEMENT: function (model) {
                if (Granite.Toggles.isEnabled("FT_FORMS-11584")) {
                    this.blockStatements = {};
                    var condition = model.items[1];
                    this.currentEvent.hasCondition = true;
                    // create a new transformer for the condition
                    var transformer = new customTransformer();
                    transformer.setContext(this.ctx);
                    transformer.setEvent({
                        field: this.currentEvent.field
                    })
                    condition.accept(transformer);
                    this.currentEvent.condition = transformer.getScript().content
                    return false;
                }
                return true;
            },

            exitCONDITION_BLOCK_STATEMENTS : function (model) {
                if (Granite.Toggles.isEnabled("FT_FORMS-13519")) {
                    return this.exitBLOCK_STATEMENTS(model)
                }
                return true;
            },

            _createCallbackEvent: function (model, type) {
                var callbackModel = model.callbacks[type]
                if (callbackModel) {
                    var callbackEvent = "custom:" +
                        model.getFunctionName().id + "_" +
                        type + "_" + model.callbacks.id;
                    var transformer = new customTransformer();
                    transformer.setContext(this.ctx);
                    transformer.setEvent({
                        field: this.currentEvent.field
                    });
                    callbackModel.accept(transformer)
                    return {
                        name: callbackEvent,
                        script: transformer.getScript()
                    }
                }
                return {
                    name :'',
                    script: ''
                }
            },

            enterASYNC_FUNCTION_CALL : function (model) {
                if (Granite.Toggles.isEnabled("FT_FORMS-13519")) {
                    var transformer = new customTransformer();
                    transformer.setContext(this.ctx);
                    transformer.setEvent({
                        field: this.currentEvent.field
                    });
                    var copyModel = model.copy();
                    copyModel.nodeName = 'FUNCTION_CALL';
                    copyModel.accept(transformer);
                    var callbackEvents = []
                    if (copyModel.callbacks) {
                        var self = this;
                        callbackEvents = ['success', 'failure'].reduce(function (acc, e) {
                            var evnt = self._createCallbackEvent(copyModel, e);
                            if(evnt.name) {
                                acc.otherEvents[evnt.name] = {
                                    content: evnt.script.content
                                }
                            }
                            if (typeof evnt.script.otherEvents === 'object') {
                                Object.entries(evnt.script.otherEvents).forEach(function (e) {
                                    if (e[0].length > 0) {
                                        acc.otherEvents[e[0]] = e[1]
                                    }
                                })
                            }
                            acc.args += ",'" + evnt.name +"'"
                            return acc;
                        }, {args: '', otherEvents: this.currentEvent.otherEvents || {}})
                    }
                    this.currentEvent.otherEvents = callbackEvents.otherEvents
                    var script = "awaitFn(" + transformer.script + callbackEvents.args + ")"
                    return this._setProperty('$GLOBAL', script)
                }
            },

            enterWSDL_STATEMENT : function (model) {
                const getAFPath = function() {
                    return guidelib.RuntimeUtil.formPath
                }
                var val = model.getValue();
                if (val == null) {
                    return;
                }
                var url = "'" + getAFPath() +".af.dermis'";
                var wsdlInfo = val.wsdlInfo;

                if (wsdlInfo.type === 'api-integration') {
                    url = "'" + getAFPath() +".af.apiintegration'";
                }

                if (Granite.Toggles.isEnabled(guidelib.author.ConfigUpdater.FT_FORMS_9611) || Granite.Toggles.isEnabled(guidelib.author.ConfigUpdater.FT_FORMS_15407)) {
                    var form = model.ctx.getScope().findVarByType('FORM');
                    if(form) {
                        var formProperties = expeditor.Utils.getOrElse(form[0], "props.options", null);
                        if (formProperties) {
                            var schemaRef = formProperties.schemaRef || '';
                            var schemaType = formProperties.schemaType || '';

                            if(schemaType === 'connector') {
                                wsdlInfo.schemaRef = schemaRef;
                                wsdlInfo.schemaType = schemaType;
                            }
                        }
                    }
                }
                var apiIntegrationJson = {};
                if (wsdlInfo.type === 'api-integration') {
                    apiIntegrationJson = JSON.parse(wsdlInfo.inputJson);
                }

                var wsdlInput = this._getWsdlInput(val, apiIntegrationJson),
                    input = wsdlInput.input,
                    header = wsdlInput.header;

                var data = [
                    ['"operationName"', "'" + wsdlInfo.operationName + "'"],
                    ['"port"', wsdlInfo.port],
                    ['"soapActionURI"', "'" + wsdlInfo.soapActionURI + "'"],
                    ['"namespace"', "'" + wsdlInfo.namespace + "'"],
                    ['"input"', input.length > 0 ? "toString(" + input + ")" : ""],
                    ['"inputRoot"', "'" + wsdlInfo.inputRoot + "'"],
                    ['"inputAttr"', wsdlInfo.inputAttr ? "toString(" + wsdlInfo.inputAttr + ")" : ''],
                    ['"serviceEndPoint"', "'" + wsdlInfo.serviceEndPoint + "'"],
                    ['"functionToExecute"', "'invokeFDMOperation'"],
                    ['"apiVersion"', "'2'"],
                    ['"formDataModelId"', "'" + wsdlInfo.formDataModelId + "'"],
                    ['"runValidation"', "'" + wsdlInfo.runValidation + "'"],
                    ['"guideNodePath"', "'" + guidelib.RuntimeUtil.currentNodePath + "'"]
                ];

                if (wsdlInfo.type === 'api-integration') {
                    if(apiIntegrationJson.executeAtClient) {
                        if (input.length > 0) {
                            data = input;
                        } else {
                            data = [];
                        }
                    }
                }

                if ('api-integration' !== wsdlInfo.type && 
                    (Granite.Toggles.isEnabled(guidelib.author.ConfigUpdater.FT_FORMS_9611) || Granite.Toggles.isEnabled(guidelib.author.ConfigUpdater.FT_FORMS_15407))) {
                    data.push(
                        ['"schemaRef"', "'" + wsdlInfo.schemaRef + "'"],
                        ['"schemaType"', "'" + wsdlInfo.schemaType + "'"]
                    );
                }

                if (typeof data !== 'string') {
                    data = data.filter(function (obj) {
                        return obj[1] != null && obj[1].length > 0 && obj[1] !== "'undefined'"
                    }).map(function (d) {
                        return d[0] + ":" + d[1]
                    }).join(",")
                }
                var now = new Date().getTime()
                var random = Math.random().toString().substring(2, 8);
                var wsdlSuccessEventName = "custom:wsdlSuccess_" + random + '_' + now;
                var wsdlErrorEventName = "custom:wsdlError_" + random + '_' + now;
                var wsdlDecryptSuccessEventName = "custom:decryptSuccess_" + random + '_' + now;
                var wsdlDecryptErrorEventName = "custom:decryptError_" + random + '_' + now;
                this.currentEvent.otherEvents = this.currentEvent.otherEvents || {};

                if (Granite.Toggles.isEnabled(guidelib.author.ConfigUpdater.FT_FORMS_11584)) {
                    if (apiIntegrationJson.encryptionRequired && apiIntegrationJson.publicKey) {
                        this.currentEvent.otherEvents[wsdlSuccessEventName] = {
                            content: "awaitFn(decrypt($event.payload.body, $event.payload.originalRequest), '" + wsdlDecryptSuccessEventName + "', '" + wsdlDecryptErrorEventName + "')"
                        }
                        this.currentEvent.otherEvents[wsdlDecryptSuccessEventName] = {
                            content: this._getEnhancedWsdlOutput(model.getCallback('success'), apiIntegrationJson)
                        }
                        // todo: handle decryption error lately
                    } else {
                        this.currentEvent.otherEvents[wsdlSuccessEventName] = {
                            content: this._getEnhancedWsdlOutput(model.getCallback('success'), apiIntegrationJson)
                        }
                    }
                    this.currentEvent.otherEvents[wsdlErrorEventName] = {
                        content: this._getEnhancedWsdlCustomError(model.getCallback('failure'), apiIntegrationJson)
                    }
                } else {
                    this.currentEvent.otherEvents[wsdlSuccessEventName] = {
                        content: this._getWsdlOutput(val, apiIntegrationJson)
                    }
                    this.currentEvent.otherEvents[wsdlErrorEventName] = {
                        content: this._handleError(val, apiIntegrationJson)
                    }
                }
                if (wsdlInfo.type === 'api-integration') {
                    var finalUrl = url;
                    if (data.length > 0 && !data.startsWith("{") && !data.endsWith("}")) {
                        data = "{" + data + "}";
                    }
                    if(apiIntegrationJson.executeAtClient && apiIntegrationJson.url) {
                        finalUrl = apiIntegrationJson.url;
                    }
                    // Helper function to properly format URL expression
                    function formatUrlExpr(url) {

                        // Count single quotes to check if they're balanced
                        var quoteCount = (url.match(/'/g) || []).length;
                        
                        // If odd number of quotes, they're unbalanced - add closing quote
                        // example: 'https://example.com/abc
                        // example: https://example.com/abc'
                        if (quoteCount % 2 === 1) {
                            var startsWithQuote = url.startsWith("'");
                            var endsWithQuote = url.endsWith("'");
                            
                            if (startsWithQuote && !endsWithQuote) {
                                // Missing closing quote - add at end
                                return url + "'";
                                
                            } else if (!startsWithQuote && endsWithQuote) {
                                // Missing opening quote - add at start
                                return "'" + url;
                                
                            }
                        }
                        
                        // If no quotes at all
                        // example: https://example.com/abc
                        if (quoteCount === 0) {
                            return "'" + url + "'";
                        }
                        
                        // Even number of quotes (balanced) - leave as is
                        // example: 'https://example.com/abc/' & zip.$value
                        // example: 'https://example.com/abc/' & zip.$value & '.json'
                        return url;
                    }

                    if (Granite.Toggles.isEnabled(RETRY_REQUEST_HANDLER_FT)) {
                        if (apiIntegrationJson.encryptionRequired && apiIntegrationJson.publicKey) {
                            var urlExpr = formatUrlExpr(finalUrl);
                            return this._setProperty('$GLOBAL', "awaitFn(retryHandler(requestWithRetry(externalize(" + urlExpr + "), '" + apiIntegrationJson.method + "', encrypt({body: " + data + ", headers: " + header + "}, '" + apiIntegrationJson.publicKey + "'), '" + wsdlSuccessEventName + "'," + "'" + wsdlErrorEventName + "')))")
                        } else {
                            var urlExpr = formatUrlExpr(finalUrl);
                            return this._setProperty('$GLOBAL', "awaitFn(retryHandler(requestWithRetry(externalize(" + urlExpr + "), '" + apiIntegrationJson.method + "', " + data + ", " + header + ", '" + wsdlSuccessEventName + "'," + "'" + wsdlErrorEventName + "')))")
                        }
                    } else {
                        if (apiIntegrationJson.encryptionRequired && apiIntegrationJson.publicKey) {
                            var urlExpr = formatUrlExpr(finalUrl);
                            return this._setProperty('$GLOBAL', "request(externalize(" + urlExpr + "),'" + apiIntegrationJson.method + "', encrypt({body: " + data + ", headers: " + header + "}, '" + apiIntegrationJson.publicKey + "'), '" + wsdlSuccessEventName + "'," + "'" + wsdlErrorEventName + "')")
                        } else {
                            var urlExpr = formatUrlExpr(finalUrl);
                            return this._setProperty('$GLOBAL', "request(externalize(" + urlExpr + "),'" + apiIntegrationJson.method + "', " + data + ", " + header + ", '" + wsdlSuccessEventName + "'," + "'" + wsdlErrorEventName + "')");
                        }
                    }
                } else {
                    if (Granite.Toggles.isEnabled(RETRY_REQUEST_HANDLER_FT)) {
                        return this._setProperty('$GLOBAL', "awaitFn(retryHandler(requestWithRetry(externalize(" + url + "), 'POST', {" + data +"}, {\"Content-Type\" : 'application/x-www-form-urlencoded'}, '" + wsdlSuccessEventName + "'," + "'" + wsdlErrorEventName + "')))");
                    } else {
                        return this._setProperty('$GLOBAL', "request(externalize(" + url + "), 'POST', {" + data +"}, {\"Content-Type\" : 'application/x-www-form-urlencoded'}, '" + wsdlSuccessEventName + "'," + "'" + wsdlErrorEventName + "')");
                    }
                }
            },

            exitWSDL_STATEMENT : function (model) {

            },

            enterSET_PROPERTY : function (model) {
                var constraintMessageKeys = {
                    "minimumMessage": {
                        "type": "minimum"
                    },
                    "maximumMessage": {
                        "type": "maximum"
                    }
                };
                
                var oldScript = this.script;
                this.script = ""
                model.items[2].accept(this)
                var expression = this.script;
                this.script = "";
                model.items[0].items[2].accept(this)
                var fieldName = this.script;
                this.script = "";
                model.items[0].items[0].accept(this)
                var propName = this.script;
                this.script = oldScript
                if (propName.indexOf(".") > -1) {
                    var propParts = propName.split('.'); //assumption is that there is a single . only
                    this._setProperty(fieldName, propParts[0].substring(1) + " : {" + propParts[1] + " : " + expression + "}")
                } else {
                    if (constraintMessageKeys[propName.substring(1)]) {
                        return this._setProperty(fieldName, "constraintMessage : { type : '" + constraintMessageKeys[propName.substring(1)].type + "', message : " + expression + "}")
                    }
                    return this._setProperty(fieldName, propName.substring(1) + " : " + expression)
                }
            },

            enterSET_VALUE_STATEMENT : function (model) {
                var oldScript = this.script;
                this.script = ""
                model.items[2].accept(this)
                var expression = this.script;
                this.script = oldScript;
                if (Granite.Toggles.isEnabled('FT_FORMS-11584') && model.items[0] && model.items[0].getValue() && model.items[0].getValue().type === 'PANEL') {
                    // If panel is selected in Set Value, then need to call importData function
                    const id = model.items[0].getValue().id;
                    return this._setProperty('$GLOBAL', "importData(" + expression + ",'" + id + "')");
                }
                return this._setProperty(model.items[0], 'value : ' + expression);
            },

            exitCLEAR_VALUE_STATEMENT : function (model) {
                return this._setProperty(model.items[0], "value : `null`")
            },

            enterSAVE_FORM : function (model) {
                var formId = '';
                var form = model.ctx.getScope().findVarByType('FORM');
                if (form && form[0] && form[0].props && form[0].props.options) {
                    formId = form[0].props.options.originalId || '';
                }
                const path = "externalize('/adobe/forms/af/save/" + formId + "')";
                return this._setProperty('$GLOBAL', "saveForm(" + path + ")")
            },

            enterSUBMIT_FORM : function (model) {
                return this._setProperty('$GLOBAL', "submitForm()")
            },

            enterRESET_FORM : function (model) {
                if (model.value && model.value.id) {
                    var fieldId = model.value.id;
                    var shortName = this._getRelativeName(fieldId, this.currentEvent.field);
                    return this._setProperty('$GLOBAL', "dispatchEvent(" + shortName + ", 'reset')");
                } else {
                    return this._setProperty('$GLOBAL', "dispatchEvent('reset')");
                }
            },

            enterVALIDATE_FORM : function (model) {
                if (model.value && model.value.id) {
                    var fieldId = model.value.id;
                    var shortName = this._getRelativeName(fieldId, this.currentEvent.field);
                    return this._setProperty('$GLOBAL', "validate(" + shortName  + ")");
                } else {
                    return this._setProperty('$GLOBAL', "validate()");
                }
            },

            enterSET_FOCUS : function (model) {
                var oldScript = this.script;
                this.script = ""
                model.items[1].accept(this)
                var expression = this.script;
                this.script = oldScript;
                return this._setProperty('$GLOBAL', 'dispatchEvent(' + expression + ',\'focus\')');
            },

            enterNAVIGATE_IN_PANEL : function (model) {
                var oldScript = this.script;
                this.script = ""
                model.items[2].accept(this)
                var expression = this.script;
                this.script = oldScript;
                var focusOption = model.items[0].choiceModel.nodeName;
                focusOption = focusOption === 'NEXT_ITEM' ? 'nextItem' : 'previousItem';
                return this._setProperty('$GLOBAL', 'setFocus(' + expression + ",'" + focusOption + "')")
            },

            enterADD_INSTANCE : function (model) {
                var fieldId = model.items[1].getValue().id;
                var shortName = this._getRelativeName(fieldId, this.currentEvent.field);
                if (Granite.Toggles.isEnabled('FT_FORMS-16466')) {
                    return this._setProperty('$GLOBAL', "addInstance(" + shortName + ", getRelativeInstanceIndex(" + fieldId +") + 1)");
                }
                return this._setProperty('$GLOBAL', 'addInstance(' + shortName + ")");
            },

            enterREMOVE_INSTANCE : function (model) {
                var fieldId = model.items[1].getValue().id;
                var shortName = this._getRelativeName(fieldId, this.currentEvent.field);
                if (Granite.Toggles.isEnabled('FT_FORMS-16466')) {
                    return this._setProperty('$GLOBAL', "removeInstance(" + shortName + ", getRelativeInstanceIndex(" + fieldId +"))");
                }
                return this._setProperty('$GLOBAL', 'removeInstance(' + shortName + ", length(" + shortName + ") - 1)");
            },

            enterPRIMITIVE_VARIABLE : function (model) {
                var val = model.getValue();
                if (val) {
                    this.write(this._getRelativeName(val.id, this.currentEvent.field));
                    if (expeditor.Utils.isPrimitive(val.type)) {
                        this.write(".value");
                    }
                }
            },

            enterNAVIGATE_TO : function (model) {
                var url = "";
                if(model.items[0].choiceModel.nodeName === "URL_LITERAL") {
                    url = "'"+model.items[0].choiceModel.getValue()+"'";
                } else {
                    var oldScript = this.script;
                    this.script = ""
                    model.items[0].accept(this)
                    url = this.script;
                    this.script = oldScript;
                }

                var target = model.items[2];
                if (target != null) {
                    target = target.choiceModel.nodeName;
                } else {
                    target = "SAME_TAB"
                }
                var _target;
                switch(target) {
                    case 'SAME_TAB':
                        _target = '_self';
                        break;
                    case 'NEW_TAB':
                        _target = '_blank'
                        break;
                    case 'NEW_WINDOW':
                        _target = '_newwindow';
                        break;
                    default:
                        _target = '_self';
                        break;
                }
                if (url != null) {
                    return this._setProperty('$GLOBAL', "navigateTo(" + url + ", '" + _target + "')")
                }
            },

            enterDISPATCH_EVENT : function (model) {
                var fieldId = model.items[2] && model.items[2].getValue() ? model.items[2].getValue().id : null;
                var shortName = '';
                if (fieldId) {
                    shortName = this._getRelativeName(fieldId, this.currentEvent.field);
                }
                var eventName = model.items[0].value
                if (Granite.Toggles.isEnabled('FT_FORMS-21264') && !eventName.startsWith('custom:')) {
                    eventName = 'custom:' + eventName;
                }
                if (shortName && '$globalForm' !== shortName) {
                    this._setProperty('$GLOBAL', 'dispatchEvent(' + shortName + ", '" + eventName + "')");
                } else {
                    this._setProperty('$GLOBAL', 'dispatchEvent(' + "'" + eventName + "')");
                }
                return true;
            },

            enterFUNCTION_CALL : function (model) {
                if (model.getFunctionName()) {
                    var funcDef = model.getFunctionName(),
                        impl = funcDef.impl,
                        self = this;

                    if (funcDef.id === 'getEventPayload') {
                        var param = model.getParameter(0)
                        const paramChoice = param.getChoiceModel();
                        if (param && paramChoice !== null) {
                            const paramType = paramChoice.nodeName;
                            if (paramType === 'STRING_LITERAL') {
                                this.write('$event.payload.' + paramChoice.value);
                                return;
                            }
                        } else {
                            this.write('$event.payload');
                            return;
                        }
                    } else if (Granite.Toggles.isEnabled('FT_FORMS-11584') && model.getFunctionName() && model.getFunctionName().isErrorHandler) {
                        const funcId = funcDef.id;
                        if (funcId === 'defaultErrorHandler') {
                            self.write(funcId + "(toObject($event.payload.body), $event.payload.headers)");
                        } else {
                            self.write(funcId + "(toObject($event.payload.body), $event.payload.headers) && defaultErrorHandler(toObject($event.payload.body), $event.payload.headers)");
                        }
                        return this._setProperty('$GLOBAL', this.script);
                    }
                    var oldScript = this.script;
                    this.script = "";

                    /* Function Implementation is of the type $<NUM>($<NUM>, $<NUM>=$default)
                     * Currently any $<NUM> will be replaced by the transformation of <NUM> argument
                     * where 0th argument is the function id.
                     * $ not following a number will be replaced by $ only
                     * If the implementation wants to escape a $<NUM> we have to modify the regex
                     * below to
                     *  /\\(?=\$)\$|\$([\d]+)|./g,
                     *  And to escape, the user has to write $0($1, \\$3)
                     *
                     * Now also supports default values with syntax $<NUM>=defaultValue
                     */
                    impl.replace(/\$([\d]+)(?:=([^,\)]+))?|./g, function (match, n1, defaultValue, offset) {
                        if (n1 && n1.length > 0) {
                            var num = +n1;
                            if (num === 0) {
                                self.write(funcDef.id);
                            } else {
                                if (model.getParameter(num - 1).getChoiceModel() == null || ((Granite.Toggles.isEnabled("FT_FORMS-19581")) && model.getParameter(num - 1).getChoiceModel() !== null && typeof model.getParameter(num - 1).getChoiceModel().getValue === 'function' && model.getParameter(num - 1).getChoiceModel().getValue() == null)) {
                                    // means optional parameter is not set, use default if available
                                    if (defaultValue) {
                                        self.write(defaultValue);
                                    } else {
                                        self.write("undefined");
                                    }
                                } else {
                                    if (Granite.Toggles.isEnabled("FT_FORMS-14303") && 'COMPONENT' === model.getParameter(num - 1).getChoiceModel().nodeName) {
                                        var arrayTypes = ["NUMBER[]", "STRING[]", "BOOLEAN[]", "DATE[]", "ARRAY"];
                                        var fieldId = model.getParameter(num - 1).getChoiceModel().getValue().id;

                                        // Split the type string by '|' and check if any of the types are in arrayTypes using a for loop
                                        var types = model.functionName.args[num - 1].type.split('|');
                                        var isArrayType = false;
                                        for (var i = 0; i < types.length; i++) {
                                            if (_.includes(arrayTypes, types[i].trim())) {
                                                isArrayType = true;
                                                break;
                                            }
                                        }

                                        if (isArrayType && expeditor.Utils.getOrElse(model.ctx.getScope().findVarById(fieldId), "element.metadata.isAncestorRepeatable", false)) {
                                            var scriptTillNow = self.script;
                                            self.script = "";
                                            model.getParameter(num - 1).accept(self);
                                            self.script = scriptTillNow + RuntimeUtil.modifyRepeatablePanelFieldId(self.script);
                                        } else {
                                            if ('$globalForm' === fieldId && ('setVariable' === funcDef.id || 'getVariable' === funcDef.id)) {
                                                self.write("undefined");
                                            } else {
                                                model.getParameter(num - 1).accept(self);
                                            }
                                        }
                                    } else if ('COMPONENT' === model.getParameter(num - 1).getChoiceModel().nodeName) {
                                        var fieldId = model.getParameter(num - 1).getChoiceModel().getValue().id;
                                        if ('$globalForm' === fieldId && ('setVariable' === funcDef.id || 'getVariable' === funcDef.id)) {
                                            self.write("undefined");
                                        } else {
                                            model.getParameter(num - 1).accept(self);
                                        }
                                    } else {
                                        model.getParameter(num - 1).accept(self);
                                    }
                                }
                            }
                        } else {
                            self.write(match);
                        }
                    });
                }

                if ('getParentNodeName' in model && typeof model.getParentNodeName === 'function' && ('BLOCK_STATEMENT' === model.getParentNodeName() || 'WSDL_BLOCK_STATEMENT' === model.getParentNodeName())) {
                    return this._setProperty('$GLOBAL', this.script)
                } else {
                    this.script = oldScript + this.script;
                }
            },

            enterSINGLE_TRIGGER_SCRIPTS : function(model) {
                var oldScript = this.script;
                if (model.items[0] && model.items[0].value) {
                    this.currentEvent.field = model.items[0].value.id;
                }
                if (model.items[1] && model.items[1].value) {
                    var eventName = model.items[1].value;
                    if (RuntimeUtil.eventToEventName.hasOwnProperty(eventName)) {
                        eventName = RuntimeUtil.eventToEventName[eventName];
                    } else if (!eventName.startsWith('custom:')) {
                        eventName = 'custom:' + eventName;
                    }
                    this.currentEvent.name = eventName;
                }
                this.script = oldScript;
                model.items[3].accept(this);
                return true;
            },

            enterTRIGGER_EVENT_SCRIPTS : function (model) {
                this.currentEvent.hasCondition  = true;
                if (model.items[0]) {
                    model.items[0].accept(this);
                }
                this.currentEvent.condition = this.script;
                if (model.items[2]) {
                    model.items[2].accept(this);
                }
                if (model.items.length > 4) {
                    var previousIfConditionStatement = this.script;
                    this.currentEvent.condition = '!('+this.currentEvent.condition+')';
                    model.items[4].accept(this);

                    const mergedScript = [];
                    for (var i = 0; i < previousIfConditionStatement.length; i++) {
                        mergedScript.push(previousIfConditionStatement[i]);
                    }
                    for (var i = 0; i < this.script.length; i++) {
                        mergedScript.push(this.script[i]);
                    }
                    this.script = mergedScript;
                }
                return true;
            },

            enterUTM_PARAMETER: function (model) {
                if (model && model.getValue()) {
                    this.write("getQueryParameter('" + model.getValue() + "')");
                }
                return true;
            },

            enterQUERY_PARAMETER: function (model) {
                if (model && model.getValue()) {
                    this.write("getQueryParameter('" + model.getValue() + "')");
                }
                return true;
            },

            enterBROWSER_DETAILS: function (model) {
                if (model && model.getValue()) {
                    this.write("getBrowserDetail('" + model.getValue() + "')");
                }
                return true;
            },

            enterURL_DETAILS : function (model) {
                if (model && model.getValue()) {
                    this.write("getURLDetail('" + model.getValue() + "')");
                }
                return true;
            },

            enterGET_VARIABLE : function (model) {
                var oldScript = this.script;
                this.script = "";
                model.items[1].accept(this);
                var variableName = this.script;

                this.script = "";
                model.items[3].accept(this);
                var fieldId = this.script;

                this.script = oldScript;

                var shortName;
                if (fieldId) {
                    shortName = this._getRelativeName(fieldId, this.currentEvent.field);
                }

                if (shortName && '$globalForm' !== shortName) {
                    this.write("getVariable(" + variableName + ", " + shortName + ")");
                } else {
                    this.write("getVariable(" + variableName + ")");
                }
                return true;
            },

            enterSET_VARIABLE : function (model) {
                var oldScript = this.script;
                this.script = "";
                model.items[1].accept(this);
                var variableName = this.script;

                this.script = "";
                model.items[3].accept(this);
                var variableValue = this.script;

                this.script = "";
                model.items[5].accept(this);
                var fieldId = this.script;

                this.script = oldScript;

                var shortName;
                if (fieldId) {
                    shortName = this._getRelativeName(fieldId, this.currentEvent.field);
                }

                if (shortName && '$globalForm' !== shortName) {
                    this._setProperty('$GLOBAL', "setVariable(" + variableName + ", " + variableValue + ", " + shortName + ")");
                } else {
                    this._setProperty('$GLOBAL', "setVariable(" + variableName + ", " + variableValue + ")");
                }
                return true;
            },

            enterWRITE_JSON_FORMULA : function (model) {
                var oldScript = this.script;
                this.script = "";
                model.items[0].accept(this);
                var jsonFormula = this.script;
                jsonFormula = jsonFormula.replace(/^['"]|['"]$/g, '');
                this.script = oldScript;
                return this._setProperty('$GLOBAL', jsonFormula);
            }
        });
}(jQuery, fd._));
