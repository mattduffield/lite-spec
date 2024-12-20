const Ajv = require("ajv")

function handlePermExpression(expression) {
  const schema = {};
  const regex = /(\w+):\s*"([^"]*)"/g;
  const matches = expression.matchAll(regex);

  if (!matches) {
    throw new Error("Invalid permission expression format!");
  }

  for (const match of matches) {
    schema[match[1]] = match[2];
    // console.log(`Full match: ${match[0]}`);
    // console.log(`Group 1 (key): ${match[1]}`);
    // console.log(`Group 2 (value): ${match[2]}`);
  }
  return schema;
}
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
function handleAttributes(attributes, field, type, fieldSchema, context, fieldPermissions) {
  attributes.forEach(attr => {
    if (attr.startsWith('@can')) {
      const perm = this.handlePermExpression(attr);
      fieldPermissions.push({[field]: perm});
    } else if (attr.startsWith('@enum')) {
      const enums = type.match(/@enum\((.*?)\)/)[1];
      fieldSchema.enum = enums.split(',').map(m => m.trim());
    } else if (attr.startsWith('@ref')) {
      const refName = type.match(/@ref\((.*?)\)/)[1];
      fieldSchema['$ref'] = `#/$defs/${refName.toLowerCase()}`;
    } else if (attr.startsWith('@required')) {
      context.requiredFields.push(field);
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
      if (format == 'date-time') {
        fieldSchema.anyOf = [
          {
            "type": "string",
            "format": "date-time"
          },
          {
            "type": "string",
            "enum": [""]
          }
        ];
        delete fieldSchema.type;
      } else {
        fieldSchema.format = attr.match(/\((.*?)\)/)[1];          
      }
    } else if (attr.startsWith('@default')) {
      const defaultValue = attr.match(/\((.*?)\)/)[1];
      if (defaultValue === '""') {
        fieldSchema.default = "";
      }
      else if (defaultValue === 'true' || defaultValue === 'false') {
        fieldSchema.default = defaultValue === 'true' ? true : false;
      } else if (!isNaN(defaultValue)) {
        const decimalPlacesMatch = defaultValue.match(/\.(\d+)/);
        const decimalPlaces = decimalPlacesMatch ? decimalPlacesMatch[1].length : 0;
        const value = parseFloat(defaultValue).toFixed(decimalPlaces);
        fieldSchema.default = parseFloat(value);
      } else {
        fieldSchema.default = defaultValue;
      }
    }
  });
}
function parseDSL(dsl) {
  const lines = dsl.split('\n').map(line => line.trim()).filter(line => line !== '');
  let schema = { $defs: {} };
  let rules = [];
  let permissions = {};
  let fieldPermissions = [];
  let stack = [];
  let currentObject = schema;

  lines.forEach(line => {
    if (line.startsWith('def ')) {
      const [defName, defType] = line.match(/def (\w+) (object|array)/).slice(1);
      let defSchema;
      rules = [];
      permissions = {};
      fieldPermissions = [];
      if (defType === 'object') {
        defSchema = { type: 'object', properties: {} };
      } else if (defType === 'array') {
        defSchema = { type: 'array', items: { type: 'object', properties: {} } };
      }
      schema.$defs[defName.toLowerCase()] = defSchema;
      currentObject = defSchema.type === 'object' ? defSchema : defSchema.items;
      stack.push({ object: currentObject, requiredFields: [] });
    } else if (line.startsWith('model ')) {
      const modelName = line.match(/model (\w+)/)[1];
      rules = [];
      permissions = {};
      fieldPermissions = [];
      schema.title = modelName.toLowerCase();
      schema.type = 'object';
      schema.properties = {};
      currentObject = schema;
      stack.push({ object: currentObject, requiredFields: [] });
    } else if (line.startsWith('}')) {
      const context = stack.pop();
      currentObject = context.object;
      if (context.requiredFields.length > 0) {
        currentObject['required'] = context.requiredFields;
      }
      if (rules.length > 0) {
        currentObject.allOf = rules;  
      }
      if (Object.entries(permissions).length > 0) {
        if (!currentObject.hasOwnProperty('permissions')) {
          currentObject.permissions = {};
        }
        currentObject.permissions.collection = permissions;
        // currentObject.permissions = permissions;  
      }
      if (fieldPermissions.length > 0) {
        if (!currentObject.hasOwnProperty('permissions')) {
          currentObject.permissions = {};
        }
        currentObject.permissions.field = fieldPermissions;
        // currentObject.fieldPermissions = fieldPermissions;
      }
      if (stack.length > 0) {
        currentObject = stack[stack.length - 1].object;
      }
    } else if (line.startsWith('@if')) {
      const rule = this.handleIfExpression(line);
      rules.push(rule);
    } else if (line.startsWith('@can')) {
      const perm = this.handlePermExpression(line);
      permissions = perm;
    } else if (line.includes('array(')) {
      const [field, type] = line.split(':').map(v => v.trim());
      const attributes = type.match(/@\w+(\(.*?\))?/g) || [];
      const arrayTypeMatch = line.match(/array\((\w+)\)/);
      const arrayRefTypeMatch = line.match(/array\(@ref\((\w+)\)/);
      if (arrayTypeMatch) {
        const itemType = arrayTypeMatch[1];
        const nestedArray = { type: 'array', items: { type: itemType } };
        let context = stack[stack.length - 1];
        this.handleAttributes(attributes, field, type, nestedArray, context, fieldPermissions);
        currentObject['properties'][field] = nestedArray;
      } else if (arrayRefTypeMatch) {
        const refName = type.match(/@ref\((.*?)\)/)[1];
        const refValue = `#/$defs/${refName.toLowerCase()}`;
        const nestedArray = { type: 'array', items: { $ref: refValue } };
        let context = stack[stack.length - 1];
        let filteredAttributes = attributes.filter(attribute => !attribute.includes(refName));
        this.handleAttributes(filteredAttributes, field, type, nestedArray, context, fieldPermissions);
        currentObject['properties'][field] = nestedArray;
      }
    } else {
      const field = line.substring(0, line.indexOf(':')).trim();
      const type = line.substring(line.indexOf(':') + 1).trim();
      // const [field, type] = line.split(':').map(v => v.trim());
      const attributes = type.match(/@\w+(\(.*?\))?/g) || [];
      const fieldType = type.split('@')[0].trim();
      const fieldSchema = {};
      if (fieldType == "decimal") {
        fieldSchema.bsonType = "Decimal128";
      } else {
        fieldSchema.type = fieldType;
      }
      let context = stack[stack.length - 1];
      this.handleAttributes(attributes, field, type, fieldSchema, context, fieldPermissions);
      currentObject['properties'][field] = fieldSchema;
    }
  });

  return schema;
}
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
if (!window.litespec) {
  window.litespec = {};
}
window.litespec.handlePermExpression = handlePermExpression;
window.litespec.handleIfExpression = handleIfExpression;
window.litespec.handleAttributes = handleAttributes;
window.litespec.parseDSL = parseDSL;
window.litespec.validateDataUsingSchema = validateDataUsingSchema;