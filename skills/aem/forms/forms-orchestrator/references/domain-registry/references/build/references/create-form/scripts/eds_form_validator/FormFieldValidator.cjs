#!/usr/bin/env node
/**
 * EDS Form Field Validator
 *
 * Self-contained validator for Adobe EDS form fields.
 * Validates form.json against hardcoded field schemas.
 * Generates LLM-friendly error messages for correction.
 */

// ============================================================================
// FIELD SCHEMAS - All field types from _form.json filters
// ============================================================================

/**
 * Valid fieldTypes from _form.json filters
 */
const VALID_FIELD_TYPES = [
  'form',
  'captcha',
  'checkbox',
  'checkbox-group',
  'date-input',
  'drop-down',
  'email',
  'file-input',
  'form-accordion',
  'form-button',
  'form-fragment',
  'form-image',
  'form-modal',
  'form-reset-button',
  'form-submit-button',
  'number-input',
  'panel',
  'password',
  'plain-text',
  'radio-group',
  'rating',
  'telephone-input',
  'text-input',
  'tnc',
  'wizard',
  'range',
  'multiline-input',
  'accordion',
  'modal',
  'button', // Alias for form-button
];

/**
 * Property type definitions
 */
const PROPERTY_TYPES = {
  name: 'string',
  'jcr:title': 'string',
  fieldType: 'string',
  hideTitle: 'boolean',
  dataRef: 'string',
  unboundFormElement: 'boolean',
  visible: 'boolean',
  enabled: 'boolean',
  readOnly: 'boolean',
  colspan: 'string',
  placeholder: 'string',
  default: 'any',
  description: 'string',
  tooltip: 'string',
  required: 'boolean',
  mandatoryMessage: 'string',
  validateExpMessage: 'string',
  minLength: 'number',
  minLengthMessage: 'string',
  maxLength: 'number',
  maxLengthMessage: 'string',
  pattern: 'string',
  validatePictureClauseMessage: 'string',
  validatePatternMessage: 'string',
  multiLine: 'boolean',
  minimum: 'number',
  minimumMessage: 'string',
  maximum: 'number',
  maximumMessage: 'string',
  stepValue: 'number',
  minimumDate: 'string',
  maximumDate: 'string',
  enum: 'array',
  enumNames: 'array',
  type: 'string',
  orientation: 'string',
  variant: 'string',
  multiSelect: 'boolean',
  checkedValue: 'string',
  enableUncheckedValue: 'boolean',
  uncheckedValue: 'string',
  buttonText: 'string',
  dragDropText: 'string',
  maxFileSize: 'number',
  maxFileSizeMessage: 'string',
  accept: 'array',
  acceptMessage: 'string',
  repeatable: 'boolean',
  minOccur: 'number',
  maxOccur: 'number',
  repeatAddButtonLabel: 'string',
  repeatDeleteButtonLabel: 'string',
  fileReference: 'string',
  altText: 'string',
  fragmentPath: 'string',
  editFragment: 'boolean',
  showLink: 'boolean',
  displayFormat: 'string',
};

/**
 * Enum values for properties with restricted options
 */
const ENUM_VALUES = {
  colspan: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
  orientation: ['horizontal', 'vertical'],
  'variant:checkbox-group': ['default', 'cards'],
  'variant:radio-group': ['default', 'cards'],
  'variant:panel': ['noButtons', 'addDeleteButtons'],
  'type:number-input': ['integer', 'number'],
  'type:drop-down': ['string', 'boolean', 'number', 'string[]', 'boolean[]', 'number[]'],
  'type:checkbox': ['string', 'boolean', 'number'],
  'type:checkbox-group': ['string[]', 'boolean[]', 'number[]'],
  'type:radio-group': ['string', 'boolean', 'number'],
  'displayFormat:date-input': ['', 'd MMMM, y', 'MMMM d, y', 'EEEE, d MMMM, y', 'EEEE, MMMM d, y', 'd/M/y'],
  'displayFormat:number-input': ['', '¤#,##0.00', '¤####0.00', '#,###,##0.000', '#,###,##0%'],
};

/**
 * Field schemas - allowed properties for each fieldType
 */
