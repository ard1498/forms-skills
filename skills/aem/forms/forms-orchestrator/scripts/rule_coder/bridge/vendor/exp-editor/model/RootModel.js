/**
 * @package com.adobe.expeditor.model.RootModel
 * @import com.adobe.expeditor.model.SequenceModel
 */
(function (expeditor) {
    var RootModel = expeditor.model.RootModel = expeditor.model.SequenceModel.extend({
        init : function (nodeName, ctx) {
            this._super.apply(this, arguments);
            this.isValid = false;
            this.enabled = true;
            /**
             * showOptionalParamDiscardWarning flag is used to show warning dialog modal. It can have the following values:
             * undefined : denotes that user has not seen the warning model dialog yet or user has chosen to Cancel the rule save operation.
             * false : if user has chosen to Save rule in warning dialog modal by discarding the incomplete optional function param.
             * true : if we have found incomplete optional function param and user has not chosen to Save the rule after warning yet.
             * @type {boolean|undefined}
             */
            this.showOptionalFunctionParamDiscardWarning = undefined;
        },

        fromJson : function (jsonObj) {
            this._super.apply(this, arguments);
            this.isValid = jsonObj.isValid;
            this.version = jsonObj.version || 0;
            this.enabled = jsonObj.enabled !== undefined ? jsonObj.enabled : true;
            return this;
        },

        toJson : function () {
            var obj = this._super.apply(this, arguments);
            obj.isValid = this.isValid;
            obj.enabled = this.enabled;
            obj.version = this.version;
            return obj;
        },

        setIsValid : function (flag) {
            this.isValid = flag;
        },

        getIsValid : function () {
            return this.isValid;
        },

        getIsEnabled : function () {
            return this.enabled;
        },

        setEnabled : function (flag) {
            this.enabled = flag;
        },

        setShowOptionalFunctionParamDiscardWarning : function (flag) {
            this.showOptionalFunctionParamDiscardWarning = flag;
        },

        getShowOptionalFunctionParamDiscardWarning : function () {
            return this.showOptionalFunctionParamDiscardWarning;
        },
    });
})(expeditor);
