/**
 * @package com.adobe.expeditor.model.ConditionModel
 * @import com.adobe.expeditor.model.ChoiceModel
 */
(function (expeditor) {
    var ConditionModel = expeditor.model.ConditionModel = expeditor.model.ChoiceModel.extend({
        init : function (nodeName, ctx) {
            this._super.apply(this, arguments);
            this.nested = false;
        },

        fromJson : function (jsonObj) {
            this._super.apply(this, arguments);
            this.nested = jsonObj.nested;
            return this;
        },

        toJson : function () {
            var obj = this._super.apply(this, arguments);
            obj.nested = this.nested;
            return obj;
        }
    });
})(expeditor);