const FIELD_SCHEMAS = {
  'form': {
    properties: ['name', 'fieldType', 'jcr:title', 'visible', 'enabled', 'journeyName',
      'customFunctionsPath', 'schemaType', 'track', 'action', 'dataUrl',
      'redirectUrl', 'thankYouMessage', 'submitType', 'prefillService'],
    required: ['fieldType'],
  },

  'text-input': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan', 'placeholder', 'default', 'multiLine',
      'required', 'mandatoryMessage', 'validateExpMessage',
      'minLength', 'minLengthMessage', 'maxLength', 'maxLengthMessage',
      'pattern', 'validatePictureClauseMessage', 'validatePatternMessage',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
    constraints: ['minLength <= maxLength'],
  },

  'email': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan', 'placeholder', 'default',
      'required', 'mandatoryMessage', 'validateExpMessage',
      'minLength', 'minLengthMessage', 'maxLength', 'maxLengthMessage',
      'pattern', 'validatePictureClauseMessage', 'validatePatternMessage',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
    constraints: ['minLength <= maxLength'],
  },

  'multiline-input': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan', 'placeholder', 'default', 'multiLine',
      'required', 'mandatoryMessage', 'validateExpMessage',
      'minLength', 'minLengthMessage', 'maxLength', 'maxLengthMessage',
      'pattern', 'validatePictureClauseMessage', 'validatePatternMessage',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
    constraints: ['minLength <= maxLength'],
  },

  'telephone-input': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan', 'placeholder', 'default',
      'required', 'mandatoryMessage', 'validateExpMessage',
      'minimum', 'minimumMessage', 'maximum', 'maximumMessage',
      'pattern', 'validatePictureClauseMessage', 'validatePatternMessage',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
    constraints: ['minimum <= maximum'],
  },

  'number-input': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan', 'placeholder', 'default', 'type',
      'required', 'mandatoryMessage', 'validateExpMessage',
      'minimum', 'minimumMessage', 'maximum', 'maximumMessage',
      'displayFormat', 'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
    constraints: ['minimum <= maximum'],
  },

  'date-input': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan', 'placeholder', 'default',
      'required', 'mandatoryMessage', 'validateExpMessage',
      'minimumDate', 'minimumMessage', 'maximumDate', 'maximumMessage',
      'displayFormat', 'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
  },

  'drop-down': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan', 'placeholder', 'default',
      'enum', 'enumNames', 'multiSelect', 'type',
      'required', 'mandatoryMessage', 'validateExpMessage',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
  },

  'checkbox': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan', 'default',
      'type', 'checkedValue', 'enableUncheckedValue', 'uncheckedValue',
      'required', 'mandatoryMessage', 'validateExpMessage',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
  },

  'checkbox-group': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan', 'default',
      'enum', 'enumNames', 'variant', 'type', 'orientation',
      'required', 'mandatoryMessage', 'validateExpMessage',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
  },

  'radio-group': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan', 'default',
      'enum', 'enumNames', 'variant', 'type', 'orientation',
      'required', 'mandatoryMessage', 'validateExpMessage',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
  },

  'file-input': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan', 'type',
      'buttonText', 'dragDropText',
      'required', 'mandatoryMessage', 'validateExpMessage',
      'maxFileSize', 'maxFileSizeMessage', 'accept', 'acceptMessage',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
  },

  'panel': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan',
      'repeatable', 'minOccur', 'maxOccur', 'variant',
      'repeatAddButtonLabel', 'repeatDeleteButtonLabel',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
    constraints: ['minOccur <= maxOccur'],
    isContainer: true,
  },

  'form-button': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'visible', 'enabled', 'readOnly', 'colspan',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
  },

  'form-submit-button': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'visible', 'enabled', 'colspan',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
  },

  'form-reset-button': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'visible', 'enabled', 'colspan',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
  },

  'plain-text': {
    properties: ['name', 'fieldType', 'dataRef', 'visible', 'colspan'],
    required: ['fieldType', 'name'],
  },

  'form-image': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'fileReference', 'altText',
      'dataRef', 'visible', 'colspan'
    ],
    required: ['fieldType', 'name'],
  },

  'form-fragment': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan',
      'fragmentPath', 'editFragment',
      'repeatable', 'minOccur', 'maxOccur',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
    constraints: ['minOccur <= maxOccur'],
    isContainer: true,
  },

  'captcha': {
    properties: ['name', 'fieldType'],
    required: ['fieldType', 'name'],
  },

  'form-accordion': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
    isContainer: true,
  },

  'accordion': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
    isContainer: true,
  },

  'form-modal': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
    isContainer: true,
  },

  'modal': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
    isContainer: true,
  },

  'wizard': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
    isContainer: true,
  },

  'password': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan',
      'required', 'mandatoryMessage', 'validateExpMessage',
      'minLength', 'minLengthMessage', 'maxLength', 'maxLengthMessage',
      'pattern', 'validatePictureClauseMessage',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
    constraints: ['minLength <= maxLength'],
  },

  'rating': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan',
      'required', 'mandatoryMessage', 'validateExpMessage',
      'minimum', 'minimumMessage', 'maximum', 'maximumMessage',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
    constraints: ['minimum <= maximum'],
  },

  'range': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan',
      'required', 'mandatoryMessage', 'validateExpMessage',
      'minimum', 'minimumMessage', 'maximum', 'maximumMessage', 'stepValue',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
    constraints: ['minimum <= maximum'],
  },

  'tnc': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'hideTitle', 'dataRef', 'unboundFormElement',
      'visible', 'enabled', 'readOnly', 'colspan', 'showLink',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
  },

  'button': {
    properties: [
      'name', 'fieldType', 'jcr:title', 'visible', 'enabled', 'readOnly', 'colspan',
      'description', 'tooltip'
    ],
    required: ['fieldType', 'name'],
  },
};

