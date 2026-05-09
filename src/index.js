const Ajv = require("ajv");

/**
 * Parses an breadcrumb expression and returns a sort rule
 * @param {string} expression - The breadcrumb expression to parse
 * @returns {object} The breadcrumb rule
 */
function handleBreadcrumbExpression(expression) {
  const m = expression.match(/@breadcrumb\((.*?)\)/)[1];
  const [name = "", suffix = ""] = m.split(",");
  return { name, suffix };
}

/**
 * Parses an sort expression and returns a sort rule
 * @param {string} expression - The sort expression to parse
 * @returns {object} The sort rule
 */
function handleSortExpression(expression) {
  const m = expression.match(/@sort\((.*?)\)/)[1];
  const [name = "", dir = "asc"] = m.split(",");
  return { name, dir };
}

/**
 * Parses a @bump_on_change expression and returns a rule object
 * @param {string} expression - The bump_on_change expression to parse
 * @returns {object} The rule with target (string) and when (array of strings)
 */
function handleBumpOnChangeExpression(expression) {
  const start = expression.indexOf("(");
  let depth = 0;
  let end = -1;
  for (let i = start; i < expression.length; i++) {
    if (expression[i] === "(") depth++;
    else if (expression[i] === ")") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  const inner = expression.substring(start + 1, end).trim();

  // Split on "when:" to get target and triggers
  const whenIdx = inner.indexOf("when:");
  if (whenIdx === -1) {
    throw new Error(
      `Invalid @bump_on_change syntax — expected "when:" clause: ${expression}`,
    );
  }

  const target = inner
    .substring(0, whenIdx)
    .replace(/,\s*$/, "")
    .trim();
  const whenStr = inner.substring(whenIdx + 5).trim();

  let when;
  if (whenStr.startsWith("[")) {
    // Array form: [field1, field2]
    when = whenStr
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);
  } else {
    // Single field
    when = [whenStr.trim()];
  }

  return { target, when };
}

/**
 * Parses a permission expression and returns a schema object
 * @param {string} expression - The permission expression to parse
 * @returns {object} The permission schema
 */
function handlePermExpression(expression) {
  const schema = {};

  // Check for @if(...) conditional clause within the expression
  let conditions = [];
  let exprForParsing = expression;

  const ifIdx = expression.indexOf("@if(");
  if (ifIdx !== -1) {
    // Find balanced closing paren for @if(...)
    let depth = 0;
    let ifEnd = -1;
    for (let i = ifIdx + 3; i < expression.length; i++) {
      if (expression[i] === "(") depth++;
      else if (expression[i] === ")") {
        depth--;
        if (depth === 0) {
          ifEnd = i;
          break;
        }
      }
    }

    if (ifEnd === -1) {
      throw new Error("Unbalanced parentheses in @can @if clause");
    }

    const ifContent = expression.substring(ifIdx + 4, ifEnd).trim();
    conditions = parseCanConditions(ifContent);

    // Remove the @if(...) from the expression for verb parsing
    exprForParsing =
      expression.substring(0, ifIdx) + expression.substring(ifEnd + 1);
  }

  const regex = /(\w+):\s*"([^"]*)"/g;
  const matches = exprForParsing.matchAll(regex);

  if (!matches) {
    throw new Error("Invalid permission expression format!");
  }

  for (const match of matches) {
    schema[match[1]] = match[2];
  }

  // Add _when arrays for each verb if conditions exist
  if (conditions.length > 0) {
    for (const verb of Object.keys(schema)) {
      schema[`${verb}_when`] = conditions;
    }
  }

  return schema;
}

/**
 * Parses condition values inside a @can @if clause into structured rules
 * @param {string} ifContent - The content inside @if(...) within a @can expression
 * @returns {Array} Array of {path, match, values} condition objects
 */
