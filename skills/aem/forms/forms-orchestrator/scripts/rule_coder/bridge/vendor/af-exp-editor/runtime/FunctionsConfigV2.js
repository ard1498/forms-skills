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
(function (guidelib) {

    /* Change event listener for Contextual filtering of child fields based on the Panel/tableRow selected or vice-versa */
    guidelib.author.parameterChangeListener = function (parameters, index) {
        if (parameters && parameters.length > 1) {
            if (index == 0) {
                /* Filter second argument form objects list to show only Child fields */
                var panelId = expeditor.Utils.getOrElse(parameters, "0.childComponent.model.value.id", null);
                var fieldComponent = parameters[1].getChildOfType("COMPONENT");
                if (fieldComponent && typeof fieldComponent.setFilter === "function") {
                    var filter = function (variable) {
                        return !panelId || variable.parent == panelId;
                    };
                    fieldComponent.setFilter.apply(fieldComponent, [filter]);
                }
            } else {
                /* Filter first argument form objects list to show only Parent panel/tableRow */
                var fieldVal = expeditor.Utils.getOrElse(parameters, "1.childComponent.model.value", null);
                var panelComponent = parameters[0].getChildOfType("COMPONENT");
                if (panelComponent && typeof panelComponent.setFilter === "function") {
                    var filter = function (variable) {
                        return !fieldVal || variable.id == fieldVal.parent;
                    };
                    panelComponent.setFilter.apply(panelComponent, [filter]);
                }
            }
        }
    };

    var functionsConfigJson = [
        {
            "id": "abs",
            "displayName": Granite.I18n.get("Absolute Value Of"),
            "args": [
                {
                    "type": "NUMBER",
                    "name": "value",
                    "description": Granite.I18n.get("value"),
                    isMandatory : true
                }
            ],
            "type": "NUMBER",
            "description": Granite.I18n.get("Returns the absolute value of the provided argument $value."),
            "impl": "$0($1)"
        },
        {
            "id": "avg",
            "displayName": Granite.I18n.get("Average Of"),
            "args": [
                {
                    "type": "NUMBER[]",
                    "name": "elements",
                    "description": Granite.I18n.get("elements"),
                    isMandatory : true
                }
            ],
            "type": "NUMBER",
            "description": Granite.I18n.get("Returns the average of the elements in the provided array. An empty array will produce a return value of null."),
            "impl": "$0($1)"
        },
        {
            "id": "ceil",
            "displayName": Granite.I18n.get("Ceil"),
            "args": [
                {
                    "type": "NUMBER",
                    "name": "value",
                    "description": Granite.I18n.get("value"),
                    isMandatory : true
                }
            ],
            "type": "NUMBER",
            "description": Granite.I18n.get("Returns the next highest integer value by rounding up if necessary."),
            "impl": "$0($1)"
        },
        {
            "id": "contains",
            "displayName": Granite.I18n.get("Contains"),
            "args": [
                {
                    "type": "STRING[]|NUMBER[]|ARRAY|STRING",
                    "name": "subject",
                    "description": Granite.I18n.get("subject"),
                    isMandatory : true
                },
                {
                    "type": "STRING|BOOLEAN|NUMBER|DATE",
                    "name": "search",
                    "description": Granite.I18n.get("search"),
                    isMandatory : true
                }
            ],
            "type": "BOOLEAN",
            "description": Granite.I18n.get("Returns true if the given $subject contains the provided $search string. If $subject is an array, this function returns true if one of the elements in the array is equal to the provided $search value. If the provided $subject is a string, this function returns true if the string contains the provided  $search argument."),
            "impl": "$0($1,$2)"
        },
        {
            "id": "endsWith",
            "displayName": Granite.I18n.get("Ends With"),
            "args": [
                {
                    "type": "STRING",
                    "name": "subject",
                    "description": Granite.I18n.get("subject"),
                    isMandatory : true
                },
                {
                    "type": "STRING",
                    "name": "prefix",
                    "description": Granite.I18n.get("prefix"),
                    isMandatory : true
                }
            ],
            "type": "BOOLEAN",
            "description": Granite.I18n.get("Returns true if the $subject ends with the $prefix, otherwise this function returns false."),
            "impl": "$0($1,$2)"
        },
        {
            "id": "floor",
            "displayName": Granite.I18n.get("Floor"),
            "args": [
                {
                    "type": "NUMBER",
                    "name": "value",
                    "description": Granite.I18n.get("value"),
                    isMandatory : true
                }
            ],
            "type": "NUMBER",
            "description": Granite.I18n.get("Returns the next lowest integer value by rounding down if necessary."),
            "impl": "$0($1)"
        },
        {
            "id": "length",
            "displayName": Granite.I18n.get("Length"),
            "args": [
                {
                    "type": "STRING|NUMBER|BOOLEAN|DATE|STRING[]|NUMBER[]|DATE[]|BOOLEAN[]|FILE[]|ARRAY|OBJECT|PANEL",
                    "name": "subject",
                    "description": Granite.I18n.get("subject"),
                    isMandatory : true
                }
            ],
            "type": "NUMBER",
            "description": Granite.I18n.get("Returns the length of the given argument using the following types rules: string: returns the number of code points in the string array: returns the number of elements in the array object: returns the number of key-value pairs in the object: returns the number instances in panel"),
            "impl": "$0($1)"
        },
        {
            "id": "max",
            "displayName": Granite.I18n.get("Maximum"),
            "args": [
                {
                    "type": "NUMBER[]|STRING[]",
                    "name": "collection",
                    "description": Granite.I18n.get("collection"),
                    isMandatory : true
                }
            ],
            "type": "NUMBER",
            "description": Granite.I18n.get("Returns the highest found number in the provided array argument. An empty array will produce a return value of null."),
            "impl": "$0($1)"
        },
        // {
        //     "id": "maxBy",
        //     "displayName": "maxBy",
        //     "args": [
        //         {
        //             "type": "ARRAY",
        //             "name": "elements",
        //             "description": "elements"
        //         },
        //         {
        //             "type": "STRING|NUMBER|BOOLEAN|DATE|ARRAY|OBJECT",
        //             "name": "expr",
        //             "description": "expr"
        //         }
        //     ],
        //     "type": "STRING|NUMBER|BOOLEAN|DATE|ARRAY|OBJECT",
        //     "description": "Return the maximum element in an array using the expression expr as the comparison key. The entire maximum element is returned.",
        //     "impl": "$0($1,$2)"
        // },
        {
            "id": "startsWith",
            "displayName": Granite.I18n.get("Starts With"),
            "args": [
                {
                    "type": "STRING",
                    "name": "subject",
                    "description": Granite.I18n.get("subject"),
                    isMandatory : true
                },
                {
                    "type": "STRING",
                    "name": "prefix",
                    "description": Granite.I18n.get("prefix"),
                    isMandatory : true
                }
            ],
            "type": "BOOLEAN",
            "description": Granite.I18n.get("Returns true if the $subject starts with the $prefix, otherwise this function returns false."),
            "impl": "$0($1,$2)"
        },
        {
            "id": "defaultErrorHandler",
            "displayName": Granite.I18n.get("Default Invoke Service Error Handler"),
            "args": [
                {
                    "type": "OBJECT",
                    "name": "response",
                    "description": "response",
                    isMandatory : true
                },
                {
                    "type": "OBJECT",
                    "name": "header",
                    "description": "header",
                    isMandatory : true
                }
            ],
            "type": "ANY",
            "isErrorHandler": true,
            "description": Granite.I18n.get("Default Invoke Service Error Handler"),
            "impl": "$0($1,$2)"
        },
        {
            "id": "sum",
            "displayName": Granite.I18n.get("Sum"),
            "args": [
                {
                    "type": "NUMBER[]",
                    "name": "collection",
                    "description": Granite.I18n.get("collection"),
                    isMandatory : true
                }
            ],
            "type": "NUMBER",
            "description": Granite.I18n.get("Returns the sum of the provided array argument. An empty array will produce a return value of 0."),
            "impl": "$0($1)"
        },
        {
            "id": "min",
            "displayName": Granite.I18n.get("Minimum"),
            "args": [
                {
                    "type": "NUMBER[]|STRING[]",
                    "name": "collection",
                    "description": Granite.I18n.get("collection"),
                    isMandatory : true
                }
            ],
            "type": "NUMBER",
            "description": Granite.I18n.get("Returns the lowest found number in the provided $collection argument."),
            "impl": "$0($1)"
        },
        // {
        //     "id": "minBy",
        //     "displayName": "minBy",
        //     "args": [
        //         {
        //             "type": "ARRAY",
        //             "name": "elements",
        //             "description": "elements"
        //         },
        //         {
        //             "type": "STRING|STRING[]|NUMBER|NUMBER[]|BOOLEAN|BOOLEAN[]|DATE|DATE[]|ARRAY",
        //             "name": "expr",
        //             "description": "expression that returns either a string or a number"
        //         }
        //     ],
        //     "type": "STRING|STRING[]|NUMBER|NUMBER[]|BOOLEAN|BOOLEAN[]|DATE|DATE[]|ARRAY",
        //     "description": "Return the minimum element in an array using the expression expr as the comparison key. The entire maximum element is returned.",
        //     "impl": "$0($1,$2)"
        // },
        {
            "id": "type",
            "displayName": Granite.I18n.get("Type"),
            "args": [
                {
                    "type": "STRING|NUMBER|BOOLEAN|DATE|STRING[]|NUMBER[]|ARRAY|OBJECT",
                    "name": "subject",
                    "description": Granite.I18n.get("subject"),
                    isMandatory : true
                }
            ],
            "type": "STRING",
            "description": Granite.I18n.get("Returns the JavaScript type of the given $subject argument as a string value. The return value MUST be one of the following: number string boolean array object null"),
            "impl": "$0($1)"
        },
        {
            "id": "keys",
            "displayName": Granite.I18n.get("Keys"),
            "args": [
                {
                    "type": "OBJECT",
                    "name": "obj",
                    "description": Granite.I18n.get("obj"),
                    isMandatory : true
                }
            ],
            "type": "STRING[]",
            "description": Granite.I18n.get("Returns an array containing the keys of the provided object. If the passed object is null, the value returned is an empty array"),
            "impl": "$0($1)"
        },
        {
            "id": "values",
            "displayName": Granite.I18n.get("Values"),
            "args": [
                {
                    "type": "OBJECT",
                    "name": "obj",
                    "description": Granite.I18n.get("obj"),
                    isMandatory : true
                }
            ],
            "type": "STRING[]|NUMBER[]|ARRAY",
            "description": Granite.I18n.get("Returns the values of the provided object. Note that because JSON hashes are inheritently unordered, the values associated with the provided object obj are inheritently unordered."),
            "impl": "$0($1)"
        },
        {
            "id": "sort",
            "displayName": Granite.I18n.get("Sort"),
            "args": [
                {
                    "type": "NUMBER[]|STRING[]",
                    "name": "list",
                    "description": Granite.I18n.get("list"),
                    isMandatory : true
                }
            ],
            "type": "NUMBER[]|STRING[]",
            "description": Granite.I18n.get("This function accepts an array $list argument and returns the sorted elements of the $list as an array. The array must be a list of strings or numbers. Sorting strings is based on code points. Locale is not taken into account."),
            "impl": "$0($1)"
        },
        // {
        //     "id": "sortBy",
        //     "displayName": "sortBy",
        //     "args": [
        //         {
        //             "type": "ARRAY",
        //             "name": "elements",
        //             "description": "elements"
        //         },
        //         {
        //             "type": "STRING|STRING[]|NUMBER|NUMBER[]|BOOLEAN|BOOLEAN[]|DATE|DATE[]|ARRAY",
        //             "name": "expr",
        //             "description": "expr"
        //         }
        //     ],
        //     "type": "ARRAY",
        //     "description": "Sort an array using an expression expr as the sort key. For each element in the array of elements, the expr expression is applied and the resulting value is used as the key used when sorting the elements. If the result of evaluating the expr against the current array element results in type other than a number or a string, a type error will occur.",
        //     "impl": "$0($1,$2)"
        // },
        {
            "id": "join",
            "displayName": Granite.I18n.get("Join"),
            "args": [
                {
                    "type": "STRING",
                    "name": "glue",
                    "description": Granite.I18n.get("glue"),
                    isMandatory : true
                },
                {
                    "type": "STRING[]",
                    "name": "stringsarray",
                    "description": Granite.I18n.get("stringsarray"),
                    isMandatory : true
                }
            ],
            "type": "STRING",
            "description": Granite.I18n.get("Returns all of the elements from the provided $stringsarray array joined together using the $glue argument as a separator between each."),
            "impl": "$0($1,$2)"
        },
        {
            "id": "reverse",
            "displayName": Granite.I18n.get("Reverse"),
            "args": [
                {
                    "type": "STRING|STRING[]|NUMBER[]|ARRAY",
                    "name": "argument",
                    "description": Granite.I18n.get("argument"),
                    isMandatory : true
                }
            ],
            "type": "STRING|STRING[]|NUMBER[]|ARRAY",
            "description": Granite.I18n.get("Reverses the order of the $argument."),
            "impl": "$0($1)"
        },
        {
            "id": "toArray",
            "displayName": Granite.I18n.get("Convert To Array"),
            "args": [
                {
                    "type": "STRING|NUMBER|BOOLEAN|DATE|OBJECT",
                    "name": "arg",
                    "description": Granite.I18n.get("arg"),
                    isMandatory : true
                }
            ],
            "type": "STRING[]|NUMBER[]|ARRAY|DATE[]|BOOLEAN[]",
            "description": Granite.I18n.get("Converts the passed arg to an array array - Returns the passed in value. number/string/object/boolean - Returns a one element array containing the passed in argument."),
            "impl": "$0($1)"
        },
        {
            "id": "_toString", //toString is a keyword in JavaScript leading to issues in exp-editor
            "displayName": Granite.I18n.get("Convert To String"),
            "args": [
                {
                    "type": "STRING|NUMBER|BOOLEAN|DATE|STRING[]|NUMBER[]|ARRAY|OBJECT",
                    "name": "arg",
                    "description": Granite.I18n.get("arg"),
                    isMandatory : true
                }
            ],
            "type": "STRING",
            "description": Granite.I18n.get("Converts the passed arg to a string string - Returns the passed in value. number/array/object/boolean - The JSON encoded value of the object."),
            "impl": "toString($1)"
        },
        {
            "id": "toNumber",
            "displayName": Granite.I18n.get("Convert To Number"),
            "args": [
                {
                    "type": "STRING|NUMBER|BOOLEAN|DATE|STRING[]|NUMBER[]|ARRAY|OBJECT",
                    "name": "arg",
                    "description": Granite.I18n.get("arg"),
                    isMandatory : true
                }
            ],
            "type": "NUMBER",
            "description": Granite.I18n.get("Converts the passed arg to a number string - Returns the parsed number. number - Returns the passed in value. array - null object - null boolean - null null - null"),
            "impl": "$0($1)"
        },
        {
            id: 'today',
            type: 'DATE',
            displayName: Granite.I18n.get('Get Current Date'),
            args: [],
            impl: "$0()",
            description: Granite.I18n.get('Returns current date')
        },
        /*
        {
            "id": "notNull",
            "displayName": "notNull",
            "args": [
                {
                    "type": "STRING|NUMBER|BOOLEAN|DATE|STRING[]|NUMBER[]|ARRAY|OBJECT",
                    "name": "argument",
                    "description": "argument"
                }
            ],
            "type": "STRING|NUMBER|BOOLEAN|DATE|STRING[]|NUMBER[]|ARRAY",
            "description": "Returns the first argument that does not resolve to null. This function accepts one or more arguments, and will evaluate them in order until a non null argument is encounted. If all arguments values resolve to null, then a value of null is returned.",
            "impl": "$0($1)"
        },*/
        // {
        //     "id": "zip",
        //     "displayName": "zip",
        //     "args": [
        //         {
        //             "type": "STRING|NUMBER|BOOLEAN|DATE|ARRAY",
        //             "name": "arrays",
        //             "description": "array of arrays to zip together"
        //         }
        //     ],
        //     "type": "ARRAY",
        //     "description": "Returns a convolved (zipped) array containing grouped arrays of values from the array arguments from index 0, 1, 2, etc. This function accepts a variable number of arguments. The length of the returned array is equal to the length of the shortest array.",
        //     "impl": "$0($1)"
        // }
        /*{
            "id": "casefold",
            "displayName": "casefold",
            "args": [
                {
                    "type": "STRING",
                    "name": "input",
                    "description": "string to casefold"
                }
            ],
            "type": "STRING",
            "description": "Return a lower-case string using locale-specific mappings. e.g. Strings with German lowercase letter 'ß' can be compared to 'ss'",
            "impl": "$0($1)"
        },*/
        {
            "id": "lower",
            "displayName": Granite.I18n.get("To Lower Case"),
            "args": [
                {
                    "type": "STRING",
                    "name": "input",
                    "description": Granite.I18n.get("input string"),
                    isMandatory : true
                }
            ],
            "type": "STRING",
            "description": Granite.I18n.get("Converts all the alphabetic characters in a string to lowercase. If the value is not a string it will be converted into string using the default toString method"),
            "impl": "$0($1)"
        },
        {
            "id": "upper",
            "displayName": Granite.I18n.get("To Upper Case"),
            "args": [
                {
                    "type": "STRING",
                    "name": "input",
                    "description": Granite.I18n.get("input string"),
                    isMandatory : true
                }
            ],
            "type": "STRING",
            "description": Granite.I18n.get("Converts all the alphabetic characters in a string to uppercase. If the value is not a string it will be converted into string using the default toString method"),
            "impl": "$0($1)"
        },
        {
            "id": "exp",
            "displayName": Granite.I18n.get("Exponent of"),
            "args": [
                {
                    "type": "NUMBER",
                    "name": "input",
                    "description": Granite.I18n.get("number"),
                    isMandatory : true
                }
            ],
            "type": "NUMBER",
            "description": Granite.I18n.get("Returns e (the base of natural logarithms) raised to a power x"),
            "impl": "$0()"
        },
        {
            "id": "power",
            "displayName": Granite.I18n.get("Power of"),
            "args": [
                {
                    "type": "NUMBER",
                    "name": "a",
                    "description": Granite.I18n.get("a"),
                    isMandatory : true
                },
                {
                    "type": "NUMBER",
                    "name": "x",
                    "description": Granite.I18n.get("x"),
                    isMandatory : true
                }
            ],
            "type": "NUMBER",
            "description": Granite.I18n.get("Computes `a` raised to a power `x`"),
            "impl": "$0($1,$2)"
        },
        {
            "id": "mid",
            "displayName": Granite.I18n.get("Substring Of"),
            "args": [
                {
                    "type": "STRING|ARRAY",
                    "name": "subject",
                    "description": Granite.I18n.get("subject"),
                    isMandatory : true
                },
                {
                    "type": "NUMBER",
                    "name": "startPos",
                    "description": Granite.I18n.get("startPos"),
                    isMandatory : true
                },
                {
                    "type": "NUMBER",
                    "name": "length",
                    "description": Granite.I18n.get("length"),
                    isMandatory : true
                }
            ],
            "type": "STRING|ARRAY|STRING[]|NUMBER[]|FILE[]|DATE[]|BOOLEAN[]",
            "description": Granite.I18n.get("Returns extracted text, given an original text, starting position, and length. or in case of array, extracts a subset of the array from start till the length number of elements. Returns null"),
            "impl": "$0($1,$2,$3)"
        },
        {
            "id": "mod",
            "displayName": Granite.I18n.get("Modulo of"),
            "args": [
                {
                    "type": "NUMBER",
                    "name": "dividend",
                    "description": Granite.I18n.get("dividend"),
                    isMandatory : true
                },
                {
                    "type": "NUMBER",
                    "name": "divisor",
                    "description": Granite.I18n.get("divisor"),
                    isMandatory : true
                }
            ],
            "type": "NUMBER",
            "description": Granite.I18n.get("Return the remainder when one number is divided by another number."),
            "impl": "$0($1,$2)"
        },
        {
            "id": "proper",
            "displayName": Granite.I18n.get("To Uppercase First Letter"),
            "args": [
                {
                    "type": "STRING",
                    "name": "text",
                    "description": Granite.I18n.get("text"),
                    isMandatory : true
                }
            ],
            "type": "STRING",
            "description": Granite.I18n.get("Return the input string with the first letter of each word converted to an uppercase letter and the rest of the letters in the word converted to lowercase."),
            "impl": "$0($1)"
        },
        {
            "id": "rept",
            "displayName": Granite.I18n.get("Repeat String"),
            "args": [
                {
                    "type": "STRING",
                    "name": "text",
                    "description": Granite.I18n.get("text to repeat"),
                    isMandatory : true
                },
                {
                    "type": "NUMBER",
                    "name": "count",
                    "description": Granite.I18n.get("number of times to repeat the text"),
                    isMandatory : true
                }
            ],
            "type": "STRING",
            "description": Granite.I18n.get("Return text repeated Count times. rept('x', 5) returns 'xxxxx'"),
            "impl": "$0($1,$2)"
        },
        {
            "id": "replace",
            "displayName": Granite.I18n.get("Replace"),
            "args": [
                {
                    "type": "STRING",
                    "name": "text",
                    "description": Granite.I18n.get("original text"),
                    isMandatory : true
                },
                {
                    "type": "NUMBER",
                    "name": "start",
                    "description": Granite.I18n.get("index in the original text from where to begin the replacement."),
                    isMandatory : true
                },
                {
                    "type": "NUMBER",
                    "name": "length",
                    "description": Granite.I18n.get("number of characters to be replaced"),
                    isMandatory : true
                },
                {
                    "type": "STRING",
                    "name": "replacement",
                    "description": Granite.I18n.get("string to replace at the start index"),
                    isMandatory : true
                }
            ],
            "type": "STRING",
            "description": Granite.I18n.get("Returns text where an old text is substituted at a given start position and length, with a new text."),
            "impl": "$0($1,$2,$3,$4)"
        },
        {
            "id": "round",
            "displayName": Granite.I18n.get("Round"),
            "args": [
                {
                    "type": "NUMBER",
                    "name": "num",
                    "description": Granite.I18n.get("number to round off"),
                    isMandatory : true
                },
                {
                    "type": "NUMBER",
                    "name": "precision",
                    "description": Granite.I18n.get("number is rounded to the specified precision"),
                    isMandatory : true
                }
            ],
            "type": "NUMBER",
            "description": Granite.I18n.get("Round a number to a specified precision. If precision is not specified, round to the nearest integer"),
            "impl": "$0($1,$2)"
        },
        {
            "id": "sqrt",
            "displayName": Granite.I18n.get("Square Root Of"),
            "args": [
                {
                    "type": "NUMBER",
                    "name": "num",
                    "description": Granite.I18n.get("number whose square root has to be calculated"),
                    isMandatory : true
                }
            ],
            "type": "NUMBER",
            "description": Granite.I18n.get("Return the square root of a number"),
            "impl": "$0($1)"
        },
        {
            "id": "trim",
            "displayName": Granite.I18n.get("Trim"),
            "args": [
                {
                    "type": "STRING",
                    "name": "text",
                    "description": Granite.I18n.get("string to trim"),
                    isMandatory : true
                }
            ],
            "type": "STRING",
            "description": Granite.I18n.get("Remove leading and trailing spaces, and replace all internal multiple spaces with a single space."),
            "impl": "$0($1)"
        },
        {
            "id": "trunc",
            "displayName": Granite.I18n.get("Truncate a number"),
            "args": [
                {
                    "type": "NUMBER",
                    "name": "numA",
                    "description": Granite.I18n.get("number to truncate"),
                    isMandatory : true
                },
                {
                    "type": "NUMBER",
                    "name": "numB",
                    "description": Granite.I18n.get("number of digits to truncate the number to"),
                    isMandatory : true
                }
            ],
            "type": "NUMBER",
            "description": Granite.I18n.get("Truncate a number to a specified number of digits."),
            "impl": "$0($1,$2)"
        },
        {
            "id": "split",
            "displayName": Granite.I18n.get("Split a string into array"),
            "args": [
                {
                    "type": "STRING",
                    "name": "string",
                    "description": Granite.I18n.get("string to split"),
                    isMandatory : true
                },
                {
                    "type": "STRING",
                    "name": "separator",
                    "description": Granite.I18n.get("separator where the split should occur"),
                    isMandatory : true
                }
            ],
            "type": "STRING[]",
            "description": Granite.I18n.get("Split a string into an array, given a separator"),
            "impl": "$0($1,$2)"
        },
        {
            "id": "unique",
            "displayName": Granite.I18n.get("Unique Values Of"),
            "args": [
                {
                    "type": "ARRAY",
                    "name": "input",
                    "description": Granite.I18n.get("input array"),
                    isMandatory : true
                }
            ],
            "type": "ARRAY|STRING[]|NUMBER[]|DATE[]|BOOLEAN[]",
            "description": Granite.I18n.get("Takes an array and returns unique elements within it"),
            "impl": "$0($1)"
        },
        {
            id : '_validateForm',
            type : 'BOOLEAN',
            displayName : Granite.I18n.get('Validate Form'),
            args : [],
            impl : 'validate($form).length==0',
            description : Granite.I18n.get('Validate Form')
        }
    ];

    if (Granite.Toggles.isEnabled("FT_FORMS-13209")) {
        functionsConfigJson.push({
                "id": "defaultSubmitSuccessHandler",
                "displayName": Granite.I18n.get("Default Submit Form Success Handler"),
                "args": [],
                "type": "ANY",
                "description": Granite.I18n.get("Default Submit Form Success Handler"),
                "impl": "$0()"
            },
            {
                "id": "defaultSubmitErrorHandler",
                "displayName": Granite.I18n.get("Default Submit Form Error Handler"),
                "args": [
                    {
                        "type": "STRING",
                        "name": "defaultSubmitErrorMessage",
                        "description": Granite.I18n.get("Localized error message"),
                        isMandatory : true
                    }
                ],
                "type": "ANY",
                "description": Granite.I18n.get("Default Submit Form Error Handler"),
                "impl": "$0($1)"
            });
    }

    if (Granite.Toggles.isEnabled("FT_FORMS-13519")) {
        functionsConfigJson.push({
            id : 'getEventPayload',
            type : 'STRING|NUMBER|BOOLEAN|DATE|STRING[]|NUMBER[]|DATE[]|BOOLEAN[]|FILE[]|ARRAY|OBJECT',
            displayName : Granite.I18n.get('Get Event Payload'),
            args : [{
                "type": "STRING",
                "name": "input",
                "description": Granite.I18n.get("input param"),
                isMandatory : false
            }],
            impl : '$event.payload.$1',
            description : Granite.I18n.get('Get Event Payload')
        });
    }

    if (Granite.Toggles.isEnabled("FT_FORMS-19884")) {
        functionsConfigJson.push({
            id: "setVariable",
            displayName: Granite.I18n.get("Set Variable Value"),
            args: [
                {
                    type: "STRING",
                    name: "variableName",
                    description: Granite.I18n.get("Name of the variable (supports dot notation e.g. 'address.city')"),
                    isMandatory: true
                },
                {
                    type: "STRING|NUMBER|BOOLEAN|DATE|AFCOMPONENT|OBJECT|ARRAY",
                    name: "variableValue",
                    description: Granite.I18n.get("Value to set for the variable"),
                    isMandatory: true
                },
                {
                    type: "AFCOMPONENT|FORM",
                    name: "normalFieldOrPanel",
                    description: Granite.I18n.get("Field or panel component to set the variable on (defaults to actual Form)"),
                    isMandatory: false
                }
            ],
            type: "VOID",
            description: Granite.I18n.get("Set variable value on a field or form"),
            impl: "$0($1,$2,$3)"
        },
        {
            id: "getVariable",
            displayName: Granite.I18n.get("Get Variable Value"),
            args: [
                {
                    type: "STRING",
                    name: "variableName",
                    description: Granite.I18n.get("Name of the variable (supports dot notation e.g. 'address.city')"),
                    isMandatory: true
                },
                {
                    type: "AFCOMPONENT|FORM",
                    name: "normalFieldOrPanel",
                    description: Granite.I18n.get("Field or panel component to get the value from (defaults to actual Form)"),
                    isMandatory: false
                }
            ],
            type: "STRING|NUMBER|BOOLEAN|DATE|OBJECT|ARRAY|AFCOMPONENT",
            description: Granite.I18n.get("Get field or form variable value"),
            impl: "$0($1,$2)"
        });
    }

    if (Granite.Toggles.isEnabled("FT_FORMS-20002")) {
        functionsConfigJson.push({
            id: "exportFormData",
            displayName: Granite.I18n.get("Export Form Data"),
            args: [
                {
                    type: "BOOLEAN",
                    name: "stringify",
                    description: Granite.I18n.get("Convert the form data to a JSON string, defaults to true"),
                    isMandatory: false
                },
                {
                    type: "STRING",
                    name: "key",
                    description: Granite.I18n.get("The key to get the value for (supports dot notation e.g. 'address.city'), defaults to all form data"),
                    isMandatory: false
                }
            ],
            type: "STRING|OBJECT",
            description: Granite.I18n.get("Export form data as a JSON string"),
            impl: "$0($1,$2)"
        },
        {
            id: "importData",
            displayName: Granite.I18n.get("Import Form Data"),
            args: [
                {
                    type: "OBJECT",
                    name: "data",
                    description: Granite.I18n.get("The form data to set"),
                    isMandatory: true
                }
            ],
            type: "VOID",
            description: Granite.I18n.get("Import Form Data"),
            impl: "importData($1)"
        });
    }

    if (Granite.Toggles.isEnabled("FT_FORMS-20129")) {
        functionsConfigJson.push({
            id : 'validate',
            type : 'BOOLEAN',
            displayName : Granite.I18n.get('Validate'),
            "args": [
                {
                    type: "AFCOMPONENT|FORM",
                    name: "field",
                    description: Granite.I18n.get("Field, panel or form component to validate"),
                    isMandatory: true
                }
            ],
            impl : '$0($1).length==0',
            description : Granite.I18n.get('Validate')
            }
        );
    }

    if (Granite.Toggles.isEnabled("FT_FORMS-17789")) {
        functionsConfigJson.push({
            id : 'downloadDoR',
            type : 'ANY',
            displayName : Granite.I18n.get('Download DoR'),
            args : [{
                "type": "STRING",
                "name": "fileName",
                "description": Granite.I18n.get("The name of the file to be downloaded. Defaults to 'Downloaded_DoR.pdf' if not specified."),
                isMandatory : false
            }],
            impl : '$0($1)',
            description : Granite.I18n.get('Download DoR')
        });
    }

    guidelib.author.FunctionsConfig_v2 = $.extend({}, {
        json: functionsConfigJson,
        searchKey: "displayName",
        displayProps: ["displayName", "description"]
    });

})(guidelib);