/**
 * System properties allowed on all fields (AEM/JCR specific)
 */
const SYSTEM_PROPERTIES = [
  'jcr:primaryType',
  'jcr:lastModified',
  'jcr:lastModifiedBy',
  'jcr:created',
  'jcr:createdBy',
  'sling:resourceType',
  'cq:responsive',
  'fd:rules',
  'fd:events',
  'fd:version',
  'fd:viewType', // Determines actual component type for custom components (wizard, accordion, modal)
  'id',
  'items',
  'layout',
  'wrapData',
  'textIsRich',
  'autocomplete',
  'tooltipVisible',
  'dorExclusion',
  'buttonType',
  'typeIndex',
  'aueComponentId',
  'title',
  'thankYouOption',
  'themeRef',
  'dorType',
  'label',
];

/**
 * Valid fd:viewType values for custom components
 * These override the fieldType for rendering purposes
 *
 * Format: viewType -> { baseFieldType, schema }
 */
const VIEW_TYPE_CONFIG = {
  // Panel-based custom components
  'wizard': { baseFieldType: 'panel', schema: 'wizard' },
  'accordion': { baseFieldType: 'panel', schema: 'accordion' },
  'modal': { baseFieldType: 'panel', schema: 'modal' },
  'tnc': { baseFieldType: 'panel', schema: 'tnc' },

  // Text-input-based custom components
  'password': { baseFieldType: 'text-input', schema: 'password' },
  'masked-card': { baseFieldType: 'text-input', schema: 'text-input' },

  // Number-input-based custom components
  'rating': { baseFieldType: 'number-input', schema: 'rating' },
  'range': { baseFieldType: 'number-input', schema: 'range' },

  // Checkbox-group-based custom components
  'toggleable-link': { baseFieldType: 'checkbox-group', schema: 'checkbox-group' },
};

const VALID_VIEW_TYPES = Object.keys(VIEW_TYPE_CONFIG);

/**
 * fieldTypes that require fd:viewType for proper rendering
 * These should use their base fieldType with fd:viewType instead
 *
 * Format: incorrectFieldType -> { correctFieldType, viewType }
 */