function parseCanConditions(ifContent) {
  const parts = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < ifContent.length; i++) {
    if (ifContent[i] === "(") depth++;
    else if (ifContent[i] === ")") depth--;
    else if (ifContent[i] === "," && depth === 0) {
      parts.push(ifContent.substring(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(ifContent.substring(start).trim());

  const conditions = [];
  for (const part of parts) {
    if (!part) continue;
    const colonIdx = part.indexOf(":");
    if (colonIdx === -1) {
      throw new Error(
        `Invalid condition in @can @if clause: "${part}" — expected "fieldPath: @match(value)"`,
      );
    }

    const path = part.substring(0, colonIdx).trim();
    const constraint = part.substring(colonIdx + 1).trim();

    const matchType = constraint.match(/@(\w+)\(/);
    if (!matchType) {
      throw new Error(
        `Invalid constraint in @can @if clause: "${constraint}" — expected @const(value) or @enum(values)`,
      );
    }

    const match = matchType[1];
    const validMatchTypes = ["const", "enum"];
    if (!validMatchTypes.includes(match)) {
      throw new Error(
        `Unsupported match type "@${match}" in @can @if clause — supported: @const, @enum`,
      );
    }

    // Extract values inside balanced parens
    const pStart = constraint.indexOf("(") + 1;
    let d = 1;
    let pEnd = -1;
    for (let i = pStart; i < constraint.length; i++) {
      if (constraint[i] === "(") d++;
      else if (constraint[i] === ")") {
        d--;
        if (d === 0) {
          pEnd = i;
          break;
        }
      }
    }
    const valStr = constraint.substring(pStart, pEnd).trim();

    let values;
    if (match === "enum") {
      values = valStr.split(",").map((v) => {
        v = v.trim().replace(/^"|"$/g, "");
        if (v === "true") return true;
        if (v === "false") return false;
        if (v !== "" && !isNaN(v)) return Number(v);
        return v;
      });
    } else {
      let val = valStr.trim().replace(/^"|"$/g, "");
      if (val === "true") val = true;
      else if (val === "false") val = false;
      else if (val !== "" && !isNaN(val)) val = Number(val);
      values = [val];
    }

    conditions.push({ path, match, values });
  }

  return conditions;
}

/**
 * Parses a filter value into the appropriate JS type
 * @param {string} val - The raw value string
 * @returns {*} The parsed value
 */
function parseFilterValue(val) {
  val = val.trim();
  if (val === "true") return true;
  if (val === "false") return false;
  if (val.startsWith('"') && val.endsWith('"')) return val.slice(1, -1);
  if (val !== "" && !isNaN(val)) return Number(val);
  return val;
}

/**
 * Parses a single filter condition string into a filter object
 * Supports ==, !=, IN operators, and AND/OR combinators
 * @param {string} condStr - The condition string (e.g., "address.state == @user.region")
 * @returns {object} The filter object for JSON Schema
 */
function parseFilterCondition(condStr) {
  condStr = condStr.trim();

  // Check for OR (split on " OR " at top level)
  if (/ OR /.test(condStr)) {
    const parts = condStr.split(/ OR /).map((p) => p.trim());
    return { $or: parts.map((p) => parseFilterCondition(p)) };
  }

  // Check for AND
  if (/ AND /.test(condStr)) {
    const parts = condStr.split(/ AND /).map((p) => p.trim());
    const merged = {};
    for (const part of parts) {
      Object.assign(merged, parseFilterCondition(part));
    }
    return merged;
  }

  // IN operator
  const inMatch = condStr.match(/^(.+?)\s+IN\s+(.+)$/);
  if (inMatch) {
    return { [inMatch[1].trim()]: { $in: inMatch[2].trim() } };
  }

  // != operator
  const neqMatch = condStr.match(/^(.+?)\s*!=\s*(.+)$/);
  if (neqMatch) {
    return { [neqMatch[1].trim()]: { $ne: parseFilterValue(neqMatch[2]) } };
  }

  // == operator
  const eqMatch = condStr.match(/^(.+?)\s*==\s*(.+)$/);
  if (eqMatch) {
    return { [eqMatch[1].trim()]: parseFilterValue(eqMatch[2]) };
  }

  throw new Error(`Invalid filter condition: ${condStr}`);
}

/**
 * Parses a @filter expression and returns a filters object
 * Supports simple conditions and role-based filter maps
 * @param {string} expression - The @filter expression to parse
 * @returns {object} The filters object keyed by action (e.g., { view: { rules: [...] } })
 */
function handleFilterExpression(expression) {
  // Find balanced content inside @filter(...)
  const start = expression.indexOf("(");
  let depth = 0;
  let end = -1;
  for (let i = start; i < expression.length; i++) {
    if (expression[i] === "(") depth++;
    else if (expression[i] === ")") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  const inner = expression.substring(start + 1, end).trim();

  // Split action from body at the first colon
  const colonIdx = inner.indexOf(":");
  const action = inner.substring(0, colonIdx).trim();
  const body = inner.substring(colonIdx + 1).trim();

  if (body.startsWith("{")) {
    // Role-based filters: { role: condition, role: condition, ... }
    const innerBody = body.slice(1, -1).trim();
    const rules = [];

    // Split by comma at the top level
    const parts = innerBody.split(",").map((p) => p.trim()).filter((p) => p);

    for (const part of parts) {
      const roleColonIdx = part.indexOf(":");
      const role = part.substring(0, roleColonIdx).trim();
      const condition = part.substring(roleColonIdx + 1).trim();

      if (condition === "*") {
        rules.push({ when: { role }, filter: null });
      } else {
        rules.push({ when: { role }, filter: parseFilterCondition(condition) });
      }
    }

    return { [action]: { rules } };
  } else {
    // Simple filter: single condition
    return { [action]: { rules: [{ filter: parseFilterCondition(body) }] } };
  }
}

/**
 * Parses an IF expression and returns a schema object
 * @param {string} expression - The IF expression to parse
 * @returns {object} The IF schema
 */
function handleIfExpression(expression) {
  // Extract property, condition, and action parts manually to handle nested parens
  const ifMatch = expression.match(/@if\(([^:]+):\s*/);
  if (!ifMatch) {
    throw new Error("Invalid IF expression format!");
  }

  const property = ifMatch[1];
  let remaining = expression.substring(ifMatch[0].length);

  // Find the split between condition and action by tracking parentheses
  let depth = 0;
  let splitIndex = -1;

  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i] === "(") depth++;
    else if (remaining[i] === ")") depth--;
    else if (remaining[i] === "," && depth === 0) {
      splitIndex = i;
      break;
    }
  }

  if (splitIndex === -1) {
    throw new Error("Invalid IF expression format - missing comma separator!");
  }

  const cond = remaining.substring(0, splitIndex).trim();
  const action = remaining
    .substring(splitIndex + 1, remaining.length - 1)
    .trim(); // Remove trailing )

  const condAttributes = extractAttributes(cond);
  const actionAttributes = extractAttributes(action);

  // Check if property is nested (e.g., quote.insurance_type)
  const propertyPath = property.split(".");

  // Construct the JSONSchema 'if' part with nested property support
  const schema = {
    if: {
      properties: {},
    },
    then: {},
  };

  // Build nested property structure for 'if' condition
  let currentProp = schema.if.properties;
  for (let i = 0; i < propertyPath.length; i++) {
    const propName = propertyPath[i];
    if (i === propertyPath.length - 1) {
      // Last property in path - apply conditions here
      currentProp[propName] = {};

      for (let j = 0; j < condAttributes.length; j++) {
        const condRegex = /(@[a-zA-Z0-9_]+)\(([^)]+)\)/;
        const condMatch = condAttributes[j].match(condRegex);

        if (!condMatch) continue;

        let [, conditionType, conditionValue] = condMatch;

        // Remove surrounding quotes from condition value if present
        if (conditionValue.startsWith('"') && conditionValue.endsWith('"')) {
          conditionValue = conditionValue.slice(1, -1);
        } else if (conditionValue === "true") {
          conditionValue = true;
        } else if (conditionValue === "false") {
          conditionValue = false;
        } else if (!isNaN(conditionValue)) {
          conditionValue = Number(conditionValue);
        }

        if (conditionType == "@enum") {
          conditionValue = conditionValue.split(",");
          conditionValue = conditionValue.map((m) =>
            m.replace('\"', "").trim(),
          );
        }

        currentProp[propName][conditionType.replace("@", "")] = conditionValue;
      }
    } else {
      // Intermediate property - create nested structure
      currentProp[propName] = { properties: {} };
      currentProp = currentProp[propName].properties;
    }
  }

  // Handle the 'then' part - support both @required and property-specific constraints
  for (let i = 0; i < actionAttributes.length; i++) {
    const actionRegex = /(@[a-zA-Z0-9_]+)\(([^)]+)\)/;
    const actionMatch = actionAttributes[i].match(actionRegex);

    if (!actionMatch) continue;

    let [, actionType, actionValue] = actionMatch;

    // Check if action value contains a comma (property,value format)
    const actionParts = actionValue.split(",");

    if (actionType === "@required") {
      // Check for array item syntax: household_members[].driver or household_members[].driver.license_status
      if (actionValue.includes("[]")) {
        const match = actionValue.match(/^([^[]+)\[\]\.(.+)$/);
        if (match) {
          const arrayName = match[1]; // e.g., "household_members"
          const itemPath = match[2]; // e.g., "driver" or "driver.license_status"

          // Create nested structure for array items in 'then'
          if (!schema.then.properties) {
            schema.then.properties = {};
          }
          if (!schema.then.properties[arrayName]) {
            schema.then.properties[arrayName] = {};
          }
          if (!schema.then.properties[arrayName].items) {
            schema.then.properties[arrayName].items = {};
          }

          // Check if itemPath contains nested property (e.g., "driver.license_status")
          if (itemPath.includes(".")) {
            const pathParts = itemPath.split(".");
            const objectName = pathParts[0]; // e.g., "driver"
            const fieldName = pathParts.slice(1).join("."); // e.g., "license_status"

            // Create nested structure for the object within array items
            if (!schema.then.properties[arrayName].items.properties) {
              schema.then.properties[arrayName].items.properties = {};
            }
            if (
              !schema.then.properties[arrayName].items.properties[objectName]
            ) {
              schema.then.properties[arrayName].items.properties[objectName] =
                {};
            }
            if (
              !schema.then.properties[arrayName].items.properties[objectName]
                .required
            ) {
              schema.then.properties[arrayName].items.properties[
                objectName
              ].required = [];
            }
            schema.then.properties[arrayName].items.properties[
              objectName
            ].required.push(fieldName);
          } else {
            // Simple property within array item (e.g., "driver")
            if (!schema.then.properties[arrayName].items.required) {
              schema.then.properties[arrayName].items.required = [];
            }
            schema.then.properties[arrayName].items.required.push(itemPath);
          }
        }
      } else if (actionValue.includes(".")) {
        // Handle nested property requirement: @required(liability_limits.bi)
        const pathParts = actionValue.split(".");
        const objectName = pathParts[0]; // e.g., "liability_limits"
        const fieldName = pathParts.slice(1).join("."); // e.g., "bi" or "nested.field"

        // Create nested structure in 'then'
        if (!schema.then.properties) {
          schema.then.properties = {};
        }
        if (!schema.then.properties[objectName]) {
          schema.then.properties[objectName] = {};
        }
        if (!schema.then.properties[objectName].required) {
          schema.then.properties[objectName].required = [];
        }
        schema.then.properties[objectName].required.push(fieldName);
      } else {
        // Simple property requirement: @required(tags)
        if (!schema.then.hasOwnProperty("required")) {
          schema.then.required = [];
        }
        schema.then.required.push(actionValue);
      }
    } else if (actionParts.length === 2) {
      // Format: @minItems(household_vehicles,1)
      const targetProperty = actionParts[0].trim();
      let constraintValue = actionParts[1].trim();

      // Convert value to appropriate type
      if (!isNaN(constraintValue)) {
        constraintValue = Number(constraintValue);
      } else if (constraintValue === "true") {
        constraintValue = true;
      } else if (constraintValue === "false") {
        constraintValue = false;
      }

      // Create properties object in 'then' if it doesn't exist
      if (!schema.then.properties) {
        schema.then.properties = {};
      }
      if (!schema.then.properties[targetProperty]) {
        schema.then.properties[targetProperty] = {};
      }

      schema.then.properties[targetProperty][actionType.replace("@", "")] =
        constraintValue;
    } else {
      // Legacy format: constraint applies to root
      schema.then[actionType.replace("@", "")] = actionValue;
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
 * @param {object} context - Context object with requiredFields
 * @param {Array} fieldPermissions - Array to collect field permissions
 */
function handleAttributes(
  attributes,
  field,
  type,
  fieldSchema,
  context,
  fieldPermissions,
) {
  attributes.forEach((attr) => {
    if (attr.startsWith("@can")) {
      const perm = handlePermExpression(attr);
      fieldPermissions.push({ [field]: perm });
    } else if (attr.startsWith("@enum")) {
      const enums = type.match(/@enum\((.*?)\)/)[1];
      fieldSchema.enum = enums.split(",").map((m) => m.trim());
    } else if (attr.startsWith("@ref")) {
      const refName = type.match(/@ref\((.*?)\)/)[1];
      fieldSchema["$ref"] = `#/$defs/${refName.toLowerCase()}`;
    } else if (attr.startsWith("@required")) {
      context.requiredFields.push(field);
    } else if (attr.startsWith("@minItems")) {
      fieldSchema.minItems = parseInt(attr.match(/\d+/)[0]);
    } else if (attr.startsWith("@maxItems")) {
      fieldSchema.maxItems = parseInt(attr.match(/\d+/)[0]);
    } else if (attr.startsWith("@uniqueItems")) {
      fieldSchema.uniqueItems = true;
    } else if (attr.startsWith("@minLength")) {
      fieldSchema.minLength = parseInt(attr.match(/\d+/)[0]);
    } else if (attr.startsWith("@maxLength")) {
      fieldSchema.maxLength = parseInt(attr.match(/\d+/)[0]);
    } else if (attr.startsWith("@exclusiveMinimum")) {
      fieldSchema.exclusiveMinimum = parseInt(attr.match(/\d+/)[0]);
    } else if (attr.startsWith("@exclusiveMaximum")) {
      fieldSchema.exclusiveMaximum = parseInt(attr.match(/\d+/)[0]);
    } else if (attr.startsWith("@minimum")) {
      fieldSchema.minimum = parseInt(attr.match(/\d+/)[0]);
    } else if (attr.startsWith("@maximum")) {
      fieldSchema.maximum = parseInt(attr.match(/\d+/)[0]);
    } else if (attr.startsWith("@multipleOf")) {
      fieldSchema.multipleOf = parseInt(attr.match(/\d+/)[0]);
    } else if (attr.startsWith("@format")) {
      const format = attr.match(/\((.*?)\)/)[1];
      if (format === "date-time") {
        fieldSchema.anyOf = [
          { type: "string", format: "date-time" },
          { type: "string", enum: [""] },
        ];
        delete fieldSchema.type;
      } else {
        fieldSchema.format = format;
      }
    } else if (attr.startsWith("@pattern")) {
      // Extract pattern handling nested parentheses
      const match = attr.match(/@pattern\((.*)\)$/);
      if (match) {
        fieldSchema.pattern = match[1];
      }
    } else if (attr.startsWith("@default")) {
      // Skip default on date-time fields — absence is the correct "no value"
      const isDateTime =
        fieldSchema.anyOf &&
        fieldSchema.anyOf.some((s) => s.format === "date-time");
      if (isDateTime) return;

      const defaultValue = attr.match(/\((.*?)\)/)[1];
      if (defaultValue === '""') {
        fieldSchema.default = "";
      } else if (defaultValue === "true" || defaultValue === "false") {
        fieldSchema.default = defaultValue === "true";
      } else if (
        !isNaN(defaultValue) &&
        (fieldSchema.type === "number" || fieldSchema.type === "integer")
      ) {
        // Only convert to number if field type is numeric
        fieldSchema.default = parseFloat(defaultValue);
      } else {
        // For string types and others, keep as string (remove quotes if present)
        fieldSchema.default = defaultValue.replace(/^["']|["']$/g, "");
      }
    } else if (attr.startsWith("@startTrim")) {
      // Start trim - removes only leading whitespace
      fieldSchema["x-startTrim"] = true;
    } else if (attr.startsWith("@endTrim")) {
      // End trim - removes only trailing whitespace
      fieldSchema["x-endTrim"] = true;
    } else if (attr.startsWith("@trim")) {
      // Full trim - removes leading and trailing whitespace
      fieldSchema["x-trim"] = true;
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
    if (typeString[i] === "@") {
      let start = i;
      i++; // Move past @

      // Extract attribute name
      while (i < typeString.length && /\w/.test(typeString[i])) {
        i++;
      }

      // Check if there's a parenthesis
      if (i < typeString.length && typeString[i] === "(") {
        i++; // Move past opening (
        let depth = 1;

        // Find matching closing parenthesis
        while (i < typeString.length && depth > 0) {
          if (typeString[i] === "(") depth++;
          else if (typeString[i] === ")") depth--;
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
  const rawLines = dsl
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

  // Join multi-line directives (@filter, @actions) into single lines
  const lines = [];
  let accumulator = null;
  let parenDepth = 0;

  for (const line of rawLines) {
    if (accumulator !== null) {
      accumulator += " " + line;
      for (const ch of line) {
        if (ch === "(") parenDepth++;
        else if (ch === ")") parenDepth--;
      }
      if (parenDepth <= 0) {
        lines.push(accumulator);
        accumulator = null;
        parenDepth = 0;
      }
    } else if (
      (line.startsWith("@filter") || line.startsWith("@actions")) &&
      (() => {
        let d = 0;
        for (const ch of line) {
          if (ch === "(") d++;
          else if (ch === ")") d--;
        }
        return d > 0;
      })()
    ) {
      accumulator = line;
      parenDepth = 0;
      for (const ch of line) {
        if (ch === "(") parenDepth++;
        else if (ch === ")") parenDepth--;
      }
    } else {
      lines.push(line);
    }
  }
  if (accumulator !== null) {
    lines.push(accumulator);
  }

  let schema = { $defs: {} };
  let rules = [];
  let sortRules = [];
  let breadcrumbRules = [];
  let permissions = {};
  let fieldPermissions = [];
  let filterRules = {};
  let actionPermissions = {};
  let bumpOnChangeRules = [];
  let stack = [];
  let currentObject = schema;

  lines.forEach((line) => {
    if (line.startsWith("def ")) {
      // Reset collections for the new definition
      rules = [];
      sortRules = [];
      breadcrumbRules = [];
      permissions = {};
      fieldPermissions = [];
      filterRules = {};
      actionPermissions = {};
      bumpOnChangeRules = [];

      const [defName, defType] = line
        .match(/def (\w+) (object|array)/)
        .slice(1);
      let defSchema =
        defType === "object"
          ? { type: "object", properties: {} }
          : {
              type: "array",
              items: {
                type: "object",
                properties: {},
              },
            };

      schema.$defs[defName.toLowerCase()] = defSchema;
      currentObject = defType === "object" ? defSchema : defSchema.items;
      stack.push({
        object: currentObject,
        requiredFields: [],
        blockType: "def",
      });
    } else if (line.startsWith("model ")) {
      // Reset collections for the model
      rules = [];
      sortRules = [];
      breadcrumbRules = [];
      permissions = {};
      fieldPermissions = [];
      filterRules = {};
      actionPermissions = {};
      bumpOnChangeRules = [];

      const modelName = line.match(/model (\w+)/)[1];
      schema.title = modelName.toLowerCase();
      schema.type = "object";
      schema.properties = {};
      currentObject = schema;
      stack.push({
        object: currentObject,
        requiredFields: [],
        blockType: "model",
      });
    } else if (line.startsWith("}")) {
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
      if (bumpOnChangeRules.length > 0) {
        currentObject.bumpOnChange = bumpOnChangeRules;
      }
      // Validate @bump_on_change field references (model blocks only)
      if (context.blockType === "model" && bumpOnChangeRules.length > 0) {
        const bumpProps = currentObject.properties || {};
        for (const rule of bumpOnChangeRules) {
          if (!bumpProps[rule.target]) {
            throw new Error(
              `@bump_on_change target "${rule.target}" — no property "${rule.target}" exists in this model`,
            );
          }
          for (const trigger of rule.when) {
            if (!bumpProps[trigger]) {
              throw new Error(
                `@bump_on_change trigger "${trigger}" — no property "${trigger}" exists in this model`,
              );
            }
          }
        }
      }
      // Validate conditional permission field references (model blocks only —
      // def blocks are fragments that may reference fields in the parent model)
      if (context.blockType === "model") {
        const props = currentObject.properties || {};
        for (const fp of fieldPermissions) {
          for (const [field, perms] of Object.entries(fp)) {
            for (const [key, value] of Object.entries(perms)) {
              if (key.endsWith("_when") && Array.isArray(value)) {
                for (const rule of value) {
                  const topField = rule.path.split(".")[0];
                  if (!props[topField]) {
                    throw new Error(
                      `@can @if on field "${field}" references unknown field "${rule.path}" — no property "${topField}" exists in this model`,
                    );
                  }
                }
              }
            }
          }
        }
        // Validate collection-level conditional permission references
        for (const [key, value] of Object.entries(permissions)) {
          if (key.endsWith("_when") && Array.isArray(value)) {
            for (const rule of value) {
              const topField = rule.path.split(".")[0];
              if (!props[topField]) {
                throw new Error(
                  `@can @if references unknown field "${rule.path}" — no property "${topField}" exists in this model`,
                );
              }
            }
          }
        }
      }

      if (
        Object.keys(permissions).length > 0 ||
        Object.keys(filterRules).length > 0 ||
        Object.keys(actionPermissions).length > 0 ||
        fieldPermissions.length > 0
      ) {
        currentObject.permissions = {};
        if (Object.keys(permissions).length > 0) {
          currentObject.permissions.collection = permissions;
        }
        if (Object.keys(filterRules).length > 0) {
          currentObject.permissions.filters = filterRules;
        }
        if (fieldPermissions.length > 0) {
          currentObject.permissions.field = fieldPermissions;
        }
        if (Object.keys(actionPermissions).length > 0) {
          currentObject.permissions.actions = actionPermissions;
        }
      }

      // Reset for next section
      rules = [];
      sortRules = [];
      breadcrumbRules = [];
      permissions = {};
      fieldPermissions = [];
      filterRules = {};
      actionPermissions = {};
      bumpOnChangeRules = [];

      if (stack.length > 0) {
        currentObject = stack[stack.length - 1].object;
      }
    } else if (line.startsWith("@if")) {
      const rule = handleIfExpression(line);
      rules.push(rule);
    } else if (line.startsWith("@breadcrumb")) {
      const rule = handleBreadcrumbExpression(line);
      breadcrumbRules.push(rule);
    } else if (line.startsWith("@sort")) {
      const rule = handleSortExpression(line);
      sortRules.push(rule);
    } else if (line.startsWith("@can")) {
      permissions = handlePermExpression(line);
    } else if (line.startsWith("@filter")) {
      const parsed = handleFilterExpression(line);
      Object.assign(filterRules, parsed);
    } else if (line.startsWith("@actions")) {
      actionPermissions = handlePermExpression(line);
    } else if (line.startsWith("@bump_on_change")) {
      const rule = handleBumpOnChangeExpression(line);
      bumpOnChangeRules.push(rule);
    } else if (line.includes("array(")) {
      const field = line.substring(0, line.indexOf(":")).trim();
      const type = line.substring(line.indexOf(":") + 1).trim();
      const attributes = extractAttributes(type);
      const arrayTypeMatch = line.match(/array\((\w+)\)/);
      const arrayRefTypeMatch = line.match(/array\(@ref\((\w+)\)/);

      let context = stack[stack.length - 1];

      if (arrayTypeMatch) {
        const itemType = arrayTypeMatch[1];
        const nestedArray = { type: "array", items: { type: itemType } };
        handleAttributes(
          attributes,
          field,
          type,
          nestedArray,
          context,
          fieldPermissions,
        );
        currentObject["properties"][field] = nestedArray;
      } else if (arrayRefTypeMatch) {
        const refName = type.match(/@ref\((.*?)\)/)[1];
        const refValue = `#/$defs/${refName.toLowerCase()}`;
        const nestedArray = { type: "array", items: { $ref: refValue } };
        let filteredAttributes = attributes.filter(
          (attribute) => !attribute.includes(refName),
        );
        handleAttributes(
          filteredAttributes,
          field,
          type,
          nestedArray,
          context,
          fieldPermissions,
        );
        currentObject["properties"][field] = nestedArray;
      }
    } else {
      const field = line.substring(0, line.indexOf(":")).trim();
      const type = line.substring(line.indexOf(":") + 1).trim();
      // Extract attributes using balanced parentheses matching
      const attributes = extractAttributes(type);
      const fieldType = type.split("@")[0].trim();

      // Handle objectid as a special type - convert to string with pattern
      let fieldSchema;
      if (fieldType === "objectid") {
        fieldSchema = {
          type: "string",
          pattern: "^$|^[a-fA-F0-9]{24}$", // Allow empty string or valid 24-char hex
        };
      } else {
        fieldSchema = { type: fieldType };
      }

      let context = stack[stack.length - 1];
      handleAttributes(
        attributes,
        field,
        type,
        fieldSchema,
        context,
        fieldPermissions,
      );
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
if (typeof window !== "undefined") {
  if (!window.litespec) {
    window.litespec = {};
  }
  window.litespec.handlePermExpression = handlePermExpression;
  window.litespec.handleFilterExpression = handleFilterExpression;
  window.litespec.handleIfExpression = handleIfExpression;
  window.litespec.handleAttributes = handleAttributes;
  window.litespec.parseDSL = parseDSL;
  window.litespec.validateDataUsingSchema = validateDataUsingSchema;
}

// Export for Node.js environment (for testing) - using try/catch to avoid bundler issues
try {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      handlePermExpression,
      handleFilterExpression,
      handleIfExpression,
      handleAttributes,
      parseDSL,
      validateDataUsingSchema,
    };
  }
} catch (e) {
  // Ignore - not in Node.js environment
}
