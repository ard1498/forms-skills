/**
 * @package com.adobe.expeditor.model.BaseModel
 */
(function (expeditor) {
    var BaseModel = expeditor.model.BaseModel = expeditor.Class.extend({

        init : function (nodeName, ctx) {
            this.nodeName = nodeName;
            this.ctx = ctx;
        },

        /**
         * convenience methods
         *
         */
        _visitStart : function (visitor) {
            var fn = visitor["enter" + this.nodeName];

            if (fn) {
                return fn.call(visitor, this);
            } else {
                return false;
            }
        },

        _visitEnd : function (visitor) {
            var fn = visitor["exit" + this.nodeName];

            if (fn) {
                return fn.call(visitor, this);
            } else {
                return false;
            }
        },

        setVersion : function (version) {
            this.version = version;
        },

        accept : function (visitor) {
            this._visitStart(visitor);
            this._visitEnd(visitor);
        },

        validate : function () {

        },

        copy : function () {
            return expeditor.Utils.ModelFactory.fromJson(this.toJson(), this.ctx);
        },

        destroy : function () {
        }

    });
})(expeditor);