const FIELD_TYPES_REQUIRING_VIEW_TYPE = {
  'wizard': { correctFieldType: 'panel', viewType: 'wizard' },
  'accordion': { correctFieldType: 'panel', viewType: 'accordion' },
  'modal': { correctFieldType: 'panel', viewType: 'modal' },
  'form-accordion': { correctFieldType: 'panel', viewType: 'accordion' },
  'form-modal': { correctFieldType: 'panel', viewType: 'modal' },
  'password': { correctFieldType: 'text-input', viewType: 'password' },
  'rating': { correctFieldType: 'number-input', viewType: 'rating' },
  'range': { correctFieldType: 'number-input', viewType: 'range' },
  'tnc': { correctFieldType: 'panel', viewType: 'tnc' },
};

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Name validation pattern: starts with letter, then letters/numbers/underscores
 */
const NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a, b) {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Find similar property names for suggestions
 */
function findSimilarProperties(propName, allowedProps) {
  const matches = [];
  const propLower = propName.toLowerCase();

  for (const allowed of allowedProps) {
    const allowedLower = allowed.toLowerCase();
    if (allowedLower.includes(propLower) || propLower.includes(allowedLower)) {
      matches.push(allowed);
    } else if (levenshteinDistance(propLower, allowedLower) <= 3) {
      matches.push(allowed);
    }
  }

  return matches.slice(0, 3);
}

/**
 * Check if a key represents a child field (nested component)
 */
function isChildField(key, value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  if (value.fieldType) return true;
  const systemObjects = ['cq:responsive', 'fd:rules', 'fd:events', 'default'];
  if (systemObjects.includes(key)) return false;
  return false;
}

/**
 * Validate a single field
 * @param {object} field - The field to validate
 * @param {string} fieldPath - The path to the field
 * @param {Set<string>} customComponents - Set of custom component IDs from _form.json filters (optional)
 */
function validateField(field, fieldPath, customComponents = null) {
  const errors = [];

  // 1. Check fieldType exists
  if (!field.fieldType) {
    errors.push({
      path: fieldPath,
      field: fieldPath.split('.').pop(),
      property: 'fieldType',
      errorType: 'MISSING_REQUIRED',
      message: `Missing required property 'fieldType'. Every form field must have a fieldType that specifies its component type.`,
      suggestion: `Add 'fieldType' property with one of the valid values: ${VALID_FIELD_TYPES.slice(0, 10).join(', ')}...`,
      validOptions: VALID_FIELD_TYPES,
    });
    return errors;
  }

  const fieldType = field.fieldType;
  const viewType = field['fd:viewType'];
  const fieldName = field.name || fieldPath.split('.').pop() || 'unknown';

  // 2. Check fieldType is valid
  let schema = FIELD_SCHEMAS[fieldType];
  if (!schema) {
    const similar = findSimilarProperties(fieldType, VALID_FIELD_TYPES);
    let suggestion = `Change fieldType to one of the valid types.`;
    if (similar.length > 0) {
      suggestion = `Did you mean '${similar[0]}'? Change fieldType to a valid value.`;
    }
    errors.push({
      path: fieldPath,
      field: fieldName,
      fieldType: fieldType,
      property: 'fieldType',
      errorType: 'INVALID_VALUE',
      message: `Invalid fieldType '${fieldType}'. This is not a recognized form component type.`,
      suggestion: suggestion,
      validOptions: VALID_FIELD_TYPES,
    });
    return errors;
  }

  // 2b. Check if fieldType requires fd:viewType for proper rendering
  const viewTypeRequirement = FIELD_TYPES_REQUIRING_VIEW_TYPE[fieldType];
  if (viewTypeRequirement && !viewType) {
    errors.push({
      path: fieldPath,
      field: fieldName,
      fieldType: fieldType,
      property: 'fieldType',
      errorType: 'MISSING_VIEW_TYPE',
      message: `fieldType '${fieldType}' will not render correctly. It requires fieldType: "${viewTypeRequirement.correctFieldType}" with fd:viewType: "${viewTypeRequirement.viewType}".`,
      suggestion: `Change fieldType to "${viewTypeRequirement.correctFieldType}" and add "fd:viewType": "${viewTypeRequirement.viewType}" for proper rendering.`,
    });
  }

  // 3. Check fd:viewType if present - this determines actual component type
  let effectiveType = fieldType;
  let skipFieldValidation = false;
  if (viewType) {
    const viewTypeConfig = VIEW_TYPE_CONFIG[viewType];
    if (!viewTypeConfig) {
      // Unknown fd:viewType - check if it's a valid custom component from _form.json
      if (customComponents && customComponents.has(viewType)) {
        // It's a valid custom component, skip validation
        return {
          errors: [],
          skipped: {
            path: fieldPath,
            field: fieldName,
            fieldType: fieldType,
            viewType: viewType,
            reason: `fd:viewType '${viewType}' is a custom component. Skipping validation.`,
          },
        };
      } else {
        // Unknown viewType and not in custom components - throw error
        errors.push({
          path: fieldPath,
          field: fieldName,
          fieldType: fieldType,
          property: 'fd:viewType',
          errorType: 'INVALID_VIEW_TYPE',
          message: `Invalid fd:viewType '${viewType}'. This is not a recognized view type.`,
          suggestion: customComponents
            ? `Change fd:viewType to one of the valid values: ${VALID_VIEW_TYPES.join(', ')}, or add it to the _form.json filters.`
            : `Change fd:viewType to one of the valid values: ${VALID_VIEW_TYPES.join(', ')}`,
          validOptions: VALID_VIEW_TYPES,
        });
      }
    } else {
      // Validate that fieldType matches expected base type for this viewType
      if (fieldType !== viewTypeConfig.baseFieldType) {
        errors.push({
          path: fieldPath,
          field: fieldName,
          fieldType: fieldType,
          property: 'fieldType',
          errorType: 'INVALID_FIELD_TYPE_FOR_VIEW_TYPE',
          message: `fd:viewType '${viewType}' requires fieldType '${viewTypeConfig.baseFieldType}', but found '${fieldType}'.`,
          suggestion: `Change fieldType to "${viewTypeConfig.baseFieldType}" when using fd:viewType: "${viewType}".`,
        });
      }
      // Use the viewType schema if available
      if (viewTypeConfig.schema && FIELD_SCHEMAS[viewTypeConfig.schema]) {
        schema = FIELD_SCHEMAS[viewTypeConfig.schema];
        effectiveType = viewType;
      }
    }
  }

  const allowedProps = [...schema.properties, ...SYSTEM_PROPERTIES];

  // 3. Check name exists (if required)
  if (schema.required.includes('name') && !field.name) {
    errors.push({
      path: fieldPath,
      field: fieldName,
      fieldType: fieldType,
      property: 'name',
      errorType: 'MISSING_REQUIRED',
      message: `Missing required property 'name' for fieldType '${fieldType}'. The name property is used for data binding and field identification.`,
      suggestion: `Add 'name' property with a valid identifier. Format: starts with a letter, followed by letters, numbers, or underscores. Examples: 'firstName', 'email_address', 'field1'`,
    });
  }

  // 4. Validate name format
  if (field.name !== undefined) {
    if (typeof field.name !== 'string') {
      errors.push({
        path: fieldPath,
        field: fieldName,
        fieldType: fieldType,
        property: 'name',
        errorType: 'INVALID_TYPE',
        message: `Property 'name' must be a string, but got ${typeof field.name} (value: ${JSON.stringify(field.name)}).`,
        suggestion: `Change 'name' to a string value like "firstName" or "emailAddress".`,
      });
    } else if (!NAME_PATTERN.test(field.name)) {
      let issue = '';
      if (/^[0-9]/.test(field.name)) {
        issue = 'Name cannot start with a number.';
      } else if (/^_/.test(field.name)) {
        issue = 'Name cannot start with an underscore.';
      } else if (/[^a-zA-Z0-9_]/.test(field.name)) {
        issue = 'Name contains invalid characters (only letters, numbers, and underscores are allowed).';
      }
      errors.push({
        path: fieldPath,
        field: fieldName,
        fieldType: fieldType,
        property: 'name',
        errorType: 'INVALID_FORMAT',
        message: `Invalid name format '${field.name}'. ${issue}`,
        suggestion: `Change name to match the pattern: starts with a letter (a-z, A-Z), followed by letters, numbers, or underscores. Examples: 'firstName', 'email_address', 'field1'`,
      });
    }
  }

  // 5. Validate each property
  for (const [propName, propValue] of Object.entries(field)) {
    // Skip child fields
    if (isChildField(propName, propValue)) continue;
    // Skip system nested objects
    if (['cq:responsive', 'fd:rules', 'fd:events'].includes(propName)) continue;

    // Check if property is allowed
    if (!allowedProps.includes(propName)) {
      const similar = findSimilarProperties(propName, schema.properties);
      let suggestion;

      if (similar.length > 0) {
        suggestion = `Did you mean '${similar[0]}'? Remove '${propName}' or replace it with one of: ${similar.join(', ')}`;
      } else {
        const propsPreview = schema.properties.slice(0, 8).join(', ');
        const hasMore = schema.properties.length > 8 ? ` (and ${schema.properties.length - 8} more)` : '';
        suggestion = `Remove property '${propName}'. It is not valid for fieldType '${fieldType}'. Valid properties: ${propsPreview}${hasMore}`;
      }

      errors.push({
        path: fieldPath,
        field: fieldName,
        fieldType: fieldType,
        property: propName,
        errorType: 'INVALID_PROPERTY',
        message: `Property '${propName}' is not valid for fieldType '${fieldType}'.`,
        suggestion: suggestion,
        validOptions: schema.properties,
      });
      continue;
    }

    // Validate property type
    const expectedType = PROPERTY_TYPES[propName];
    if (expectedType && expectedType !== 'any' && propValue !== undefined && propValue !== null) {
      const actualType = Array.isArray(propValue) ? 'array' : typeof propValue;

      if (expectedType === 'number' && actualType !== 'number') {
        errors.push({
          path: fieldPath,
          field: fieldName,
          fieldType: fieldType,
          property: propName,
          errorType: 'INVALID_TYPE',
          message: `Property '${propName}' must be a number, but got ${actualType} (value: ${JSON.stringify(propValue)}).`,
          suggestion: `Change '${propName}' to a numeric value. Example: "${propName}": 5`,
        });
      } else if (expectedType === 'boolean' && actualType !== 'boolean') {
        errors.push({
          path: fieldPath,
          field: fieldName,
          fieldType: fieldType,
          property: propName,
          errorType: 'INVALID_TYPE',
          message: `Property '${propName}' must be a boolean (true/false), but got ${actualType} (value: ${JSON.stringify(propValue)}).`,
          suggestion: `Change '${propName}' to true or false. Example: "${propName}": true`,
        });
      } else if (expectedType === 'string' && actualType !== 'string') {
        errors.push({
          path: fieldPath,
          field: fieldName,
          fieldType: fieldType,
          property: propName,
          errorType: 'INVALID_TYPE',
          message: `Property '${propName}' must be a string, but got ${actualType} (value: ${JSON.stringify(propValue)}).`,
          suggestion: `Change '${propName}' to a string value. Example: "${propName}": "value"`,
        });
      } else if (expectedType === 'array' && actualType !== 'array') {
        errors.push({
          path: fieldPath,
          field: fieldName,
          fieldType: fieldType,
          property: propName,
          errorType: 'INVALID_TYPE',
          message: `Property '${propName}' must be an array, but got ${actualType} (value: ${JSON.stringify(propValue)}).`,
          suggestion: `Change '${propName}' to an array. Example: "${propName}": ["value1", "value2"]`,
        });
      }
    }

    // Validate enum values
    const enumKey = `${propName}:${fieldType}`;
    const enumValues = ENUM_VALUES[enumKey] || ENUM_VALUES[propName];

    if (enumValues && propValue !== undefined && propValue !== '' && propValue !== null) {
      if (!enumValues.includes(String(propValue))) {
        errors.push({
          path: fieldPath,
          field: fieldName,
          fieldType: fieldType,
          property: propName,
          errorType: 'INVALID_VALUE',
          message: `Invalid value '${propValue}' for property '${propName}'. This value is not in the list of allowed values.`,
          suggestion: `Change '${propName}' to one of the valid values: ${enumValues.join(', ')}`,
          validOptions: enumValues,
        });
      }
    }
  }

  // 6. Validate constraints
  if (schema.constraints) {
    for (const constraint of schema.constraints) {
      if (constraint === 'minLength <= maxLength') {
        if (field.minLength !== undefined && field.maxLength !== undefined) {
          if (field.minLength > field.maxLength) {
            errors.push({
              path: fieldPath,
              field: fieldName,
              fieldType: fieldType,
              property: 'minLength/maxLength',
              errorType: 'INVALID_CONSTRAINT',
              message: `Constraint violation: minLength (${field.minLength}) is greater than maxLength (${field.maxLength}). minLength must be less than or equal to maxLength.`,
              suggestion: `Fix the constraint by either: (1) decreasing minLength to ${field.maxLength} or less, OR (2) increasing maxLength to ${field.minLength} or more.`,
            });
          }
        }
      } else if (constraint === 'minimum <= maximum') {
        if (field.minimum !== undefined && field.maximum !== undefined) {
          if (field.minimum > field.maximum) {
            errors.push({
              path: fieldPath,
              field: fieldName,
              fieldType: fieldType,
              property: 'minimum/maximum',
              errorType: 'INVALID_CONSTRAINT',
              message: `Constraint violation: minimum (${field.minimum}) is greater than maximum (${field.maximum}). minimum must be less than or equal to maximum.`,
              suggestion: `Fix the constraint by either: (1) decreasing minimum to ${field.maximum} or less, OR (2) increasing maximum to ${field.minimum} or more.`,
            });
          }
        }
      } else if (constraint === 'minOccur <= maxOccur') {
        if (field.minOccur !== undefined && field.maxOccur !== undefined) {
          if (field.minOccur > field.maxOccur) {
            errors.push({
              path: fieldPath,
              field: fieldName,
              fieldType: fieldType,
              property: 'minOccur/maxOccur',
              errorType: 'INVALID_CONSTRAINT',
              message: `Constraint violation: minOccur (${field.minOccur}) is greater than maxOccur (${field.maxOccur}). minOccur must be less than or equal to maxOccur.`,
              suggestion: `Fix the constraint by either: (1) decreasing minOccur to ${field.maxOccur} or less, OR (2) increasing maxOccur to ${field.minOccur} or more.`,
            });
          }
        }
      }
    }
  }

  // 7. Check for 'items' wrapper in containers (panels, wizards, etc.)
  // The UE patch API expects children as direct siblings of the panel, NOT nested under 'items'.
  // An 'items' key containing child components indicates incorrect structure that will cause
  // panels to render without their children.
  if (schema.isContainer && field.items && typeof field.items === 'object' && !Array.isArray(field.items)) {
    const itemsChildKeys = Object.keys(field.items).filter(k => {
      const v = field.items[k];
      return typeof v === 'object' && v !== null && !Array.isArray(v) && (v.fieldType || v['sling:resourceType']);
    });
    if (itemsChildKeys.length > 0) {
      errors.push({
        path: fieldPath,
        field: fieldName,
        fieldType: fieldType,
        property: 'items',
        errorType: 'ITEMS_WRAPPER_NOT_ALLOWED',
        message: `Container '${fieldName}' has children nested under an 'items' wrapper (found: ${itemsChildKeys.join(', ')}). The UE patch API expects children as direct properties of the panel, not under 'items'. This will cause the panel to render without its fields.`,
        suggestion: `Move all children (${itemsChildKeys.join(', ')}) from inside '${fieldName}.items' to be direct properties of '${fieldName}', then remove the 'items' key.`,
      });
    }
  }

  // 8. Validate pattern is valid regex
  if (field.pattern !== undefined && field.pattern !== '') {
    try {
      new RegExp(field.pattern);
    } catch (e) {
      errors.push({
        path: fieldPath,
        field: fieldName,
        fieldType: fieldType,
        property: 'pattern',
        errorType: 'INVALID_VALUE',
        message: `Invalid regex pattern '${field.pattern}'. Error: ${e.message}`,
        suggestion: `Fix the regular expression syntax in 'pattern'. Ensure special characters are properly escaped.`,
      });
    }
  }

  return errors;
}

/**
 * Recursively validate all fields in a form
 * @param {object} obj - The object to validate
 * @param {string} basePath - The base path for error reporting
 * @param {Array} skippedFields - Array to collect skipped fields
 * @param {Set<string>} customComponents - Set of custom component IDs from _form.json filters
 */
function validateFormRecursive(obj, basePath = 'root', skippedFields = [], customComponents = null) {
  const errors = [];

  // Validate current object if it has fieldType
  if (obj.fieldType) {
    const result = validateField(obj, basePath, customComponents);
    // Check if result is the new format with skipped info
    if (result && result.skipped) {
      skippedFields.push(result.skipped);
    } else if (Array.isArray(result)) {
      errors.push(...result);
    }
  }

  // Recursively validate nested objects
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (['cq:responsive', 'fd:rules', 'fd:events'].includes(key)) continue;
      const childPath = basePath === 'root' ? key : `${basePath}.${key}`;
      const childResult = validateFormRecursive(value, childPath, skippedFields, customComponents);
      errors.push(...childResult.errors);
    }
  }

  return { errors, skippedFields };
}

