/**
 * @package com.adobe.expeditor.rb.RBScope
 * @import com.adobe.expeditor.rb.FeatureToggle
 * Defines scope for rule builder
 * All variables and functions are defined using this scope
 */
(function (expeditor, window) {
    var RBScope = expeditor.rb.RBScope = expeditor.Class.extend({
        /**
         * constructor to initialize scope
         * config structure is as follows
         * var config ={
         *     vars:{
         *        "i":{name:"i",type:"NUMBER",disabled:true},
         *        "name":{name:"name",type:"STRING"}
         *     },
         *     funcs:{
         *         "sum":{
         *           name:"sum",
         *           type:"NUMBER",
         *           args:[]
         *              {name:"panel",type:"PANEL",description:"Select a panel"},
         *              {name:"field",type:"NUMBER",description:"Select a field"}
         *           ],
         *           impl : "$0($1,$2)" // optional, where $0 is the function id, $1, $2 are param ids
         *         },
         *     },
         *     types:{
         *        'NUMBER FIELD':{
         *              inherits:'FIELD',
         *              vars:{
         *                 'value':{name:"value",type:'NUMBER'}
         *             }
         *        }
         *    }
         * }
         */
        init : function (config) {
            this.clearVars();
            var _config = config || {};
            var functionStorage = _config.funcStorage || "expeditor.rb.MapStorage";
            var varStorage = _config.varStorage || "expeditor.rb.MapStorage";
            var storageClass = expeditor.Utils.getOrElse(window, varStorage, expeditor.rb.MapStorage);
            this.varsById = new storageClass();
            storageClass = expeditor.Utils.getOrElse(window, functionStorage, expeditor.rb.MapStorage);
            this.funcById = new storageClass();
            this.funcsByType = {};
            this.types = {};
            if (config) {
                this.addVars(config.vars);
                this.addFunctions(config.funcs);
                this.addTypes(config.types);
            }
        },

        clearVars : function () {
            if (this.varsById) {
                this.varsById.clear();
            }
            this.varsByType = {};
        },

        addVars : function (vars) {
            if (vars) {
                for (var varId in vars) {
                    if (vars.hasOwnProperty(varId)) {
                        var def = vars[varId];
                        if (def !== null) {
                            this.defineVariable(new expeditor.rb.VariableDefinition(varId, def.displayName, def.type,
                                def.displayPath, def.isDuplicate, def.name, def.options, def.parent, def.disabled, def.metadata));
                        }
                        if (varId === '$form' && def.metadata && def.metadata.isFragment) {
                            def = {
                                id : "$globalForm",
                                displayName : "FORM",
                                displayPath : "FORM/",
                                name : "FORM",
                                type : "FORM"
                            };
                            this.defineVariable(new expeditor.rb.VariableDefinition(def.id, def.displayName, def.type,
                                def.displayPath, def.isDuplicate, def.name, def.options, def.parent, def.disabled, def.metadata));
                        }
                    }
                }
            }
        },

        addFunctions : function (funcs) {
            if (funcs) {
                for (var funcId in funcs) {
                    var def = funcs[funcId];
                    this.defineFunction(new expeditor.rb.FunctionDefinition(funcId, def.displayName, def.type,
                        def.args, def.impl, def.name, def.isErrorHandler));
                }
            }
        },

        addTypes : function (types) {
            if (types) {
                for (var typeId in types) {
                    var def = types[typeId];
                    var newDef = {};
                    var newVars = {};
                    if (def.inherits) {
                        var parentType = this.types[def.inherits];
                        var parentFields = parentType.vars;
                        newVars = expeditor.Utils.extend(true, newVars, parentType.vars);
                    }
                    newVars = expeditor.Utils.extend(true, newVars, def.vars);
                    newDef.inherits = def.inherits;
                    newDef.vars = newVars;
                    this.types[typeId] = newDef;
                }
            }
        },

        _defineVarOrFunc : function (variable, varOrFunc) {
            var idStore = this._getIdStore(varOrFunc);
            var typeStore = this._getTypeStore(varOrFunc);
            var id = variable.getId();
            var type = variable.getType();
            if (!id || !type) {
                throw new Error("Error Defining " + variable + " id and type are required");
            }
            idStore.addElement(id, variable);
            var types = type.split("|").forEach(function (varType) {
                var trimmedType = varType.trim();
                (typeStore[trimmedType] = typeStore[trimmedType] || []).push(variable);
            }, this);
        },

        defineVariable : function (variable) {
            this._defineVarOrFunc(variable, "var");
        },

        defineFunction : function (func) {
            this._defineVarOrFunc(func, "func");
        },

        _getIdStore : function (varOrFunc) {
            return varOrFunc === "var" ? this.varsById : this.funcById;
        },

        _getTypeStore : function (varOrFunc) {
            return varOrFunc === "var" ? this.varsByType : this.funcsByType;
        },

        _getAll : function (varOrFunc) {
            var store = this._getIdStore(varOrFunc);
            return store.getAll();
        },

        _getAllFunctions : function () {
            return this._getAll("func");
        },

        _getAllVars : function () {
            return this._getAll("var");
        },

        getMatchingPromiseType : function (type, typeStore) {
            var variables = [];
            if (type.toLowerCase() === 'promise') {
                Object.entries(typeStore).forEach(function (e) {
                    if (e[0].startsWith(type) && //Promise<*> or Promise<{}> or Promise<a[]> or Promise<{a:string, b:string[]}>
                        !e[0].match(/\[]$|^[]/)) {
                        variables = variables.concat(e[1]);
                    }
                });
            } else {
                variables = typeStore[type];
            }
            return variables;
        },

        findByType : function (types, varOrFunc) {
            if (types.length == 0) {
                return [];
            }
            var typeStore = this._getTypeStore(varOrFunc);
            var typesArray = types.split("|");
            if (typesArray.indexOf("ANY") > -1) {
                return this._getAll(varOrFunc);
            } else {
                var idsAdded = {}, returnVars = [], i = 0;
                for (; i < typesArray.length; i++) {
                    var type = typesArray[i].trim(),
                        variables = expeditor.rb.FeatureToggles.isPromisesEnabled() ?
                            this.getMatchingPromiseType(type, typeStore) : typeStore[type],
                        j = 0;
                    if (variables instanceof Array) {
                        for (; j < variables.length; j++) {
                            var variable = variables[j];
                            if (typeof idsAdded[variable.getId()] === "undefined") {
                                returnVars.push(variable);
                            }
                        }
                    }

                }
                return returnVars;
            }
        },

        findVarByType : function (types) {
            return this.findByType(types, "var");
        },

        findFunctionsByType : function (types) {
            return this.findByType(types, "func");
        },

        findVarById : function (id) {
            return this.varsById.get(id);
        },

        findFunctionById : function (id) {
            return this.funcById.get(id);
        },

        findById : function (id, varOrFunc) {
            var store = this._getIdStore(varOrFunc);
            return store.get(id);
        },

        getAllTypes : function () {
            return this.types;
        },

        findUniqueVarId : function (id) {
            return this.varsById.getUniqueId(id);
        }
    });
})(expeditor, this);
