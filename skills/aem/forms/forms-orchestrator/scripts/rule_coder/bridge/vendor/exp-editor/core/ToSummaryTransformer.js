/**
 * @import com.adobe.expeditor.rb.BaseTransformer
 * @package com.adobe.expeditor.ToSummaryTransformer
 */
(function (expeditor) {
    var defaultConfig = {
        displayProp : "name"
    };
    var ToSummaryTransformer = expeditor.ToSummaryTransformer = expeditor.rb.BaseTransformer.extend({

        HTML_MODE : 0,
        PLAIN_TEXT_MODE : 1,
        undefinedFieldDisplayName :  Granite.I18n.get("Unknown Field"),
        init : function (ctx, config) {
            this._super.apply(this, arguments);
            this.ctx = ctx;
            this.config = config || defaultConfig;
            this.programCalls = 0;
            this.mode = this.HTML_MODE;
            this.scriptContext = {};
        },

        setMode : function (mode) {
            if (mode === this.HTML_MODE || mode === this.PLAIN_TEXT_MODE) {
                this.mode = mode;
            }
        },

        newScript : function () {
            this.script = "";
            this.scriptContext = {};
            return this;
        },

        _currentScriptContext : function () {
            return this.scriptContext;
        },

        enterROOT : function (model) {
            this.newScript();
            this._currentScriptContext().index = this.programCalls;
            this._currentScriptContext().isvalid = model.getIsValid();
            this._currentScriptContext().enabled = model.getIsEnabled();
        },

        exitROOT : function (model) {
            this.programCalls++;
            this._currentScriptContext().content = this.script;
        },

        enterSTATEMENT : function (model) {
            this._currentScriptContext().title = Granite.I18n.get("Rule") + " " + this.programCalls;
            if (this.mode === this.HTML_MODE) {
                this.write('<span>');
            }
        },

        enterSCRIPTMODEL : function (model) {
            this.newScript();
            if (model.script) {
                var stmt = '<div>';
                stmt += '<code class="summary-script"><pre>' + model.script.content + "</pre></code>";
                this.write(stmt);
                this.write('</div>');
                this._currentScriptContext().content = this.script;
                this._currentScriptContext().field = model.script.field;
                this._currentScriptContext().eventName = model.script.event;
                this._currentScriptContext().index = this.programCalls;
                this._currentScriptContext().isvalid = model.getIsValid();
                this._currentScriptContext().enabled = model.getIsEnabled();
                this._currentScriptContext().isScript = true;
                this.programCalls++;
            }
        },

        IF_STATEMENT : function (model) {
            this.writeStatement(Granite.I18n.get("IF"));
        },

        exitSTATEMENT : function (model) {
            if (this.mode === this.HTML_MODE) {
                this.write("</span>");
            }
        },

        enterTHEN : function (model) {
            this.writeBreak();
            this.writeStatement(" " + Granite.I18n.get("THEN") + " ");
            this.writeBreak();
        },

        enterSET_VALUE_STATEMENT : function (model) {
            this.writeNormal(" " + Granite.I18n.get("Set value of") + " ");
        },

        enterCOMPARISON_EXPRESSION : function (model) {
            this.writeNormal(" " + Granite.I18n.get("("));
        },

        enterVALUE_FIELD : function (model) {
            this._writeVariable(model);
        },

        exitCOMPARISON_EXPRESSION : function (model) {
            this.writeNormal(Granite.I18n.get(")") + " ");
        },

        // TODO : decide whether to keep this or not
        enterTo : function (model) {
            this.writeNormal(" " + Granite.I18n.get("to", null, "Prefixed by: Set value to VARIABLE") + " ");
        },

        //TODO: Need to think of something else. "enterto" looks weird
        enterto : function (model) {
            this.writeNormal(" " + Granite.I18n.get("to", null, "Prefixed by: Set value to VARIABLE") + " ");
        },

        enterNUMERIC_LITERAL : function (model) {
            this.writeLiteral(model.getValue());
        },

        enterDATE_LITERAL : function (model) {
            this.writeLiteral(model.getValue());
        },

        enterBINARY_LITERAL : function (model) {
            this.writeLiteral(model.getValue());
        },

        enterFalse : function () {
            this.writeLiteral(" " + Granite.I18n.get("FALSE") + " ");
        },

        enterTrue : function () {
            this.writeLiteral(" " + Granite.I18n.get("TRUE") + " ");
        },

        _writeVariable : function (model) {
            var valObj = model.getValue();
            if (!expeditor.UnderscoreUtils.isUndefined(valObj) && !expeditor.UnderscoreUtils.isNull(valObj)) {
                if (!expeditor.UnderscoreUtils.isUndefined(valObj.id)) {
                    var scope = this.ctx.getScope();
                    var variable = scope.findVarById(valObj.id);
                    if (expeditor.rb.FeatureToggles.isHighlightBrokenRulesInSummaryViewEnabled()) {
                        // If the variable hierarchy has changed, then the rule is broken.
                        if (variable && variable.foundId !== valObj.id) {
                            // Skip validation for old repeatable field SOM format to avoid false positives
                            // When FT_FORMS-16466 is enabled, old rules may still reference fields using
                            // the previous format: [length(parentSOM) - 1] instead of [getRelativeInstanceIndex(parentSOM)]
                            // This is to avoid marking rule as broken
                            if (valObj.id.indexOf('[length(') !== -1 && Granite.Toggles.isEnabled('FT_FORMS-16466')) {
                                console.debug('ToSummaryTransformer: Skipping validation for old repeatable field SOM format:', valObj.id);
                            } else {
                                variable = null;
                            }
                        }
                    }
                    if (variable === null) {
                        this._writeTag("span", [
                            {
                                name : "class",
                                value : "undefined-variable"
                            },
                            {
                                name : "title",
                                value : Granite.I18n.get("Reference Error : The $$ field with SOM ID $$ is undefined as it has been renamed or removed. Please review and re-save the rule.").replace("$$", valObj.displayName).replace("$$", valObj.id)
                            }
                        ], valObj.displayName || valObj.name);
                        this._currentScriptContext().isvalid = false;
                        if (expeditor.rb.FeatureToggles.isHighlightBrokenRulesInSummaryViewEnabled()) {
                            this._currentScriptContext().isBroken = true;
                        }
                    } else {
                        variable = variable.element;
                        var varDN = variable[this.config.displayProp];
                        this.writeVariable(varDN);
                    }
                } else {
                    variable = valObj.displayName;
                    if (!expeditor.UnderscoreUtils.isUndefined(variable)) {
                        this.writeVariable(variable);
                    }
                }
            }
        },

        /**
         * Write a Tag having tagName, attribute as attrs and text. The values of attribute cannot contain " character
         * @param tagName
         * @param attrs
         * @param text
         * @private
         */
        _writeTag : function (tagName, attrs, text) {
            if (this.mode === this.HTML_MODE) {
                this.write("<" + tagName + " ");
                attrs.forEach(function (attr) {
                    this.write(attr.name + ' = "' + attr.value + '" ');
                }, this);
                this.write(">");
            }
            this.write(text);
            if (this.mode === this.HTML_MODE) {
                this.write("</" + tagName + ">");
            }
        },

        enterCOMPONENT : function (model) {
            this._writeVariable(model);
        },

        enterPRIMITIVE_VARIABLE : function (model) {
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

        enterVARIABLE : function (model) {
            this.writeVariable(model.getId());
        },

        enterBINARY_EXPRESSION : function (model) {
            this.writeNormal(" " + Granite.I18n.get("("));
        },

        exitBINARY_EXPRESSION : function (model) {
            this.writeNormal(Granite.I18n.get(")") + " ");
        },

        enterCALC_EXPRESSION : function (model) {
            this._currentScriptContext().field = model.items[0].getValue().id;
            this.writeStatement(" " + Granite.I18n.get("SET VALUE OF") + " ");
            this.writeBreak();
        },

        enterCONDITION : function (model) {
            if (model.nested) {
                this.writeNormal(" " + Granite.I18n.get("("));
            }
        },

        exitCONDITION : function (model) {
            if (model.nested) {
                this.writeNormal(Granite.I18n.get(")") + " ");
            }
        },

        enterSTRING_LITERAL : function (model) {
            this.writeLiteral(model.getValue());
        },

        enterCONTAINS : function (model) {
            this.writeNormal(" " + Granite.I18n.get("contains") + " ");
        },

        enterDOES_NOT_CONTAIN : function (model) {
            this.writeNormal(" " + Granite.I18n.get("does not contain") + " ");
        },

        enterEQUALS_TO : function (model) {
            this.writeNormal(" " + Granite.I18n.get("is equal to") + " ");
        },

        enterNOT_EQUALS_TO : function (model) {
            this.writeOperator(" " + Granite.I18n.get("≠") + " ");
        },

        enterPLUS : function (model) {
            this.writeOperator(" " + Granite.I18n.get("+") + " ");
        },

        enterMINUS : function (model) {
            this.writeOperator(" " + Granite.I18n.get("-") + " ");
        },

        enterMULTIPLY : function (model) {
            this.writeOperator(" " + Granite.I18n.get("×") + " ");
        },

        enterDIVIDE : function (model) {
            this.writeOperator(" " + Granite.I18n.get("÷") + " ");
        },

        enterLESS_THAN : function (model) {
            this.writeOperator(" " + Granite.I18n.get("<") + " ");
        },

        enterGREATER_THAN : function (model) {
            this.writeOperator(" " + Granite.I18n.get(">") + " ");
        },

        enterSTARTS_WITH : function (model) {
            this.writeNormal(" " + Granite.I18n.get("starts with") + " ");
        },

        enterENDS_WITH : function (model) {
            this.writeNormal(" " + Granite.I18n.get("ends with") + " ");
        },

        enterIS_EMPTY : function (model) {
            this.writeNormal(" " + Granite.I18n.get("is empty"));
        },

        enterIS_NOT_EMPTY : function (model) {
            this.writeNormal(" " + Granite.I18n.get("is not empty"));
        },

        enterHAS_SELECTED : function (model) {
            this.writeNormal(" " + Granite.I18n.get("has selected") + " ");
        },

        enterIS_TRUE : function (model) {
            this.writeNormal(" " + Granite.I18n.get("is true") + " ");
        },

        enterIS_BEFORE : function (model) {
            this.writeNormal(" " + Granite.I18n.get("is before") + " ");
        },

        enterIS_AFTER : function (model) {
            this.writeNormal(" " + Granite.I18n.get("is after") + " ");
        },

        enterIS_FALSE : function (model) {
            this.writeNormal(" " + Granite.I18n.get("is false") + " ");
        },

        enterOR : function (model) {
            this.writeBreak();
            this.writeLogicalOperator(" " + Granite.I18n.get("OR") + " ");
            this.writeBreak();
        },

        enterAND : function (model) {
            this.writeBreak();
            this.writeLogicalOperator(" " + Granite.I18n.get("AND") + " ");
            this.writeBreak();
        },

        writeKeyword : function (str) {
            if (this.mode === this.HTML_MODE) {
                this.write('<span class="summary-keyword">' + str + '</span>');
            } else {
                this.write(str);
            }
        },

        writeOperator : function (str) {
            if (this.mode === this.HTML_MODE) {
                this.write('<span class="summary-operator" >' + str + '</span>');
            } else {
                this.write(str);
            }
        },

        writeLiteral : function (str) {
            if (this.mode === this.HTML_MODE) {
                this.write('<span class="summary-literal" >' + str + '</span>');
            } else {
                this.write(str);
            }
        },

        writeVariable : function (str) {
            if (this.mode === this.HTML_MODE) {
                this.write('<span class="summary-variable" >' + str + '</span>');
            } else {
                this.write(str);
            }
        },

        writeNormal : function (str) {
            if (this.mode === this.HTML_MODE) {
                this.write('<span class="summary-normal" >' + str + '</span>');
            } else {
                this.write(str);
            }
        },

        writeInfo : function (str) {
            if (this.mode === this.HTML_MODE) {
                this.write('<span class="summary-normal" >' +
                    '<coral-icon icon="infoCircle" size="XS" ></coral-icon> ' + str + '</span>');
            } else {
                this.write(str);
            }
        },

        writeLogicalOperator : function (str) {
            if (this.mode === this.HTML_MODE) {
                this.write('<span class="summary-logical-operator" >' + str + '</span>');
            } else {
                this.write(str);
            }
        },

        writeStatement : function (str) {
            if (this.mode === this.HTML_MODE) {
                this.write('<span class="summary-statement" >' + str + '</span>');
            } else {
                this.write(str);
            }
        },

        writeBreak : function () {
            if (this.mode === this.HTML_MODE) {
                this.write("<br class='summary-break' />");
            }
        },

        enterOf : function () {
            this.writeNormal(" " + Granite.I18n.get("of") + " ");
        },

        enterPROPERTY_LIST : function (model) {
            this.writeVariable(model.getValue());
            this.writeNormal(" " + Granite.I18n.get("property of") + " ");
        },

        enterWSDL_STATEMENT : function (model) {

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
                    this.writeNormal(Granite.I18n.get("of FormDataModel:") + " ");
                    this.writeLiteral(val.wsdlInfo.formDataModelId + " ");
                }
            }
        },

        exitWSDL_STATEMENT : function (model) {
        },

        enterFUNCTION_CALL : function (model) {
            var funcDef = model.getFunctionName();
            if (funcDef && funcDef.displayName) {
                if (expeditor.rb.FeatureToggles.isHighlightBrokenRulesInSummaryViewEnabled()) {
                    var scope = this.ctx.getScope();
                    var func = scope.findFunctionById(funcDef.id);
                    if (func === null) {
                        this.writeNormal(" (" + Granite.I18n.get("Output of Function") + " ");
                        this._writeTag("span", [{
                            name : "class",
                            value : "undefined-variable"
                        }, {
                            name : "title",
                            value : Granite.I18n.get("Reference Error : The $$ function is undefined.").replace("$$", funcDef.displayName)
                        }], funcDef.displayName);
                        this.writeNormal(") ");
                        this._currentScriptContext().isvalid = false;
                        this._currentScriptContext().isBroken = true;
                    } else {
                        this.writeNormal(" (" + Granite.I18n.get("Output of Function") + " " + Granite.I18n.get(funcDef.displayName) + ") ");
                    }
                } else {
                    this.writeNormal(" (" + Granite.I18n.get("Output of Function") + " " + Granite.I18n.get(funcDef.displayName) + ") ");
                }
            }
        },

        _getDisplayName : function (id, displayProp) {
            var scope = this.ctx.getScope();
            var variable = scope.findVarById(id);
            if (variable == null) {
                return this.undefinedFieldDisplayName;
            }
            var _displayProp = displayProp;
            if (_displayProp == null) {
                _displayProp = this.config.displayProp;
            }
            var varDN = variable.element[_displayProp];
            return varDN;
        },

        getScript : function () {
            var scriptObj = {
                content : this._currentScriptContext().content,
                title : this._currentScriptContext().title,
                index : this._currentScriptContext().index,
                isvalid : this._currentScriptContext().isvalid,
                eventName : this._currentScriptContext().eventName,
                enabled : this._currentScriptContext().enabled,
                isScript : this._currentScriptContext().isScript,
                isProxyRule : this._currentScriptContext().isProxyRule
            };
            if (expeditor.rb.FeatureToggles.isHighlightBrokenRulesInSummaryViewEnabled()) {
                scriptObj.isBroken = this._currentScriptContext().isBroken;
            }
            return scriptObj;
        },
        enterJSPEL_EXPRESSION : function (model) {
            this.writeLiteral(Granite.I18n.get("Output of JSP Expression {0}", model.getValue()));
        }
    });
})(expeditor);
