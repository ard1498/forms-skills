/**
 * @package com.adobe.expeditor.model.FunctionModel
 * @import com.adobe.expeditor.model.BaseModel
 */
(function (expeditor) {
    var parameterConfig = {
        extras : {
            component : {
                dataType : 'ANY'
            },
            view : {
                inline : true
            }
        }
    };
    var FunctionModel = expeditor.model.FunctionModel = expeditor.model.BaseModel.extend({
        init : function (nodeName, ctx, extraConfig) {
            this._super.apply(this, arguments);
            this.parameters = [];
            this.parentNodeName = null;
        },

        setFunctionName : function (value) {
            this.functionName = value;
        },

        getFunctionName : function () {
            return this.functionName;
        },

        setParameter : function (index, paramModel) {
            this.parameters[index] = paramModel;
        },

        setParameters : function (parameters) {
            this.parameters = parameters;
        },

        getParameters : function () {
            return this.parameters;
        },

        getParameter : function (index) {
            return this.parameters[index];
        },

        setParentNodeName : function (parentNodeName) {
            this.parentNodeName = parentNodeName;
        },

        getParentNodeName : function () {
            return this.parentNodeName;
        },

        resetParameters : function () {
            this.parameters = [];
        },

        toJson : function () {
            return {
                nodeName : this.nodeName,
                parentNodeName : this.parentNodeName,
                functionName : this.functionName,
                params : this.parameters.map(function (param) {
                    return param.toJson();
                })
            };
        },

        fromJson : function (json) {
            this.nodeName = json.nodeName;
            this.parentNodeName = json.parentNodeName;
            this.functionName = json.functionName;
            this.parameters = json.params.map(function (paramJson) {
                var paramConfig = expeditor.Utils.extend({}, parameterConfig);
                return this.ctx.createModel("EXPRESSION", paramConfig).fromJson(paramJson);
            }, this);
            return this;
        }
    });
})(expeditor);
