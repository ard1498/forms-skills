/**
 * @package com.adobe.expeditor.model.ChoiceModel
 * @import com.adobe.expeditor.model.BaseModel
 */
(function (expeditor) {
    var ChoiceModel = expeditor.model.ChoiceModel = expeditor.model.BaseModel.extend({
        init : function (nodeName, ctx) {
            this.nodeName = nodeName;
            this.ctx = ctx;
            this.choiceModel = null;
        },

        setChoiceModel : function (m) {
            this.choiceModel = m;
        },

        getChoiceModel : function () {
            return this.choiceModel;
        },

        fromJson : function (jsonObj) {
            this.nodeName = jsonObj.nodeName;
            if (jsonObj.choice !== null) {
                this.choiceModel = expeditor.Utils.ModelFactory.fromJson(jsonObj.choice, this.ctx);
            } else {
                this.choiceModel = null;
            }
            return this;
        },

        toJson : function () {
            var choice = null;
            if (this.choiceModel !== null) {
                choice = this.choiceModel.toJson();
            }
            return {
                nodeName : this.nodeName,
                choice : choice
            };
        },

        accept : function (visitor) {
            if (!this._visitStart(visitor)) {
                if (this.choiceModel) {
                    this.choiceModel.accept(visitor);
                }
            }
            this._visitEnd(visitor);
        },

        validate : function () {
            return this.choiceModel.validate();
        }
    });
})(expeditor);
