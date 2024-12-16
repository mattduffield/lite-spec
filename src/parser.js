function handleAttributes(attributes, field, type, fieldSchema, context) {
  attributes.forEach(attr => {
    if (attr.startsWith('@enum')) {
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
    } else if (attr.startsWith('@minimum')) {
      fieldSchema.minimum = parseInt(attr.match(/\d+/)[0]);
    } else if (attr.startsWith('@maximum')) {
      fieldSchema.maximum = parseInt(attr.match(/\d+/)[0]);
    } else if (attr.startsWith('@format')) {
      fieldSchema.format = attr.match(/\((.*?)\)/)[1];
    } else if (attr.startsWith('@default')) {
      const defaultValue = attr.match(/\((.*?)\)/)[1];
      fieldSchema.default = defaultValue === 'true' ? true : (defaultValue === 'false' ? false : defaultValue);
    }
  });  
}
function parseDSL(dsl) {
  const lines = dsl.split('\n').map(line => line.trim()).filter(line => line !== '');
  let schema = { $defs: {} };
  let stack = [];
  let currentObject = schema;

  lines.forEach(line => {
    if (line.startsWith('def ')) {
      const [defName, defType] = line.match(/def (\w+) (object|array)/).slice(1);
      let defSchema;
      
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
      if (stack.length > 0) {
        currentObject = stack[stack.length - 1].object;
      }
    } else if (line.startsWith('@if')) {
      console.log('skipping @if: ', line);
    } else if (line.startsWith('@allow')) {
      console.log('skipping @allow: ', line);
    } else if (line.startsWith('@can')) {
      console.log('skipping @can: ', line);
    } else if (line.includes('array(')) {
      const [field, type] = line.split(':').map(v => v.trim());
      const attributes = type.match(/@\w+(\(.*?\))?/g) || [];
      const arrayTypeMatch = line.match(/array\((\w+)\)/);
      if (arrayTypeMatch) {
        const itemType = arrayTypeMatch[1];
        const nestedArray = { type: 'array', items: { type: itemType } };
        let context = stack[stack.length - 1];
        handleAttributes(attributes, field, type, nestedArray, context)
        currentObject['properties'][field] = nestedArray;
      }
    } else {
      const [field, type] = line.split(':').map(v => v.trim());
      const attributes = type.match(/@\w+(\(.*?\))?/g) || [];
      const fieldSchema = { type: type.split('@')[0].trim() };
      let context = stack[stack.length - 1];
      handleAttributes(attributes, field, type, fieldSchema, context);
      currentObject['properties'][field] = fieldSchema;
    }
  });

  return schema;
}
