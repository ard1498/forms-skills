/**
 * @package com.adobe.expeditor.model.ScriptModel
 * @import com.adobe.expeditor.model.BaseModel
 */
(function (expeditor) {
    var ScriptModel = expeditor.model.ScriptModel = expeditor.model.BaseModel.extend({
        init : function () {
            this._super.apply(this, arguments);
            this.script = {
                content : "",
                event : ""
            };
            this.enabled = true;
        },

        setScript : function (script) {
            this.script = script;
            return this;
        },

        toJson : function () {
            return {
                script : expeditor.Utils.extend({}, this.script),
                nodeName : this.nodeName,
                version : this.version,
                enabled : this.enabled
            };
        },

        fromJson : function (json) {
            this.script = json.script;
            this.version = json.version || 0;
            this.enabled = json.enabled !== undefined ? json.enabled : true;
            return this;
        },

        fixModel : function (jsonConfig) {
            if (jsonConfig[this.nodeName]) { // fix id of script model
                var model = jsonConfig[this.nodeName];
                var fieldId = expeditor.Utils.getOrElse(model, "script.field", null);
                if (fieldId) {
                    this.script.field = fieldId;
                }
            }
        },

        getIsValid : function () {
            //Checks if script is has event to be valid.
            return !expeditor.UnderscoreUtils.isEmpty(this.script.event);
        },

        getIsEnabled : function () {
            return this.enabled;
        },

        setEnabled : function (flag) {
            this.enabled = flag;
        }
    });
})(expeditor);
