/**
 * @package com.adobe.expeditor.model.TerminalModel
 * @import com.adobe.expeditor.model.BaseModel
 */
(function (expeditor) {
    var TerminalModel = expeditor.model.TerminalModel = expeditor.model.BaseModel.extend({
        init : function (nodeName, ctx) {
            this.nodeName = nodeName;
            this.ctx = ctx;
            this.value = null;
        },

        setValue : function (val) {
            this.value = val;
        },

        fromJson : function (jsonObj) {
            if (typeof jsonObj.value === "object" && jsonObj.value !== null) {
                this.value = expeditor.Utils.deepClone(jsonObj.value);
            } else {
                this.value = jsonObj.value;
            }
            return this;
        },

        getValue : function () {
            return this.value;
        },

        toJson : function () {
            return {nodeName : this.nodeName, value : this.getValue()};
        },

        validate : function () {
            return this.value !== null;
        }

    });
})(expeditor);
