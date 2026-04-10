/**
 * @package com.adobe.expeditor.model.ListModel
 * @import com.adobe.expeditor.model.BaseModel
 */
(function (expeditor) {
    var ListModel = expeditor.model.ListModel = expeditor.model.BaseModel.extend({
        init : function (nodeName, ctx) {
            this.nodeName = nodeName;
            this.ctx = ctx;
            this.items = [];
        },

        add : function (model) {
            this.items.push(model);
        },

        remove : function (index) {
            this.items.splice(index, 1);
        },

        move : function (index, newIndex) {
            this.items.splice(newIndex, 0, this.items.splice(index, 1)[0]);
        },

        get : function (index) {
            return this.items[index];
        },

        size : function () {
            return this.items.length;
        },

        set : function (index, model) {
            if (index > -1 && index < this.items.length) {
                this.items[index] = model;
            }
        },

        setItems : function (items) {
            this.items = items;
        },

        clear : function () {
            this.items = [];
        },

        fromJson : function (jsonObj) {
            var jsonItems = jsonObj.items;
            this.nodeName = jsonObj.nodeName;
            this.clear();
            if (jsonItems) {
                for (var i = 0; i < jsonItems.length; i++) {
                    this.add(expeditor.Utils.ModelFactory.fromJson(jsonItems[i], this.ctx));
                }
            }
            return this;
        },

        toJson : function () {
            var obj = {
                nodeName : this.nodeName,
                items : []

            };
            for (var i = 0; i < this.items.length; i++) {
                obj.items.push(this.items[i].toJson());
            }
            return obj;
        },

        validate : function () {
            var isValid = true;
            for (var i = 0; i < this.items.length; i++) {
                isValid = isValid && this.items[i].validate();
            }
            return isValid;
        },

        accept : function (visitor) {
            if (!this._visitStart(visitor)) {
                for (var i = 0; i < this.items.length; i++) {
                    this.items[i].accept(visitor);
                }
            }
            this._visitEnd(visitor);
        }
    });
})(expeditor);
