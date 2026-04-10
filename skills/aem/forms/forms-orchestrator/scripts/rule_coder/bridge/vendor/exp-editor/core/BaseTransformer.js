/**
 * @package com.adobe.expeditor.rb.BaseTransformer
 */
(function (expeditor) {
    var machine_generated_script_prefix = "/**\n",
        machine_generated_script_suffix = "\n * This is a machine-generated code for the rule.\n" +
            " * If you modify it in the code editor, you will not be able to view and edit the rule in the visual editor.\n" +
            " */\n\n";
    var BaseTransformer = expeditor.rb.BaseTransformer = expeditor.Class.extend({

        CODE_EDITOR_MODE : 0,
        MERGE_MODE : 1,

        init : function () {
            this.reset();
            this.bAddCopyRightHeader = true;
            this.mode = this.CODE_EDITOR_MODE;
            this.copyrightMessage = "";
        },

        setContext : function (ctx) {
            this.ctx = ctx;
        },

        setMode : function (mode) {
            if (mode === this.CODE_EDITOR_MODE || mode === this.MERGE_MODE) {
                this.mode = mode;
            }
        },

        setAddCopyrightHeader : function (bAddCopyrightHeader) {
            this.bAddCopyRightHeader = bAddCopyrightHeader;
        },

        setCopyrightMessage : function (message) {
            this.copyrightMessage = message;
        },

        getCopyrightHeader : function () {
            return machine_generated_script_prefix + this.copyrightMessage + machine_generated_script_suffix;
        },

        write : function (str) {
            if (str != null) {
                this.script += str;
            }
            return this;
        },

        writeLn : function (str) {
            this.write(str);
            this.write("\n");
            return this;
        },

        getScript : function () {
            return {
                content : this.script
            };
        },

        newScript : function () {
            if (this.bAddCopyRightHeader) {
                this.script = this.getCopyrightHeader();
            }
            return this;
        },

        reset : function () {
            this.script = "";
            this.bAddCopyRightHeader = true;
        }
    });
})(expeditor);
