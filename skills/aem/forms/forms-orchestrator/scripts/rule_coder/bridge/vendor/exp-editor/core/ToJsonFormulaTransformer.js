/**
 * @import com.adobe.expeditor.rb.BaseTransformer
 * @package com.adobe.expeditor.rb.ToJsonFormulaTransformer
 */
(function (expeditor) {

    // todo: add 'HAS_SELECTED':
    var OperatorToFnMapping = {
        'CONTAINS' : 'contains',
        'STARTS_WITH' : 'startsWith',
        'ENDS_WITH' : 'endsWith',
        'DOES_NOT_CONTAIN' : '!contains'
    };

    var ToJsonFormulaTransformer = expeditor.rb.ToJsonFormulaTransformer = expeditor.rb.BaseTransformer.extend({

        init : function () {
            this._super.apply(this);
            this.bAddCopyRightHeader = false;
        },

        enterROOT : function (model) {
            this.reset();
            this.newScript();
        },

        exitSTATEMENT : function (model) {

        },

        exitBLOCK_STATEMENT : function (model) {

        },

        enterIF_STATEMENT : function (model) {
            this.write("if(");
            model.items[0].accept(this);
            this.write(", ");
            model.items[2].accept(this);
            this.write(", {})");
            return true;
        },

        enterSET_VALUE_STATEMENT : function (model) {
            model.items[0].accept(this);
            this.write(" = ");
            model.items[2].accept(this);
            return true;
        },

        enterBINARY_EXPRESSION : function (model) {
            this.write("(");
            return this._handleUnaryOperators(model) || this._handleFunctionalOperator(model);
        },

        exitBINARY_EXPRESSION : function (model) {
            this.write(")");
        },

        enterSTARTS_WITH : function (model) {
            throw "should be handled by the parent model";
        },

        enterHAS_SELECTED : function (model) {
            throw "should be handled by the parent model";
        },

        enterIS_TRUE : function (model) {
            this.write(" == true() ");
        },

        enterIS_FALSE : function (model) {
            this.write(" == false() ");
        },

        enterENDS_WITH : function (model) {
            throw "should be handled by the parent model";
        },

        enterSTRING_LITERAL : function (model) {
            this.write("'" + model.getValue() + "'");
        },

        enterNUMERIC_LITERAL : function (model) {
            this.write(model.getValue());
        },

        enterDATE_LITERAL : function (model) {
            this.write("'" + model.getValue() + "'");
        },

        enterBINARY_LITERAL : function (model) {
            this.write('"' + model.getValue() + '"');
        },

        enterVARIABLE : function (model) {
            this.write(model.getValue());
        },

        enterPLUS : function (model) {
            this.write(" + ");
        },

        enterMINUS : function (model) {
            this.write(" - ");
        },

        enterDIVIDE : function (model) {
            this.write(" / ");
        },

        enterMULTIPLY : function (model) {
            this.write(" * ");
        },

        enterLESS_THAN : function () {
            this.write(" < ");
        },

        enterGREATER_THAN : function () {
            this.write(" > ");
        },

        enterEQUALS_TO : function () {
            this.write(" == ");
        },

        enterNOT_EQUALS_TO : function () {
            this.write(" != ");
        },

        enterAND : function () {
            this.write(" && ");
        },

        enterOR : function () {
            this.write(" || ");
        },

        enterCONTAINS : function () {
            throw "should be handled by the parent model";
        },

        enterDOES_NOT_CONTAIN : function () {
            throw "should be handled by the parent model";
        },

        enterTrue : function () {
            this.write("true()");
        },

        enterFalse : function () {
            this.write("false()");
        },

        enterPRIMITIVE_VARIABLE : function (model) {
            var val = model.getValue();
            this.write(val.id);
            if (expeditor.Utils.isPrimitive(val.type)) {
                this.write(".value");
            }
        },

        exitPRIMITIVE_VARIABLE : function () {

        },

        _handleUnaryOperators : function (model) {
            var operator = expeditor.Utils.getOrElse(model.get(1), "choiceModel.nodeName", null);
            if (operator === 'IS_EMPTY') {
                this.write("!(");
                model.get(0).accept(this);
                this.write(")");
                return true;
            }
            if (operator === 'IS_NOT_EMPTY') {
                this.write("!(!(");
                model.get(0).accept(this);
                this.write("))");
                return true;
            }

            if (operator === 'IS_TRUE' || operator === 'IS_FALSE') {
                model.get(0).accept(this);
                model.get(1).accept(this);
                return true;
            }
        },

        _handleDateOperators : function (model) {
            var operator = expeditor.Utils.getOrElse(model.get(1), "choiceModel.nodeName", null);
            if (operator === "IS_BEFORE" || operator === "IS_AFTER") {
                var oldScript = this.script;
                this.script = "";
                model.get(0).accept(this);
                this.script = oldScript + "dateToDaysSinceEpoch(" + this.script + ")";
                switch (operator) {
                    case "IS_BEFORE":
                        this.write("<");
                        break;
                    case "IS_AFTER":
                        this.write(">");
                        break;
                    default:
                        throw "Invalid operator";
                }
                oldScript = this.script;
                this.script = "";
                model.get(2).accept(this);
                this.script = oldScript + "dateToDaysSinceEpoch(" + this.script + ")";
                return true;
            }
        },

        _writeFunction : function (fnName, models) {
            this.write(fnName + "(");
            var self = this;
            models.forEach(function (m, i) {
                m.accept(self);
                var sep = (i === models.length - 1) ? '' : ', ';
                self.write(sep);
            });
            this.write(')');
        },

        _handleFunctionalOperator : function (model) {
            var operator = expeditor.Utils.getOrElse(model.get(1), "choiceModel.nodeName", null);
            if (OperatorToFnMapping.hasOwnProperty(operator)) {
                var input = [model.get(0), model.get(2)];
                this._writeFunction(OperatorToFnMapping[operator], input);
                return true;
            }
            return false;
        },

        enterCOMPARISON_EXPRESSION : function (model) {
            return this._handleFunctionalOperator(model) || this._handleUnaryOperators(model) || this._handleDateOperators(model);
        },

        enterCONDITION : function (model) {
            if (model.nested) {
                this.write("(");
            }
        },

        exitCONDITION : function (model) {
            if (model.nested) {
                this.write(")");
            }
        },

        enterBOOLEAN_BINARY_EXPRESSION : function (model) {
            return this._handleFunctionalOperator(model);
        },

        enterCOMPONENT : function (model) {
            this.write(model.getValue());
        },

        enterMEMBER_EXPRESSION : function (model) {
            model.items[2].accept(this);
            this.write(".");
            model.items[0].accept(this);
            return true;
        },

        enterPROPERTY_LIST : function (model) {
            this.write("$" + model.getValue());
        },

        enterFUNCTION_CALL : function (model) {
            var funcDef = model.getFunctionName(),
                impl = funcDef.impl,
                self = this;
            /* Function Implementation is of the type $<NUM>($<NUM>, $<NUM>)
             * Currently any $<NUM> will be replaced by the transformation of <NUM> argument
             * where 0th argument is the function id.
             * $ not following a number will be replaced by $ only
             * If the implementation wants to escape a $<NUM> we have to modify the regex
             * below to
             *  /\\(?=\$)\$|\$([\d]+)|./g,
             *  And to escape, the user has to write $0($1, \\$3)
             *
             */
            impl.replace(/\$([\d]+)|./g, function (match, n1, offset) {
                if (n1 && n1.length > 0) {
                    var num = +n1;
                    if (num === 0) {
                        self.write(funcDef.id);
                    } else {
                        if (model.getParameter(num - 1).getChoiceModel() == null) { // means optional parameter is not set
                            self.write("undefined");
                        } else {
                            model.getParameter(num - 1).accept(self);
                        }
                    }
                } else {
                    self.write(match);
                }
            });
        }

    });
})(expeditor);