/**
 * Main validation function
 * @param {object} form - The form to validate
 * @param {object} options - Optional configuration
 * @param {Set<string>|Array<string>} options.customComponents - Custom component IDs from _form.json filters
 */
function validate(form, options = {}) {
  // Convert array to Set if needed
  let customComponents = null;
  if (options.customComponents) {
    customComponents = options.customComponents instanceof Set
      ? options.customComponents
      : new Set(options.customComponents);
  }

  const result = validateFormRecursive(form, 'root', [], customComponents);
  const errors = result.errors;
  const skippedFields = result.skippedFields;

  const llmReport = {
    success: errors.length === 0,
    errorCount: errors.length,
    errors: errors.map(e => ({
      location: e.path,
      fieldName: e.field,
      fieldType: e.fieldType || 'unknown',
      property: e.property,
      errorType: e.errorType,
      problem: e.message,
      solution: e.suggestion,
      validOptions: e.validOptions,
    })),
    skippedFields: skippedFields.length > 0 ? skippedFields : undefined,
    instructions: errors.length > 0
      ? 'Fix the errors listed above. Each error includes a "solution" field describing exactly how to fix it. If "validOptions" are provided, use one of those values.'
      : 'Form validation passed. No changes needed.',
  };

  return {
    isValid: errors.length === 0,
    errors: errors,
    skippedFields: skippedFields,
    summary: generateSummary(errors, skippedFields),
    llmReport: llmReport,
  };
}

