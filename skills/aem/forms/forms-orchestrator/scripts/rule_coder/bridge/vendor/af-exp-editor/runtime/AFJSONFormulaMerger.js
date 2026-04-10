/*************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 *  Copyright 2022 Adobe Systems Incorporated
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and are protected by all applicable intellectual property
 * laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 **************************************************************************/
(function (_) {
    var RuntimeUtil = guidelib.RuntimeUtil;

    /**
     * Events that require variableAssignment and Merge with || operator
     * @type {string[]}
     */
    var events = ["Value Commit", "Click", "Initialize"]

    var afScriptMerger = guidelib.author.AFJSONFormulaMerger = {
        /**
         * Each element Script Array is of the type
         * {
         *   field : <field_name>
         *   event : <event>
         *   modelName : <modelName>
         *   content : <script_content>
         * }
         * @param scriptArray
         */
        mergeScript : function (scriptArray) {
            var fields = {};
            scriptArray.forEach(function (script) {
                var field = script.field,
                    eventName = script.event;
                var isEvent = events.indexOf(eventName) > -1 || (eventName && eventName.startsWith("custom:"));
                fields[field] = fields[field] || {};
                fields[field][eventName] = fields[field][eventName] ||
                    {
                        content : (isEvent ? [] : "")
                    };
                var currentContent = fields[field][eventName].content
                if (isEvent) {
                    if ("Value Commit" === eventName) {
                        script.content = script.content.map(function(scriptLine) {
                            return "if(contains($event.payload.changes[].propertyName, 'value'), "+scriptLine+", {})";
                        });
                    }
                    fields[field][eventName].content = currentContent.concat(script.content)
                } else {
                    fields[field][eventName].content = currentContent ?
                        currentContent + " || " + script.content : script.content
                }
            }, this);
            return fields;
        }
    };
}(fd._));
