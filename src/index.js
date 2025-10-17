const Ajv = require("ajv")

/**
 * Parses an breadcrumb expression and returns a sort rule
 * @param {string} expression - The breadcrumb expression to parse
 * @returns {object} The breadcrumb rule
 */
function handleBreadcrumbExpression(expression) {
  const m = expression.match(/@breadcrumb\((.*?)\)/)[1];
  const [name='', suffix=''] = m.split(',');
  return {name, suffix};
}

/**
 * Parses an sort expression and returns a sort rule
 * @param {string} expression - The sort expression to parse
 * @returns {object} The sort rule
 */
function handleSortExpression(expression) {
  const m = expression.match(/@sort\((.*?)\)/)[1];
  const [name='', dir='asc'] = m.split(',');
  return {name, dir};
}

/**
 * Parses a permission expression and returns a schema object
 * @param {string} expression - The permission expression to parse
 * @returns {object} The permission schema
 */
function handlePermExpression(expression) {
  const schema = {};
  const regex = /(\w+):\s*"([^"]*)"/g;
  const matches = expression.matchAll(regex);

  if (!matches) {
    throw new Error("Invalid permission expression format!");
  }

  for (const match of matches) {
    schema[match[1]] = match[2];
  }
  return schema;
}

/**
 * Parses an IF expression and returns a schema object
 * @param {string} expression - The IF expression to parse
 * @returns {object} The IF schema
 */
function handleIfExpression(expression) {
  const regex = /@if\(([^:]+):\s*(.*?\(.*,*\)*?),\s*(.*?)\)$/;
  const match = expression.match(regex);

  if (!match) {
    throw new Error("Invalid IF expression format!");
  }

  const [expr, property, cond, action] = expression.match(regex);
  const condAttributes = cond.match(/@\w+(\(.*?\))?/g) || [];
  const actionAttributes = action.match(/@\w+(\(.*?\))?/g) || [];

  // Construct the JSONSchema 'if' part
  const schema = {
    if: {
      required: [property],
      properties: {
        [property]: {}
      }
    },
    then: {}
  };

  for (let i = 0; i < condAttributes.length; i++) {
    const condRegex = /(@[a-zA-Z0-9_]+)\(([^)]+)\)/;
    const condMatch = condAttributes[i].match(condRegex);
    let [conditionExpr, conditionType, conditionValue] = condMatch;

    // Remove surrounding quotes from condition value if present
    if (conditionValue.startsWith('"') && conditionValue.endsWith('"')) {
      conditionValue = conditionValue.slice(1, -1); // Remove quotes for strings
    } else if (conditionValue === "true") {
      conditionValue = true;  // Convert "true" to boolean true
    } else if (conditionValue === "false") {
      conditionValue = false;  // Convert "false" to boolean false
    } else if (!isNaN(conditionValue)) {
      conditionValue = Number(conditionValue);  // Convert numbers
    }

    if (conditionType == "@enum") {
      conditionValue = conditionValue.split(',');
      conditionValue = conditionValue.map(m => m.replace('\"', '').trim());
    }      

    // Handle the condition part dynamically
    schema.if.properties[property][conditionType.replace('@', '')] = conditionValue;
  }

  for (let i = 0; i < actionAttributes.length; i++) {
    const actionRegex = /(@[a-zA-Z0-9_]+)\(([^)]+)\)/;
    const actionMatch = actionAttributes[i].match(actionRegex);
    let [actionExpr, actionType, actionValue] = actionMatch;

    // Handle the 'then' part dynamically
    if (actionType === '@required') {
      if (!schema.then.hasOwnProperty('required')) {
        schema.then.required = [];
      }
      schema.then.required.push(actionValue);
    } else {
      schema.then[actionType.replace('@', '')] = actionValue;
    }
  }

  return schema;
}

/**
 * Processes attributes and updates field schema and context accordingly
 * @param {Array} attributes - Array of attribute strings
 * @param {string} field - Field name
 * @param {string} type - Field type string
 * @param {object} fieldSchema - Schema object for the field
 * @param {object} context - Context object with requiredFields and ui properties
 * @param {Array} fieldPermissions - Array to collect field permissions
 */
