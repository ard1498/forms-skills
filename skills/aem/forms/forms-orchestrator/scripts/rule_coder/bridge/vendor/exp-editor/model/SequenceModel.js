/**
 * @package com.adobe.expeditor.model.SequenceModel
 * @import com.adobe.expeditor.model.BaseModel
 */
(function (expeditor) {
    var SequenceModel = expeditor.model.SequenceModel = expeditor.model.BaseModel.extend({
        init : function (nodeName, ctx) {
            this.nodeName = nodeName;
            this.ctx = ctx;
            this.items = [];
        },

        set : function (position, model) {
            this.items[position] = model;
        },

        get : function (position) {
            return this.items[position];
        },

        fromJson : function (jsonObj) {
            this.nodeName = jsonObj.nodeName;
            var jsonItems = jsonObj.items;
            if (jsonItems) {
                this.items = [];
                for (var i = 0; i < jsonItems.length; i++) {
                    var childModel = expeditor.Utils.ModelFactory.fromJson(jsonItems[i], this.ctx);
                    this.items.push(childModel);
                }
            }
            return this;
        },

        toJson : function () {
            var obj = {nodeName : this.nodeName, items : []};
            if (this.items) {
                for (var i = 0; i < this.items.length; i++) {
                    obj.items.push(this.items[i].toJson());
                }
            }
            return obj;
        },

        accept : function (visitor) {
            if (!this._visitStart(visitor)) {
                for (var i = 0; i < this.items.length; i++) {
                    this.items[i].accept(visitor);
                }
            }
            this._visitEnd(visitor);
        },

        validate : function () {
            var valid = true;
            for (var i = 0; i < this.items.length && valid; i++) {
                valid = valid && this.items[i].validate();
            }
            return valid;
        },

        /**
         * API fixes the model provided the jsonModel of its children.
         * @param jsonConfig
         */
        fixModel : function (jsonConfig) {
            if (typeof jsonConfig === "object" && jsonConfig !== null) {
                this.items.forEach(function (item) {
                    if (jsonConfig[item.nodeName]) {
                        item.fromJson(jsonConfig[item.nodeName]);
                    }
                });
            }
        }
    });
})(expeditor);
