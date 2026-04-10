/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
*  Copyright 2015 Adobe Systems Incorporated
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

/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var defaultConfig = {
    choice : {
        component : 'expeditor.component.ChoiceComponent',
        model : 'expeditor.model.ChoiceModel',
        view : 'expeditor.view.ChoiceView'
    },
    sequence : {
        component : 'expeditor.component.SequenceComponent',
        model : 'expeditor.model.SequenceModel',
        view : 'expeditor.view.SequenceView'
    },
    list : {
        component : 'expeditor.component.ListComponent',
        model : 'expeditor.model.ListModel',
        view : 'expeditor.view.ListView'
    },
    terminal : {
        component : 'expeditor.component.TerminalComponent',
        model : 'expeditor.model.TerminalModel',
        view : 'expeditor.view.TerminalView'
    },
    variable : {
        component : 'expeditor.component.VariableComponent',
        model : 'expeditor.model.TerminalModel',
        view : 'expeditor.view.VariableView'
    }
};
var nativeForEach = Array.prototype.forEach;
var breaker = {};
var ObjProto = Object.prototype;
var hasOwnProperty = ObjProto.hasOwnProperty;
var slice = Array.prototype.slice;
var toString = ObjProto.toString;
var templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
};
var noMatch = /.^/;
var escapes = {
    '\\' : '\\',
    "'" : "'",
    'r' : '\r',
    'n' : '\n',
    't' : '\t',
    'u2028' : '\u2028',
    'u2029' : '\u2029'
};
var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
var unescaper = /\\(\\|'|r|n|t|u2028|u2029)/g;
var nativeIsArray = Array.isArray;

(function (expeditor) {

    var Utils = expeditor.Utils = {

        getCurrentVersion : function () {
            return 1;
        },

        getPrimitiveArrayTypes : function () {
            return ["STRING[]", "NUMBER[]", "BOOLEAN[]", "DATE[]"];
        },

        getPrimitiveTypes : function () {
            return ["STRING", "NUMBER", "BOOLEAN", "DATE", "BINARY"];
        },

        chomp : function (str) {
            if (typeof str === "string") {
                return str.replace(/.$/, "");
            }
            return str;
        },

        excerpts : function (code, maxLines) {
            if (typeof code !== "string") {
                return code;
            }
            var lines = code.split("\n"),
                excerpt = code,
                _maxLines = maxLines || 3,
                excerptArray = new Array(_maxLines),
                i;
            if (lines.length > _maxLines) {
                excerptArray[0] = lines[0];
                for (i = 1; i < _maxLines - 1; i++) {
                    excerptArray[i] = ".....";
                }
                excerptArray[_maxLines - 1] = lines[lines.length - 1];
                excerpt = excerptArray.join("\n");
            }
            return excerpt;
        },

        trimString : function (arr) {
            if (typeof arr === "string") {
                return arr.trim();
            }
            if (!(arr instanceof Array)) {
                return arr;
            }
            var newArr = [], index;
            for (index = 0; index < arr.length; index++) {
                var str = arr[index];
                newArr[index] = typeof str === "string" ? str.trim() : str;
            }
            return newArr;
        },

        isPrimitive : function (type) {
            if (type == null || (typeof type !== "string" && !(type instanceof Array))) {
                return false;
            }
            if (!(type instanceof Array)) {
                type = Utils.trimString(type.split("|"))[0];
            }
            return this.getPrimitiveTypes().indexOf(type) > -1;
        },

        filterPrimitiveTypes : function (type) {
            return this.getCompatibleTypes(this.getPrimitiveTypes(), type);
        },

        isTypesCompatible : function (type1, type2) {
            if (type1 == null || type2 == null) {
                return false;
            }
            if (!(type1 instanceof Array)) {
                type1 = type1.split("|").map(function (type) {return type.trim();});
            }
            if (!(type2 instanceof Array)) {
                type2 = type2.split("|").map(function (type) {return type.trim();});
            }
            return type1.indexOf("ANY") > -1 ||
                type2.indexOf("ANY") > -1 ||
                type2.some(function (type) {
                    return type1.indexOf(type) > -1;
                });
        },

        getRenderCondition : function (config, child, childConfig) {
            var condition = Utils.getOrElse(config, child, null);
            if (condition === null) {
                condition = Utils.getOrElse(childConfig, "extras.component.renderCondition", true);
            }
            return condition;
        },

        getCompatibleTypes : function (type1, type2) {
            if (type1 === null || type2 === null) {
                return "";
            }
            if (!(type1 instanceof Array)) {
                type1 = type1.split("|").map(function (type) {return type.trim();});
            }
            if (!(type2 instanceof Array)) {
                type2 = type2.split("|").map(function (type) {return type.trim();});
            }
            var iterType1 = 0,
                result = "";
            if (type1.indexOf("ANY") > -1) {
                return type2.join("|");
            }
            if (type2.indexOf("ANY") > -1) {
                return type1.join("|");
            }
            for (; iterType1 < type1.length; iterType1++) {
                if (type2.indexOf(type1[iterType1]) > -1) {
                    result += type1[iterType1] + "|";
                }
            }
            return result.replace(/\|$/, "");
        },

        isTypeSame : function (type1, type2) {
            if (type1 == null || type2 == null) {
                return false;
            }
            if (type1 === type2) {
                return true;
            }
            if (!(type1 instanceof Array)) {
                type1 = Utils.trimString(type1.split("|"));
            }
            if (!(type2 instanceof Array)) {
                type2 = Utils.trimString(type2.split("|"));
            }
            if (type2.length !== type1.length) {
                return false;
            }
            var iterType1 = 0, isSame = true;
            for (; iterType1 < type1.length && isSame; iterType1++) {
                isSame = isSame && type2.indexOf(type1[iterType1]) > -1;
            }
            return isSame;
        },

        getOrElse : function (obj) {
            var currObject = obj;
            if (arguments.length < 2) {
                return currObject;
            } else if (arguments.length == 2) {
                if (!expeditor.UnderscoreUtils.isUndefined(currObject)) {
                    return currObject;
                } else {
                    return expeditor.UnderscoreUtils.clone(arguments[1]);
                }
            } else {
                var propChain = (arguments[1] || "").split(".");
                var defaultValue = arguments[2];
                expeditor.UnderscoreUtils.each(propChain, function (prop) {
                    if (expeditor.UnderscoreUtils.isObject(currObject)) {
                        currObject = currObject[prop];
                    } else {
                        currObject = undefined;
                    }
                });

                if (!expeditor.UnderscoreUtils.isUndefined(currObject)) {
                    return currObject;
                } else {
                    return expeditor.UnderscoreUtils.clone(defaultValue); //May have to do deep clone in future. TODO: support for conditional clone
                }
            }
        },

        getClassForName : function (className) {
            return Utils.getOrElse(window, className, null);
        },

        ModelFactory : {
            //TODO : identify how models created with custom configuration will be cloned
            fromJson : function (json, ctx) {
                var model = ctx.createModel(json.nodeName).fromJson(json);
                if (typeof model.fixModel === "function") {
                    var jsonConfig = Utils.getOrElse(ctx.getConfig(json.nodeName), "jsonModel", null);
                    if (jsonConfig != null) {
                        model.fixModel(jsonConfig);
                    }
                }
                return model;
            }
        },

        getChildRules : function (rule) {
            var children = [];
            if (typeof rule !== "string") {
                return children;
            }
            if (rule.match(/\|/)) {
                children = rule.split(/\|/).map(function (option) {
                    return option.trim();
                }).filter(function (option) {
                    return option != null && option.length > 0;
                });
            } // check for list rule
            else if (rule.match(/\+$/)) {
                var child = rule.replace(/\+$/, "").trim();
                children = [child];
            } else if (rule.match(/\*$/)) {
                var child = rule.replace(/\*$/, "").trim();
                children = [child];
            } else { // sequence rule
                children = rule.trim().split(" ").map(function (option) {
                    return option.trim();
                }).filter(function (option) {
                    return option != null && option.length > 0;
                });
            }
            return children;
        },

        _getRuleImpl : function (rule) {
            var config = {};
            var children = this.getChildRules(rule);
            config.children = children;
            // check for choice rule
            if (rule.match(/\|/)) {
                config.impl = Utils.extend({}, defaultConfig.choice);
            } // check for list rule
            else if (rule.match(/\+$/)) {
                config.impl = Utils.extend({}, defaultConfig.list);
                config.extras = config.extras || {};
                config.extras.component = {minCount : 1};
            }else if (rule.match(/\*$/)) {
                config.impl = Utils.extend({}, defaultConfig.list);
                config.extras = config.extras || {};
                config.extras.component = {minCount : 0};
            } else if (rule == "VARIABLE") {
                config.impl = Utils.extend({}, defaultConfig.variable);
            } else { // sequence rule
                config.impl = Utils.extend({}, defaultConfig.sequence);
            }
            return config;
        },

        listModelToScript : function (listModel, transformer) {
            transformer.setMode(transformer.MERGE_MODE);
            transformer.setAddCopyrightHeader(false);
            return listModel.items.filter(function (model) {
                return (model.getIsValid() && model.getIsEnabled());
            }).map(function (model) {
                model.accept(transformer);
                return transformer.getScript();
            });
        },

        /**
         * encodes <script> and </script> with &lt;script&gt; and *lt;/script&gt;
         * and also img,video and audio tag respectively
         *
         * other tags are being removed since scripts can be run through
         * <img onerror="script" /> (same for audio and video)
         */
        encodeScriptableTags : function (str) {
            var index;
            if (expeditor.UnderscoreUtils.isString(str)) {
                return str.replace(/<(\/?)(script[^<>]*)>/gi, '&lt;$1$2&gt;')
                    .replace(/<(\/?)(img[^<>]*)>/gi, '&lt;$1$2&gt;')
                    .replace(/<(\/?)(video[^<>]*)>/gi, '&lt;$1$2&gt;')
                    .replace(/<(\/?)(audio[^<>]*)>/gi, '&lt;$1$2&gt;');
            }
        },

        /**
         * Merges two objects reecursively but doesn't override any primitive value in the target object
         *
         * @param source
         * @param target
         * @return {*}
         */
        deepMerge : function (source, target, override) {
            if (source === undefined) {
                return target;
            } else if (target === undefined) {
                return this.deepClone(source);
            } else if (typeof source !== "object" || typeof target !== "object") {
                return target;
            } else {
                var key;
                for (key in source) {
                    if (source.hasOwnProperty(key)) {
                        if (typeof target[key] === "object" && typeof source[key] === "object") {
                            target[key] = this.deepMerge(source[key], target[key], override);
                        } else if (target[key] == null || override) {
                            target[key] = source[key];
                        }
                    }
                }
                return target;
            }
        },

        clearConfigFromCache : function (nodeName) {
            if (Utils.getConfig.cache.hasOwnProperty(nodeName)) {
                delete Utils.getConfig.cache[nodeName];
            }
        },

        /**
         * expands the config for the rule
         * @param rule the rule object
         * @param nodeName name of the config
         * @param cache whether to pick from cache or not
         * @param extras
         */
        getConfig : function (rule, nodeName, cache, extras) {
            var config;
            if (Utils.getConfig.cache == null) {
                Utils.getConfig.cache = {};
            }
            if (nodeName === undefined || cache === false || !Utils.getConfig.cache.hasOwnProperty(nodeName)) {
                if (typeof rule === "string") {
                    config = this._getRuleImpl(rule);
                    if (extras && extras.hasOwnProperty(rule)) {
                        config.extras = Utils.extend({}, config.extras, this.deepClone(extras[rule]));
                    }
                } else if (typeof rule === "object") {
                    config = this.getConfig(rule.rule, undefined, undefined, extras);
                    var prop;
                    for (prop in config.impl) {
                        if (config.impl.hasOwnProperty(prop) && rule[prop] !== undefined) {
                            config.impl[prop] = rule[prop];
                        }
                    }
                    if (config.extras && rule.extras) {
                        this.deepMerge(rule.extras, config.extras, true);
                    } else {
                        config.extras = Utils.extend({}, rule.extras);
                    }
                    config.choiceName = Granite.I18n.get(rule.choiceName);
                    config.jsonModel = Utils.extend({}, rule.jsonModel);
                } else {
                    config = {
                        impl : Utils.extend({}, defaultConfig.terminal)
                    };
                }
                if (nodeName === undefined || cache === false) {
                    return config;
                }
                Utils.getConfig.cache[nodeName] = config;
            }
            return Utils.getConfig.cache[nodeName];
        },

        capitalizeFirstCharacter : function (str) {
            if (str == null) {
                return null;
            }
            return str[0].toUpperCase() + str.substring(1).toLowerCase();
        },
        // mimics limited behaviour of $.extend
        extend : function () {
            if (arguments.length < 1) {
                return;
            }
            if (typeof(arguments[0]) == "undefined") {
                return;
            }
            var lhsArg = arguments[0];
            var deep = false;
            var first = 1;
            if (typeof(lhsArg) == "boolean") {
                lhsArg = arguments[1];
                deep = lhsArg;
                first = 2;
            }
            for (var i = first,arglen = arguments.length; i < arglen; i++) {
                var rhsArg = arguments[i];
                if (typeof(rhsArg) != "undefined") {
                    for (var key in rhsArg) {
                        if (rhsArg.hasOwnProperty(key)) {
                            var rhsVal = rhsArg[key];
                            if (deep && !(typeof(rhsVal) in {"number" : "","string" : "","function" : "","boolean" : ""})) {
                                if (rhsVal !== null && typeof(rhsVal) != "undefined") {
                                    if (!lhsArg[key]) {
                                        lhsArg[key] = (rhsVal.constructor == Array) ? [] : {};
                                    }
                                    Utils.extend(true, lhsArg[key], rhsVal);
                                }
                            } else {
                                lhsArg[key] = rhsVal;
                            }
                        }
                    }
                }
            }

            return lhsArg;
        },

        extractTextFromHTML : function (htmlString) {
            var div = document.createElement('div');
            div.innerHTML = window.expeditor.Utils.encodeScriptableTags(htmlString);
            htmlString = div.textContent || div.innerText;
            div.remove();
            return htmlString.replace(/<[^>]*>/g, '');
        },

        deepClone : function (obj) {
            return JSON.parse(JSON.stringify(obj));
        }
    };

    var ExpEditorContext = expeditor.ExpEditorContext = expeditor.Class.extend({
        init : function (config, scope, webServicesConfig, defaultExtras, version) {
            this.config = config;
            this.version = version || "1.0";
            this.webServicesConfig = webServicesConfig;
            this.scope = scope;
            this.defaultExtras = defaultExtras;
            Utils.getConfig.cache = {};
        },

        getVersion : function () {
            return this.version;
        },

        setScope : function (scope) {
            this.scope = scope;
        },

        getScope : function () {
            return this.scope;
        },

        getConfig : function (nodeName, componentConfig) {
            var cachedConfig, finalConfig, prop;
            if (this.config[nodeName]) {
                cachedConfig = Utils.getConfig(this.config[nodeName], nodeName, undefined, this.defaultExtras);
                if (typeof componentConfig === "object" && componentConfig !== null) {
                    finalConfig = expeditor.Utils.extend(true, {}, cachedConfig, componentConfig);
                } else {
                    finalConfig = cachedConfig;
                }
            } else {
                finalConfig = Utils.getConfig(componentConfig, nodeName, false, this.defaultExtras);
            }
            return finalConfig;
        },

        createComponent : function (nodeName, componentConfig) {
            var _componentConfig = this.getConfig(nodeName, componentConfig),
                componentClassName = _componentConfig.impl.component,
                componentClass = Utils.getClassForName(componentClassName),
                extraConfig = Utils.getOrElse(_componentConfig, "extras.component", null);
            var newComponent =  new componentClass(nodeName, this, extraConfig, componentConfig);
            if (typeof(newComponent.loadConfigJsonModel) == "function") {
                newComponent.loadConfigJsonModel();
            }
            return newComponent;
        },

        createModel : function (nodeName, componentConfig) {
            if (nodeName === "SCRIPTMODEL") {
                return new expeditor.model.ScriptModel(nodeName, this);
            }
            var _componentConfig = this.getConfig(nodeName, componentConfig),
                modelClassName = _componentConfig.impl.model;
            if (modelClassName) {
                var modelClass = Utils.getClassForName(modelClassName);
                if (modelClass) {
                    return new modelClass(nodeName, this, Utils.getOrElse(_componentConfig, "extras.model", null));
                }
            }
        },

        createView : function (nodeName, componentConfig) {
            var _componentConfig = this.getConfig(nodeName, componentConfig),
                viewClassName = _componentConfig.impl.view;
            if (viewClassName) {
                var viewClass = Utils.getClassForName(viewClassName);
                if (viewClass) {
                    return new viewClass(nodeName, this, Utils.getOrElse(_componentConfig, "extras.view", null));
                }
            }
        }
    });

    var UnderscoreUtils = expeditor.UnderscoreUtils = {

        isUndefined : function (obj) {
            return obj === void 0;
        },

        each : function (obj, iterator, context) {
            if (obj == null) {
                return;
            }
            if (nativeForEach && obj.forEach === nativeForEach) {
                obj.forEach(iterator, context);
            }else if (obj.length === +obj.length) {
                for (var i = 0, l = obj.length; i < l; i++) {
                    if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) {
                        return;
                    }
                }
            } else {
                for (var key in obj) {
                    if (hasOwnProperty.call(obj, key)) {
                        if (iterator.call(context, obj[key], key, obj) === breaker) {
                            return;
                        }
                    }
                }
            }
        },

        extend : function (obj) {
            UnderscoreUtils.each(slice.call(arguments, 1), function (source) {
                for (var prop in source) {
                    obj[prop] = source[prop];
                }
            });
            return obj;
        },

        find : function (obj, iterator, context) {
            var result;
            var context = function (value, index, list) {
                if (iterator.call(context, value, index, list)) {
                    result = value;
                    return true;
                }
            };
            iterator || (iterator = function (value) {
                return value;
            });
            var result = false;
            if (obj == null) {
                return result;
            }
            if (typeof nativeSome !== 'undefined' && nativeSome && obj.some === nativeSome) {
                return obj.some(iterator, context);
            }
            UnderscoreUtils.each(obj, function (value, index, list) {
                if (result || (result = iterator.call(context, value, index, list))) {
                    return breaker;
                }
            });
            return !!result;
        },

        isNull : function (obj) {
            return obj === null;
        },

        isArray : nativeIsArray || function (obj) {
            return toString.call(obj) == '[object Array]';
        },

        isObject : function (obj) {
            return obj === Object(obj);
        },

        isString : function (obj) {
            return toString.call(obj) == '[object String]';
        },

        isEmpty : function (obj) {
            if (obj == null) {
                return true;
            }
            if (UnderscoreUtils.isArray(obj) || UnderscoreUtils.isString(obj)) {
                return obj.length === 0;
            }
            for (var key in obj) {
                if (hasOwnProperty.call(obj, key)) {
                    return false;
                }
            };
            return true;
        },

        defaults : function (obj) {
            UnderscoreUtils.each(slice.call(arguments, 1), function (source) {
                for (var prop in source) {
                    if (obj[prop] == null) {
                        obj[prop] = source[prop];
                    }
                }
            });
            return obj;
        },

        unescape : function (code) {
            return code.replace(unescaper, function (match, escape) {
                return escapes[escape];
            });
        },

        template : function (text, data, settings) {
            for (var p in escapes) {
                escapes[escapes[p]] = p;
            }
            settings = UnderscoreUtils.defaults(settings || {}, templateSettings);
            var _ = function (obj) {
                return new wrapper(obj);
            };
            var source = "__p+='" + text
            .replace(escaper, function (match) {
                return '\\' + escapes[match];
            })
            .replace(settings.escape || noMatch, function (match, code) {
                return "'+\n_.escape(" + UnderscoreUtils.unescape(code) + ")+\n'";
            })
            .replace(settings.interpolate || noMatch, function (match, code) {
                return "'+\n(" + UnderscoreUtils.unescape(code) + ")+\n'";
            })
            .replace(settings.evaluate || noMatch, function (match, code) {
                return "';\n" + UnderscoreUtils.unescape(code) + "\n;__p+='";
            }) + "';\n";

            // If a variable is not specified, place data values in local scope.
            if (!settings.variable) {
                source = 'with(obj||{}){\n' + source + '}\n';
            }

            source = "var __p='';" + "var print=function(){__p+=Array.prototype.join.call(arguments, '')};\n" + source + "return __p;\n";

            var render = new Function(settings.variable || 'obj', '_', source);
            if (data) {
                return render(data, UnderscoreUtils._);
            }
            var template = function (data) {
                return render.call(this, data, UnderscoreUtils._);
            };

            template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

            return template;
        },

        clone : function (obj) {
            if (!UnderscoreUtils.isObject(obj)) {
                return obj;
            }
            return UnderscoreUtils.isArray(obj) ? obj.slice() : UnderscoreUtils.extend({}, obj);
        }
    };

})(expeditor);