function handleAttributes(attributes, field, type, fieldSchema, context, fieldPermissions) {
  attributes.forEach(attr => {
    if (attr.startsWith('@can')) {
      const perm = handlePermExpression(attr);
      fieldPermissions.push({ [field]: perm });
    } else if (attr.startsWith('@enum')) {
      const enums = type.match(/@enum\((.*?)\)/)[1];
      fieldSchema.enum = enums.split(',').map(m => m.trim());
    } else if (attr.startsWith('@ref')) {
      const refName = type.match(/@ref\((.*?)\)/)[1];
      fieldSchema['$ref'] = `#/$defs/${refName.toLowerCase()}`;
    } else if (attr.startsWith('@required')) {
      context.requiredFields.push(field);
    } else if (attr.startsWith('@ui')) {
      const m = attr.match(/@ui\((.*?)\)/)[1];
      const [uiType='', uiListType='', uiGroup='', uiOrder=0, uiLookup='', uiCollection='', uiCollectionDisplayMember='', uiCollectionValueMember=''] = m.split(',');
      
      // Add UI settings to the current object's UI container
      if (!context.ui) {
        context.ui = {};
      }
      context.ui[field] = {uiType, uiListType, uiOrder: parseInt(uiOrder), uiGroup, uiLookup, uiCollection, uiCollectionDisplayMember, uiCollectionValueMember};
    } else if (attr.startsWith('@minItems')) {
      fieldSchema.minItems = parseInt(attr.match(/\d+/)[0]);
    } else if (attr.startsWith('@maxItems')) {
      fieldSchema.maxItems = parseInt(attr.match(/\d+/)[0]);
    } else if (attr.startsWith('@uniqueItems')) {
      fieldSchema.uniqueItems = true;
    } else if (attr.startsWith('@minLength')) {
      fieldSchema.minLength = parseInt(attr.match(/\d+/)[0]);
    } else if (attr.startsWith('@maxLength')) {
      fieldSchema.maxLength = parseInt(attr.match(/\d+/)[0]);
    } else if (attr.startsWith('@exclusiveMinimum')) {
      fieldSchema.exclusiveMinimum = parseInt(attr.match(/\d+/)[0]);
    } else if (attr.startsWith('@exclusiveMaximum')) {
      fieldSchema.exclusiveMaximum = parseInt(attr.match(/\d+/)[0]);
    } else if (attr.startsWith('@minimum')) {
      fieldSchema.minimum = parseInt(attr.match(/\d+/)[0]);
    } else if (attr.startsWith('@maximum')) {
      fieldSchema.maximum = parseInt(attr.match(/\d+/)[0]);
    } else if (attr.startsWith('@multipleOf')) {
      fieldSchema.multipleOf = parseInt(attr.match(/\d+/)[0]);
    } else if (attr.startsWith('@format')) {
      const format = attr.match(/\((.*?)\)/)[1];
      if (format === 'date-time') {
        fieldSchema.anyOf = [
          { type: 'string', format: 'date-time' },
          { type: 'string', enum: [""] }
        ];
        delete fieldSchema.type;
      } else {
        fieldSchema.format = format;
      }
    } else if (attr.startsWith('@pattern')) {
      // Extract pattern handling nested parentheses
      const match = attr.match(/@pattern\((.*)\)$/);
      if (match) {
        fieldSchema.pattern = match[1];
      }
    } else if (attr.startsWith('@default')) {
      const defaultValue = attr.match(/\((.*?)\)/)[1];
      if (defaultValue === '""') {
        fieldSchema.default = "";
      } else if (defaultValue === 'true' || defaultValue === 'false') {
        fieldSchema.default = defaultValue === 'true';
      } else if (!isNaN(defaultValue)) {
        fieldSchema.default = parseFloat(defaultValue);
      } else {
        fieldSchema.default = defaultValue;
      }
    }
  });
}

/**
 * Extracts attributes from a type string, handling nested parentheses
 * @param {string} typeString - The type string containing attributes
 * @returns {Array} Array of attribute strings
 */
function extractAttributes(typeString) {
  const attributes = [];
  let i = 0;

  while (i < typeString.length) {
    // Find next @ symbol
    if (typeString[i] === '@') {
      let start = i;
      i++; // Move past @

      // Extract attribute name
      while (i < typeString.length && /\w/.test(typeString[i])) {
        i++;
      }

      // Check if there's a parenthesis
      if (i < typeString.length && typeString[i] === '(') {
        i++; // Move past opening (
        let depth = 1;

        // Find matching closing parenthesis
        while (i < typeString.length && depth > 0) {
          if (typeString[i] === '(') depth++;
          else if (typeString[i] === ')') depth--;
          i++;
        }
      }

      attributes.push(typeString.substring(start, i));
    } else {
      i++;
    }
  }

  return attributes;
}

/**
 * Parses a DSL string and returns a JSON Schema object
 * @param {string} dsl - The DSL string to parse
 * @returns {object} The parsed JSON Schema
 */
