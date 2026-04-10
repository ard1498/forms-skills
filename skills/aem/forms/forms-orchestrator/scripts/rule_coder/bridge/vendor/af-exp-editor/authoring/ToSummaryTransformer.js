/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
*  Copyright 2015 Adobe Systems Incorporated
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
(function (guidelib, _) {
    var ExpressionEditorUtil = guidelib.author.ExpressionEditorUtil,
        RuntimeUtil = guidelib.RuntimeUtil,
        ToSummaryTransformer = guidelib.author.ToSummaryTransformer = expeditor.ToSummaryTransformer.extend({
        init : function (ctx) {
            this._super.apply(this, arguments);
        },

        _getFieldModel : function (condition) {
            if (condition.choiceModel.nodeName == "EVENT_AND_COMPARISON") {
                return condition.choiceModel.items[0];
            } else {
                return this._getFieldModel(condition.choiceModel.items[0]);
            }
        },

        enterROOT : function (model) {
            this._super.apply(this, arguments);
            var ruleType = model.ruleType,
                description = model.description;
            if (!_.isUndefined(ruleType) && ruleType === "formdatamodel") {
                this._currentScriptContext().eventName = "Calculate";
                this._currentScriptContext().field = this.ctx.currentFieldId;
                this._currentScriptContext().isProxyRule = true;
                this.writeInfo(description);
            }
        },

        enterEVENT_SCRIPTS : function (model) {
            if (expeditor.rb.FeatureToggles.isCommComposerChannel()) {
                if (model.items.length > 1 && model.items[0].choiceModel != null) {
                    this.writeLogicalOperator(" " + Granite.I18n.get("AND") + " ");
                    this.writeBreak();
                }
            } else {
                var condition = model.items[0];
                var conditionEvent = RuntimeUtil.getEventFromCondition(condition);
                this.writeStatement(" " + Granite.I18n.get("WHEN") + " ");
                this.writeBreak();
                if (conditionEvent) {
                    this._currentScriptContext().eventName = RuntimeUtil.eventToEventName[conditionEvent];
                } else {
                    this._currentScriptContext().eventName = "Value Commit";
                    var field = this._getFieldModel(condition);
                    field.accept(this);
                    this.writeNormal(" " + Granite.I18n.get("is changed") + " ");
                    this.writeBreak();
                    this.writeLogicalOperator(" " + Granite.I18n.get("AND") + " ");
                    this.writeBreak();
                }
                condition.accept(this);
                this.writeBreak();
                this.writeKeyword(" " + Granite.I18n.get("THEN") + " ");
                this.writeBreak();
                model.items[2].accept(this);

                if (model.items.length > 4) {
                    this.writeKeyword(" " + Granite.I18n.get("ELSE") + " ");
                    this.writeBreak();
                    model.items[4].accept(this);
                }
                return true;
            }
        },

        enterEVENT_AND_COMPARISON : function (model) {
            var field = model.ctx.currentFieldId;
            this._currentScriptContext().field = field;
            var operator = expeditor.Utils.getOrElse(model.items[1], 'choiceModel.nodeName', null);
            if (operator && RuntimeUtil.eventToEventName.hasOwnProperty(operator)) {
                model.items[0].accept(this);
                this.writeNormal(" " + Granite.I18n.get(operator) + " ");
                return true;
            }
            this.writeNormal(" (");
            if (ExpressionEditorUtil.unaryOperators.hasOwnProperty(operator)) {
                model.items[0].accept(this);
                model.items[1].accept(this);
                return true;
            }
        },

        exitEVENT_AND_COMPARISON : function (model) {
            var operator = expeditor.Utils.getOrElse(model.items[1], 'choiceModel.nodeName', null);
            if (!(operator && RuntimeUtil.eventToEventName.hasOwnProperty(operator))) {
                this.writeNormal(") ");
            }
        },

        enterBLOCK_STATEMENT : function (model) {
        },

        exitBLOCK_STATEMENT : function (model) {
            this.writeBreak();
        },

        enterWSDL_BLOCK_STATEMENT : function (model) {},

        exitWSDL_BLOCK_STATEMENT : function (model) {
            this.writeBreak();
        },

        enterEVENT_CONDITION : function (model) {
            if (model.nested) {
                this.writeNormal(" (");
            }
        },

        exitEVENT_CONDITION : function (model) {
            if (model.nested) {
                this.writeNormal(") ");
            }
        },

        enterPRIMITIVE_EXPRESSION : function (model) {
        },

        enterAFCOMPONENT : function (model) {
            this._writeVariable(model);
        },

        enterPANEL : function (model) {
            this._writeVariable(model);
        },

        enterCOMPONENT : function (model) {
            this._writeVariable(model);
        },

        enterDATA_MODEL_EXPRESSION : function (model) {
            var valObj = model.getValue();
            if (valObj && valObj.displayName) {
                this.writeVariable(valObj.displayName);
            } else if (valObj && valObj.name) {
                this.writeVariable(valObj.name);
            } else {
                this.writeVariable("Unknown Data Model");
            }
        },

        enterEVENT : function (model) {
            this.writeKeyword(model.getChoiceModel().nodeName);
        },

        enterThen : function (model) {
            if (Granite.Toggles.isEnabled(guidelib.author.ConfigUpdater.FT_FORMS_11584) && !expeditor.rb.FeatureToggles.isCommComposerChannel()) {
                // If condition is empty then do not show THEN
                if (model?.show) {
                    this.writeBreak();
                    this.writeStatement(" " + Granite.I18n.get("THEN") + " ");
                    this.writeBreak();
                }
            } else {
                this.writeBreak();
                this.writeStatement(" " + Granite.I18n.get("THEN") + " ");
                this.writeBreak();
            }
        },

        enterHIDE_STATEMENT : function (model) {
            this.writeNormal(" " + Granite.I18n.get("Hide") + " ");
        },

        enterSHOW_STATEMENT : function (model) {
            this.writeNormal(" " + Granite.I18n.get("Show") + " ");
        },

        enterCONDITIONORALWAYS : function (model) {
            if (model.getChoiceModel()) {
                this.writeBreak();
                this.writeKeyword(" " + Granite.I18n.get("WHEN") + " ");
                this.writeBreak();
            }
        },

        exitCONDITIONORALWAYS : function (model) {
            if (model.getChoiceModel()) {
                this.writeBreak();
            }
        },

        enterENABLE_STATEMENT : function (model) {
            this.writeNormal(" " + Granite.I18n.get("Enable") + " ");
        },

        enterDISABLE_STATEMENT : function (model) {
            this.writeNormal(" " + Granite.I18n.get("Disable") + " ");
        },

        enterACCESS_EXPRESSION : function (model) {
            this._currentScriptContext().field = model.items[0].getValue().id;
            this._currentScriptContext().eventName = "Enable";
            this.writeStatement(" " + Granite.I18n.get("ENABLE") + " ");
            this.writeBreak();
        },

        exitACCESS_EXPRESSION : function (model) {
            var condition = model.items[2];
            if (condition.choiceModel) {
                this._enterELSE();
                this._enterDONOTHING_OR_ELSE(model.items[4]);
            }
        },

        enterDISABLE_EXPRESSION : function (model) {
            this._currentScriptContext().field = model.items[0].getValue().id;
            this._currentScriptContext().eventName = "Disable";
            this.writeStatement(" " + Granite.I18n.get("DISABLE") + " ");
            this.writeBreak();
        },

        exitDISABLE_EXPRESSION : function (model) {
            var condition = model.items[2];
            if (condition.choiceModel) {
                this._enterELSE();
                this._enterDONOTHING_OR_ELSE(model.items[4]);
            }
        },

        enterCALC_EXPRESSION : function (model) {
            this._currentScriptContext().field = model.items[0].getValue().id;
            this._currentScriptContext().eventName = "Calculate";
            this.writeStatement(" " + Granite.I18n.get("SET VALUE OF") + " ");
            this.writeBreak();
        },

        enterCLEAR_EXPRESSION : function (model) {
            this._currentScriptContext().field = model.items[0].getValue().id;
            this._currentScriptContext().eventName = "Calculate";
            this.writeStatement(" " + Granite.I18n.get("CLEAR VALUE OF") + " ");
            this.writeBreak();
        },

        enterVALUE_COMMIT_EXPRESSION : function (model) {
            this.writeStatement(" " + Granite.I18n.get("WHEN VALUE OF") + " ");
            this.writeBreak();
        },

        enterSUMMARY_EXPRESSION : function (model) {
            this._currentScriptContext().field = model.items[0].getValue().id;
            this._currentScriptContext().eventName = "Summary";
            this.writeStatement(" " + Granite.I18n.get("SET SUMMARY OF") + " ");
            this.writeBreak();
        },

        enterNAVIGABLE_PANEL : function (model) {
            this._writeVariable(model);
        },

        enterREPEATABLE_PANEL : function (model) {
            this._writeVariable(model);
        },

        enterCOMPLETION_EXPRESSION : function (model) {
            this._currentScriptContext().field = model.items[0].getValue().id;
            this._currentScriptContext().eventName = "Completion";
            this.writeStatement(" " + Granite.I18n.get("SET COMPLETE") + " ");
            this.writeBreak();
        },

        enterVALIDATE_EXPRESSION : function (model) {
            this._currentScriptContext().field = model.items[0].getValue().id;
            this._currentScriptContext().eventName = "Validate";
            this.writeStatement(" " + Granite.I18n.get("VALIDATE") + " ");
            this.writeBreak();
        },
            enterFORMAT_EXPRESSION : function (model) {
                this._currentScriptContext().field = model.items[0].getValue().id;
                this._currentScriptContext().eventName = "Format";
                this.writeStatement(" " + Granite.I18n.get("FORMAT") + " ");
                this.writeBreak();
            },

        enterVISIBLE_EXPRESSION : function (model) {
            this._currentScriptContext().field = model.items[0].getValue().id;
            this._currentScriptContext().eventName = "Hide";
            this.writeStatement(" " + Granite.I18n.get("HIDE") + " ");
            this.writeBreak();
        },

        _enterELSE : function (model) {
            this.writeKeyword(" " + Granite.I18n.get("ELSE") + " ");
            this.writeBreak();
        },

        _enterDONOTHING_OR_ELSE : function (model) {
            this.writeNormal(Granite.I18n.getVar(model.choiceModel.nodeName));
        },

        exitVISIBLE_EXPRESSION : function (model) {
            var condition = model.items[2];
            if (condition.choiceModel) {
                this._enterELSE();
                this._enterDONOTHING_OR_ELSE(model.items[4]);
            }
        },

        enterSHOW_EXPRESSION : function (model) {
            this._currentScriptContext().field = model.items[0].getValue().id;
            this._currentScriptContext().eventName = "Show";
            this.writeStatement(" " + Granite.I18n.get("SHOW") + " ");
            this.writeBreak();
        },

        exitSHOW_EXPRESSION : function (model) {
            var condition = model.items[2];
            if (condition.choiceModel) {
                this._enterELSE();
                this._enterDONOTHING_OR_ELSE(model.items[4]);
            }
        },

        enterUsing : function (model) {
            this.writeBreak();
            this.writeNormal(" " + Granite.I18n.get("using") + " ");
        },

        enterExpression : function (model) {
            this.writeNormal(" " + Granite.I18n.get("expression") + " ");
            this.writeBreak();
        },

        enterDROPDOWN : function (model) {
            this.enterAFCOMPONENT(model);
        },

        enterOPTIONS_EXPRESSION : function (model) {
            this._currentScriptContext().field = model.items[0].getValue().id;
            this._currentScriptContext().eventName = "Options";
            this.writeStatement(" " + Granite.I18n.get("SET OPTIONS OF") + " ");
            this.writeBreak();
        },

        enterNAVIGATION_EXPRESSION : function (model) {
            this._currentScriptContext().field = model.ctx.currentFieldId;
            this._currentScriptContext().eventName = "Navigation";
            this.writeStatement(" " + Granite.I18n.get("ON NAVIGATION CHANGE") + " ");
            this.writeBreak();
        },

        enterTOOLBAR_BUTTON_OPTIONS : function (model) {
            var option = model.choiceModel.nodeName;
            this.writeKeyword(option + " ");
        },

        enterTOOLBAR_BUTTON : function (model) {
            this.enterAFCOMPONENT(model);
        },

        enterSET_PROPERTY : function (model) {
            this.writeNormal(Granite.I18n.get(" Set "));
            model.items[0].accept(this);
            model.items[1].accept(this);
            if (model.items[2].choiceModel.nodeName == "COMPARISON_EXPRESSION") {
                this.writeLiteral(" " + Granite.I18n.get("TRUE") + " ");
                this.writeKeyword(" " + Granite.I18n.get("WHEN") + " ");
            }
            model.items[2].accept(this);
            return true;
        },

        enterCLEAR_VALUE_STATEMENT : function (model) {
            this.writeNormal(" " + Granite.I18n.get("Clear value of") + " ");
        },

        enterSAVE_FORM : function (model) {
            if (model.ctx.version === '2.0' && !Granite.Toggles.isEnabled(guidelib.author.ConfigUpdater.FT_FORMS_11581)) {
                console.error("Save Form rule can not be modified. Please remove the rule or enable feature toggle.");
            }
            this.writeNormal(Granite.I18n.get("Save Form"));
        },

        enterSUBMIT_FORM : function (model) {
            this.writeNormal(Granite.I18n.get("Submit Form"));
        },

        enterRESET_FORM : function (model) {
            if (model.value && model.value.name) {
                this.writeNormal(" " + Granite.I18n.get("Reset") + " ");
                this._writeVariable(model);
            } else {
                this.writeNormal(" " + Granite.I18n.get("Reset Form") + " ");
            }
        },

        enterVALIDATE_FORM : function (model) {
            if (model.value && model.value.name) {
                this.writeNormal(" " + Granite.I18n.get("Validate") + " ");
                this._writeVariable(model);
            } else {
                this.writeNormal(" " + Granite.I18n.get("Validate Form") + " ");
            }

        },

        enterREPEATABLE_COMPONENT : function (model) {
            this.enterCOMPONENT(model);
        },

        enterSET_FOCUS : function (model) {
            this.writeNormal(Granite.I18n.get("Set Focus to") + " ");
        },

        enterNAVIGATE_IN_PANEL : function (model) {
            this.writeNormal(Granite.I18n.get("Navigate in Panel") + " ");
        },

        enterPANEL_FOCUS_OPTION : function (model) {
            this.writeNormal(Granite.I18n.get("and focus on") + " ");
            var focusOptionType = model.choiceModel.nodeName === "NEXT_ITEM" ? Granite.I18n.get("Next Item") : Granite.I18n.get("Previous Item");
            this.writeVariable(focusOptionType);
            this.writeNormal(" "+Granite.I18n.get("of")+ " ");
        },

        enterADD_INSTANCE : function (model) {
            this.writeNormal(Granite.I18n.get("Add Instance of") + " ");
        },

        enterREMOVE_INSTANCE : function (model) {
            this.writeNormal(Granite.I18n.get("Remove Instance of") + " ");
        },

        enterWSDL_OPTIONS_EXPRESSION : function (model) {
            this.writeNormal(Granite.I18n.get(" Webservice Output: "));
            var val = model.getValue();
            if (val && val.wsdlInfo) {
                //Different summary statement for normal and preconfigured WSDL
                if (val.wsdlInfo.webServiceTitle == null) {
                    this.writeLiteral(val.wsdlInfo.wsdlEndPoint + " ");
                    this.writeBreak();
                    this.writeNormal(Granite.I18n.get("Operation: "));
                    this.writeLiteral(val.wsdlInfo.operationName);
                } else {
                    //Preconfigured WSDL statement just shows the jcr:title for the service
                    this.writeLiteral(val.wsdlInfo.webServiceTitle);
                }
            }
        },

        enterWSDL_VALUE_EXPRESSION : function (model) {
            this.enterWSDL_OPTIONS_EXPRESSION(model);
        },
        getScript : function () {
            var scriptCtx = this._currentScriptContext();
            var scriptObj = this._super.apply(this, arguments);
            var fieldName = scriptCtx.field ? this._getDisplayName(scriptCtx.field) : this.undefinedFieldDisplayName;
            var tooltipTitle = scriptCtx.field ? this._getDisplayName(scriptCtx.field, "displayName") : this.undefinedFieldDisplayName;
            const isCommComposerChannelEnabled = expeditor?.rb?.FeatureToggles?.isCommComposerChannel?.() ?? false;
            const eventNameDisplayText = !isCommComposerChannelEnabled ? ` - ${Granite.I18n.getVar(scriptCtx.eventName)}` : '';
            return $.extend(scriptObj, {
                title: fieldName + eventNameDisplayText,
                tooltipTitle: tooltipTitle + eventNameDisplayText
            });
        },

        enterNAVIGATE_TO : function (model) {
            this.writeNormal(Granite.I18n.get("Navigate to URL") + " ");
        },

        enterNAVIGATE_METHOD_OPTIONS : function (model) {
            this.writeNormal(Granite.I18n.get(" in") + " ");
            var navigationType = model.choiceModel.nodeName;
            var navigationSummary = navigationType === "SAME_TAB" ? "Same Tab" : navigationType === "NEW_TAB" ? "New Tab" : "New Window";
            this.writeVariable(Granite.I18n.get(navigationSummary));
        },

        enterURL_LITERAL : function (model) {
            this.writeLiteral("'" + model.getValue() + "'");
        },

        enterCONCAT(model) {
            if (this.ctx.version === "2.0") {
                this.writeOperator(" " + Granite.I18n.get("&") + " ");
            }
        },

        enterSTRING_LITERAL(model) {
            if (model.getValue() != null) {
                if (this.ctx.version === "2.0") {
                    this.writeLiteral("'" + model.getValue() + "'");
                } else {
                    this._super.apply(this, arguments)
                }
            }
        },

        enterEVENT_PAYLOAD(model) {
            if (model && model.getValue() != null) {
                this.writeLiteral("'" + model.getValue() + "'");
            }
        },

        enterDISPATCH_EVENT : function (model) {
            this.writeLiteral(Granite.I18n.get("Dispatch") + " '");
            model.items[0].accept(this);
            this.writeLiteral("' " + Granite.I18n.get("on") + " ");
            if (model.items[2] && model.items[2].getValue()) {
                model.items[2].accept(this);
            } else {
                this.writeLiteral(Granite.I18n.get("FORM"));
            }
            return true;
        },

        enterASYNC_FUNCTION_CALL: function (model) {
            if (Granite.Toggles.isEnabled("FT_FORMS-13519")) {
                var funcDef = model.getFunctionName();
                if (funcDef && funcDef.displayName) {
                    this.writeNormal(Granite.I18n.get("Wait for Function "));
                    this.writeVariable(funcDef.displayName);
                }
            }
        },

            enterWSDL_STATEMENT: function (model) {

                var val = model.getValue();
                if (val && val.wsdlInfo) {
                    //Different summary statement for normal and preconfigured WSDL
                    if (val.wsdlInfo.wsdlEndPoint) {
                        this.writeNormal(" " + Granite.I18n.get("Invoke Webservice:") + " ");
                        if (val.wsdlInfo.webServiceTitle == null) {
                            this.writeLiteral(val.wsdlInfo.wsdlEndPoint + " ");
                            this.writeBreak();
                            this.writeNormal(Granite.I18n.get("Operation:") + " ");
                            this.writeLiteral(val.wsdlInfo.operationName);
                        } else {
                            //Preconfigured WSDL statement just shows the jcr:title for the service
                            this.writeLiteral(val.wsdlInfo.webServiceTitle);
                        }
                    } else {
                        this.writeNormal(" " + Granite.I18n.get("Invoke Service:") + " ");
                        this.writeLiteral(val.wsdlInfo.operationTitle || val.wsdlInfo.operationName);
                        this.writeBreak();
                        this.writeNormal(Granite.I18n.get(" of FormDataModel:") + " ");
                        this.writeLiteral(val.wsdlInfo.formDataModelId + " ");
                    }
                }
            },

            enterIS_VALID : function (model) {
                this.writeNormal(" " + Granite.I18n.get("is valid"));
            },

            enterIS_NOT_VALID : function (model) {
                this.writeNormal(" " + Granite.I18n.get("is not valid"));
            },

            enterTRIGGER_EVENT_SCRIPTS : function (model) {
                if (model.items.length > 1 && model.items[0].choiceModel != null) {
                    this.writeLogicalOperator(" " + Granite.I18n.get("AND") + " ");
                    model.items[0].choiceModel.accept(this);
                    this.writeBreak();
                }
                this.writeKeyword(" " + Granite.I18n.get("THEN") + " ");
                this.writeBreak();
                if (model.items[2]) {
                    model.items[2].accept(this);
                }
                if (model.items.length > 4) {
                    this.writeKeyword(" " + Granite.I18n.get("ELSE") + " ");
                    this.writeBreak();
                    model.items[4].accept(this);
                }
                return true;
            },

            enterSINGLE_TRIGGER_SCRIPTS : function (model) {
                this._currentScriptContext().field = model.ctx.currentFieldId
                this.writeStatement(" " + Granite.I18n.get("WHEN") + " ");
                this.writeBreak();
            },

            enterTRIGGER_EVENT : function (model) {
                var eventName;
                if (expeditor.rb.FeatureToggles.isCommComposerChannel()) {
                    eventName = model.choiceModel.nodeName;
                } else {
                    eventName = model.value;
                }
                if (RuntimeUtil.eventToEventName.hasOwnProperty(eventName)) {
                    eventName = RuntimeUtil.eventToEventName[eventName];
                }
                if (eventName && eventName.startsWith('custom:')) {
                    eventName = eventName.replace('custom:', '');
                }
                this._currentScriptContext().eventName = eventName;
                this.writeNormal(" " + Granite.I18n.get(eventName) + " ");
                this.writeBreak();
            },

            enterUTM_PARAMETER : function (model) {
                if (model.getValue()) {
                    this.write("UTM Parameter ");
                    this.writeNormal(model.getValue());
                }
            },

            enterQUERY_PARAMETER : function (model) {
                if (model.getValue()) {
                    this.write("Query Parameter ");
                    this.writeNormal(model.getValue());
                }
            },

            enterBROWSER_DETAILS : function (model) {
                if (model.getValue()) {
                    this.write("Browser Parameter ");
                    this.writeNormal(model.getValue());
                }
            },

            enterURL_DETAILS : function (model) {
                if (model.getValue()) {
                    this.write("URL Parameter ");
                    this.writeNormal(model.getValue());
                }
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

                this.write("GetVariable " + variableName + " from " + fieldId);
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

                this.write("SetVariable " + variableName + " to " + variableValue + " on " + fieldId);
                return true;
            }
    });
})(guidelib, fd ? fd._ : _);