/**
 * Generate human-readable summary
 */
function generateSummary(errors, skippedFields = []) {
  const lines = [];

  // Skipped fields notice
  if (skippedFields.length > 0) {
    lines.push(`⚠ Skipped ${skippedFields.length} field(s) with unknown fd:viewType (custom components):`);
    for (const skipped of skippedFields) {
      lines.push(`  - [${skipped.path}] ${skipped.reason}`);
    }
    lines.push('');
  }

  if (errors.length === 0) {
    lines.push('✓ Form validation passed. All validated fields have valid properties.');
    return lines.join('\n');
  }

  lines.push(`✗ Form validation failed with ${errors.length} error(s):\n`);

  // Group by error type
  const byType = new Map();
  for (const error of errors) {
    const group = byType.get(error.errorType) || [];
    group.push(error);
    byType.set(error.errorType, group);
  }

  for (const [errorType, typeErrors] of byType) {
    lines.push(`## ${errorType} (${typeErrors.length}):`);
    for (const error of typeErrors) {
      lines.push(`  - [${error.path}] ${error.message}`);
      lines.push(`    Fix: ${error.suggestion}`);
      if (error.validOptions && error.validOptions.length <= 10) {
        lines.push(`    Valid options: ${error.validOptions.join(', ')}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  validate,
  validateField,
  VALID_FIELD_TYPES,
  FIELD_SCHEMAS,
  SYSTEM_PROPERTIES,
  PROPERTY_TYPES,
  ENUM_VALUES,
};