function parseDSL(dsl) {
  const lines = dsl.split('\n').map(line => line.trim()).filter(line => line !== '');
  let schema = { $defs: {} }; // No root UI object - each def will have its own
  let rules = [];
  let sortRules = [];
  let breadcrumbRules = [];
  let permissions = {};
  let fieldPermissions = [];
  let stack = [];
  let currentObject = schema;

  lines.forEach(line => {
    if (line.startsWith('def ')) {
      // Reset collections for the new definition
      rules = [];
      sortRules = [];
      breadcrumbRules = [];
      permissions = {};
      fieldPermissions = [];
      
      const [defName, defType] = line.match(/def (\w+) (object|array)/).slice(1);
      let defSchema = defType === 'object' 
        ? { type: 'object', properties: {}, ui: {} } // Add UI at def level
        : { type: 'array', items: { type: 'object', properties: {}, ui: {} } }; // Add UI at def's items level
      
      schema.$defs[defName.toLowerCase()] = defSchema;
      currentObject = defType === 'object' ? defSchema : defSchema.items;
      stack.push({ 
        object: currentObject, 
        requiredFields: [],
        ui: currentObject.ui // Reference to this def's UI
      });
    } else if (line.startsWith('model ')) {
      // Reset collections for the model
      rules = [];
      sortRules = [];
      breadcrumbRules = [];
      permissions = {};
      fieldPermissions = [];
      
      const modelName = line.match(/model (\w+)/)[1];
      schema.title = modelName.toLowerCase();
      schema.type = 'object';
      schema.properties = {};
      schema.ui = {}; // Add UI at model level
      currentObject = schema;
      stack.push({ 
        object: currentObject, 
        requiredFields: [],
        ui: schema.ui // Reference to model's UI
      });
    } else if (line.startsWith('}')) {
      const context = stack.pop();
      currentObject = context.object;
      if (context.requiredFields.length > 0) {
        currentObject.required = context.requiredFields;
      }
      if (rules.length > 0) {
        currentObject.allOf = rules;
      }
      if (sortRules.length > 0) {
        currentObject.sort = sortRules;
      }
      if (breadcrumbRules.length > 0) {
        currentObject.breadcrumb = breadcrumbRules;
      }
      if (Object.keys(permissions).length > 0) {
        currentObject.permissions = { collection: permissions };
      }
      if (fieldPermissions.length > 0) {
        currentObject.permissions = { ...currentObject.permissions, field: fieldPermissions };
      }
      
      // Reset for next section
      rules = [];
      sortRules = [];
      breadcrumbRules = [];
      permissions = {};
      fieldPermissions = [];
      
      if (stack.length > 0) {
        currentObject = stack[stack.length - 1].object;
      }
    } else if (line.startsWith('@if')) {
      const rule = handleIfExpression(line);
      rules.push(rule);
    } else if (line.startsWith('@breadcrumb')) {
      const rule = handleBreadcrumbExpression(line);
      breadcrumbRules.push(rule);
    } else if (line.startsWith('@sort')) {
      const rule = handleSortExpression(line);
      sortRules.push(rule);
    } else if (line.startsWith('@can')) {
      permissions = handlePermExpression(line);
    } else if (line.includes('array(')) {
      const [field, type] = line.split(':').map(v => v.trim());
      const attributes = extractAttributes(type);
      const arrayTypeMatch = line.match(/array\((\w+)\)/);
      const arrayRefTypeMatch = line.match(/array\(@ref\((\w+)\)/);

      let context = stack[stack.length - 1];

      if (arrayTypeMatch) {
        const itemType = arrayTypeMatch[1];
        const nestedArray = { type: 'array', items: { type: itemType } };
        handleAttributes(attributes, field, type, nestedArray, context, fieldPermissions);
        currentObject['properties'][field] = nestedArray;
      } else if (arrayRefTypeMatch) {
        const refName = type.match(/@ref\((.*?)\)/)[1];
        const refValue = `#/$defs/${refName.toLowerCase()}`;
        const nestedArray = { type: 'array', items: { $ref: refValue } };
        let filteredAttributes = attributes.filter(attribute => !attribute.includes(refName));
        handleAttributes(filteredAttributes, field, type, nestedArray, context, fieldPermissions);
        currentObject['properties'][field] = nestedArray;
      }
    } else {
      const field = line.substring(0, line.indexOf(':')).trim();
      const type = line.substring(line.indexOf(':') + 1).trim();
      // Extract attributes using balanced parentheses matching
      const attributes = extractAttributes(type);
      const fieldType = type.split('@')[0].trim();
      const fieldSchema = { type: fieldType };
      let context = stack[stack.length - 1];
      handleAttributes(attributes, field, type, fieldSchema, context, fieldPermissions);
      currentObject.properties[field] = fieldSchema;
    }
  });

  return schema;
}

/**
 * Validates data against a JSON Schema
 * @param {object} schema - The JSON Schema to validate against
 * @param {object} data - The data to validate
 * @returns {object} Validation result with valid flag and errors
 */
function validateDataUsingSchema(schema, data) {
  const ajv = new Ajv({ strict: false }); // Create an instance of Ajv
  const validate = ajv.compile(schema); // Compile the JSON Schema
  const isValid = validate(data); // Validate the data object

  if (isValid) {
    return { valid: true, errors: null };
  } else {
    return { valid: false, errors: validate.errors };
  }
}

// Export the functions to the global scope if in a browser environment
if (typeof window !== 'undefined') {
  if (!window.litespec) {
    window.litespec = {};
  }
  window.litespec.handlePermExpression = handlePermExpression;
  window.litespec.handleIfExpression = handleIfExpression;
  window.litespec.handleAttributes = handleAttributes;
  window.litespec.parseDSL = parseDSL;
  window.litespec.validateDataUsingSchema = validateDataUsingSchema;
}

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handlePermExpression,
    handleIfExpression,
    handleAttributes,
    parseDSL,
    validateDataUsingSchema
  };
}