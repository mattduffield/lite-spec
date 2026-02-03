/**
 * Field Rules Engine
 *
 * A declarative rules engine for managing form field behavior (visibility, required state,
 * disabled state, setValue, etc.) based on dependencies between fields.
 *
 * Basic Usage:
 *   const rules = {
 *     "field_name": {
 *       visible: { when: "other_field", equals: "value" },
 *       required: { when: "other_field", equals: "value" },
 *       setValue: { when: "trigger_field", equals: "yes", value: "default_value" }
 *     }
 *   };
 *   const engine = new FieldRulesEngine(rules);
 *   engine.init();
 *
 * Wildcard Patterns (for loops):
 *   // Use * to match any index in loops (household_vehicles.0, household_vehicles.1, etc.)
 *
 *   // Name-based wildcard:
 *   const rules = {
 *     "household_vehicles.*.lien_holder": {
 *       visible: { when: "household_vehicles.*.has_lien", equals: "yes" }
 *     }
 *   };
 *
 *   // Class-based wildcard (classes must include index: lien_holder_0, lien_holder_1, etc.):
 *   const rules = {
 *     ".lien_holder_*": {
 *       visible: { when: "household_vehicles.*.has_lien", equals: "yes" }
 *     }
 *   };
 *
 *   // The * in both target and condition will be replaced with the SAME index
 *   // Vehicle 0's lien_holder depends on Vehicle 0's has_lien (not Vehicle 1's)
 *
 * setValue Examples:
 *   // Set hard-coded value when condition is met
 *   setValue: { when: "country", equals: "USA", value: "USD" }
 *
 *   // Copy value from another field
 *   setValue: { when: "same_address", equals: "true", copyFrom: "billing_address" }
 *
 *   // Copy value only when source field changes (allows manual override)
 *   setValue: { when: "same_address", equals: "true", copyFrom: "billing_address", copyOnChange: true }
 *
 *   // Copy with wildcard (same index scoping)
 *   setValue: { when: "household_vehicles.*.ownership", equals: "financed", copyFrom: "household_vehicles.*.lien_holder" }
 *
 *   // Multiple conditions with logical operators (AND)
 *   setValue: {
 *     when: {
 *       and: [
 *         { field: "address.state", equals: "NC" },
 *         { field: "liability_limits.bi", isEmpty: false }
 *       ]
 *     },
 *     copyFrom: "liability_limits.bi",
 *     copyOnChange: true
 *   }
 *
 *   // Multiple conditions with OR
 *   setValue: {
 *     when: {
 *       or: [
 *         { field: "address.state", equals: "NC" },
 *         { field: "address.state", equals: "SC" }
 *       ]
 *     },
 *     value: "Regional pricing"
 *   }
 *
 *   // Negation with NOT
 *   setValue: {
 *     when: {
 *       not: { field: "is_hidden", equals: "yes" }
 *     },
 *     value: "Visible"
 *   }
 *
 *   // Nested logical operators
 *   setValue: {
 *     when: {
 *       and: [
 *         {
 *           or: [
 *             { field: "address.state", equals: "NC" },
 *             { field: "address.state", equals: "SC" }
 *           ]
 *         },
 *         { field: "liability_limits.bi", isEmpty: false }
 *       ]
 *     },
 *     copyFrom: "liability_limits.bi",
 *     copyOnChange: true
 *   }
 *
 *   // Multiple conditions (evaluated in order, first match wins)
 *   setValue: [
 *     { when: "payment_type", equals: "credit", value: "Credit Card" },
 *     { when: "payment_type", equals: "debit", value: "Debit Card" },
 *     { when: "payment_type", equals: "cash", value: "Cash" }
 *   ]
 *
 * setText Examples (update display elements):
 *   // Update element text with template string
 *   setText: {
 *     fields: {
 *       year: "household_vehicles.*.year",
 *       make: "household_vehicles.*.make"
 *     },
 *     template: "{year} {make}",
 *     default: "No vehicle info"
 *   }
 *
 *   // With formatting (currency, date, uppercase, etc.)
 *   setText: {
 *     fields: { price: "household_vehicles.*.msrp" },
 *     template: "{price}",
 *     formats: { price: "currency" }
 *   }
 *
 * setAttribute Examples (set attributes on target elements):
 *   // Set attribute when condition is met
 *   setAttribute: {
 *     when: "chart_type",
 *     on: "load change",
 *     target: "#dataChart",
 *     attribute: "type",
 *     value: "this.value"
 *   }
 *
 *   // Set attribute with JavaScript expression
 *   setAttribute: {
 *     when: "labels",
 *     on: "load change",
 *     target: "#dataChart",
 *     attribute: "labels",
 *     value: "JSON.stringify(Array.from(this.selectedOptions).map(o => o.value).filter(v => v))"
 *   }
 *
 *   // Multiple setAttribute rules
 *   setAttribute: [
 *     { when: "name", on: "load change", target: "#dataChart", attribute: "title", value: "this.value" },
 *     { when: "name", on: "load change", target: "#dataChart", attribute: "label", value: "this.value" }
 *   ]
 *
 *   // Copy from another field
 *   setAttribute: {
 *     when: "source_field",
 *     target: ".target-element",
 *     attribute: "data-value",
 *     copyFrom: "other_field"
 *   }
 *
 * syncWith Examples (bi-directional sync):
 *   // Sync top-level field with first member in array
 *   syncWith: "household_members.0.first_name"
 *
 *   // When user changes "first_name" -> copies to "household_members.0.first_name"
 *   // When user changes "household_members.0.first_name" -> copies to "first_name"
 *   // Prevents infinite loops automatically
 *
 * calculate Examples (computed values with date support):
 *   // Calculate license date and age from birth date
 *   // IMPORTANT: Calculate rules ONLY trigger when the source field changes
 *   // This allows users to override calculated values without them being recalculated
 *   calculate: {
 *     targets: [
 *       {
 *         field: "household_members.*.driver.license_date",
 *         expression: "addYears({value}, 16)"
 *       },
 *       {
 *         field: "household_members.*.driver.license_age",
 *         expression: "16"
 *       }
 *     ]
 *   }
 *
 *   // Supported date functions:
 *   // - addYears({value}, n)    - Add n years to date
 *   // - addMonths({value}, n)   - Add n months to date
 *   // - addDays({value}, n)     - Add n days to date
 *   // - subtractYears({value}, n)
 *   // - subtractMonths({value}, n)
 *   // - subtractDays({value}, n)
 *   // - yearsDiff({value1}, {value2}) - Calculate years between dates
 *   //
 *   // Note: Calculations only run when the source field itself changes,
 *   // allowing users to manually override calculated values
 *
 * updateOptions Examples (dynamic dropdown options):
 *   // Build dropdown options from an array of data
 *   // Automatically updates when source array fields change
 *   updateOptions: {
 *     sourceArray: "household_members",
 *     valueTemplate: "{index+1}",              // 1-based index as value
 *     textTemplate: "{index+1} - {first_name} {last_name}",
 *     defaultOption: { value: "", text: "Choose..." }
 *   }
 *
 *   // Use with wildcards to update all vehicle assigned_driver dropdowns
 *   const rules = {
 *     "household_vehicles.*.assigned_driver": {
 *       updateOptions: {
 *         sourceArray: "household_members",
 *         valueTemplate: "{index+1}",
 *         textTemplate: "{index+1} - {first_name} {last_name}",
 *         defaultOption: { value: "", text: "Choose..." }
 *       }
 *     }
 *   };
 *
 *   // Template variables:
 *   // - {index}     : 0-based array index (0, 1, 2, ...)
 *   // - {index+1}   : 1-based array index (1, 2, 3, ...)
 *   // - {fieldName} : Value from sourceArray.index.fieldName
 */

class FieldRulesEngine {
  constructor(rules) {
    this.rules = rules || {};
    this.debounceTimer = null;
    this.initialized = false;
    this.isInitialLoad = true; // Track if this is the first applyRules call
    this.syncInProgress = new Set(); // Track fields currently being synced to prevent infinite loops
    this.lastChangedField = null; // Track the field that last triggered a change
    this.calculateInProgress = new Set(); // Track fields currently being calculated to prevent infinite loops
    this.calculateDepth = new Map(); // Track recursion depth per field
    this.MAX_CALCULATE_DEPTH = 10; // Maximum cascade depth for calculate rules
    this.previousValues = new Map(); // Track previous values for copyOnChange

    // Store event listener references for cleanup
    this.eventListeners = [];
  }

  /**
   * Check if a field selector contains a wildcard (*)
   *
   * @param {string} selector - The field selector to check
   * @returns {boolean} - True if selector contains wildcard
   */
  hasWildcard(selector) {
    return selector.includes('*');
  }

  /**
   * Convert a wildcard pattern to a regex pattern
   * Example: "household_vehicles.*.has_lien" -> /^household_vehicles\.(\d+)\.has_lien$/
   *
   * @param {string} pattern - The wildcard pattern
   * @returns {RegExp} - Regular expression to match field names
   */
  wildcardToRegex(pattern) {
    // Escape special regex characters except *
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    // Replace * with capture group for digits
    const regexPattern = escaped.replace(/\*/g, '(\\d+)');
    return new RegExp(`^${regexPattern}$`);
  }

  /**
   * Find all field names in the DOM that match a wildcard pattern
   *
   * @param {string} pattern - The wildcard pattern (e.g., "household_vehicles.*.has_lien")
   * @returns {Array} - Array of {fieldName, index} objects
   */
  findMatchingFields(pattern) {
    const regex = this.wildcardToRegex(pattern);
    const matches = [];

    // Get all elements with name attributes
    const allFields = document.querySelectorAll('[name]');

    allFields.forEach(field => {
      const fieldName = field.getAttribute('name');
      const match = fieldName.match(regex);

      if (match) {
        // Extract the index from the capture group
        const index = match[1]; // First capture group is the index
        matches.push({ fieldName, index });
      }
    });

    return matches;
  }

  /**
   * Replace wildcards in a string with a specific index
   * Example: replaceWildcard("household_vehicles.*.has_lien", "2") -> "household_vehicles.2.has_lien"
   *
   * @param {string} pattern - The pattern with wildcards
   * @param {string} index - The index to replace wildcards with
   * @returns {string} - The pattern with wildcards replaced
   */
  replaceWildcard(pattern, index) {
    return pattern.replace(/\*/g, index);
  }

  /**
   * Find all elements matching a class selector pattern with wildcard
   * Example: ".lien_holder_*" matches ".lien_holder_0", ".lien_holder_1", etc.
   *
   * @param {string} classPattern - The class pattern with wildcard (e.g., ".lien_holder_*")
   * @returns {Array} - Array of {className, index} objects
   */
  findMatchingClassNames(classPattern) {
    const matches = [];

    // Remove leading dot and convert to regex
    const patternWithoutDot = classPattern.substring(1); // Remove leading .
    const regex = this.wildcardToRegex(patternWithoutDot);

    // Get all elements in the document
    const allElements = document.querySelectorAll('*');

    // Check each element's classes
    allElements.forEach(element => {
      element.classList.forEach(className => {
        const match = className.match(regex);
        if (match) {
          const index = match[1]; // First capture group is the index
          // Add with leading dot for querySelector compatibility
          matches.push({ className: '.' + className, index });
        }
      });
    });

    // Remove duplicates based on className
    const unique = [];
    const seen = new Set();
    matches.forEach(item => {
      if (!seen.has(item.className)) {
        seen.add(item.className);
        unique.push(item);
      }
    });

    return unique;
  }

  /**
   * Format a value based on format type
   *
   * @param {string} value - The value to format
   * @param {string} format - The format type (currency, date, uppercase, lowercase, etc.)
   * @returns {string} - The formatted value
   */
  formatValue(value, format) {
    if (!value) return value;

    switch(format) {
      case 'currency':
        const num = parseFloat(value);
        return isNaN(num) ? value : '$' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

      case 'uppercase':
        return value.toString().toUpperCase();

      case 'lowercase':
        return value.toString().toLowerCase();

      case 'capitalize':
        return value.toString().charAt(0).toUpperCase() + value.toString().slice(1).toLowerCase();

      case 'date':
        try {
          const date = new Date(value);
          return isNaN(date) ? value : date.toLocaleDateString();
        } catch (e) {
          return value;
        }

      case 'datetime':
        try {
          const date = new Date(value);
          return isNaN(date) ? value : date.toLocaleString();
        } catch (e) {
          return value;
        }

      default:
        return value;
    }
  }

  /**
   * Parse a template string and replace {fieldName} placeholders with actual values
   *
   * @param {string} template - Template string with {fieldName} placeholders
   * @param {Object} fieldValues - Object mapping field names to their values
   * @param {Object} formats - Optional object mapping field names to format types
   * @returns {string} - Parsed template with values substituted
   */
  parseTemplate(template, fieldValues, formats = {}) {
    let result = template;

    Object.keys(fieldValues).forEach(fieldName => {
      let value = fieldValues[fieldName] || '';

      // Apply format if specified
      if (formats[fieldName]) {
        value = this.formatValue(value, formats[fieldName]);
      }

      // Replace all occurrences of {fieldName}
      const placeholder = new RegExp(`\\{${fieldName}\\}`, 'g');
      result = result.replace(placeholder, value);
    });

    return result;
  }

  /**
   * Parse a template string for option values/text
   * Supports {fieldName} placeholders and {index} / {index+1} for array indices
   *
   * @param {string} template - Template string with {fieldName} or {index} placeholders
   * @param {string} sourceArray - The source array name (e.g., "household_members")
   * @param {number} index - The array index
   * @returns {string} - Parsed template with values substituted
   */
  parseOptionTemplate(template, sourceArray, index) {
    if (!template) return '';

    let result = template;

    // Replace {index+1} with 1-based index
    result = result.replace(/\{index\+1\}/g, index + 1);
    // Replace {index} with 0-based index
    result = result.replace(/\{index\}/g, index);

    // Replace {fieldName} with actual field values
    const fieldPattern = /\{(\w+)\}/g;
    let match;
    const matches = [];

    // Collect all matches first to avoid infinite loop
    while ((match = fieldPattern.exec(template)) !== null) {
      matches.push(match);
    }

    // Replace each match with field value
    matches.forEach(match => {
      const fieldName = match[1];
      const fullFieldName = `${sourceArray}.${index}.${fieldName}`;
      const value = this.getFieldValue(fullFieldName) || '';
      result = result.replace(match[0], value);
    });

    return result;
  }

  /**
   * Rebuild select/dropdown options dynamically based on source array
   *
   * @param {string} fieldName - The name of the select field
   * @param {Object} optionsRule - The updateOptions rule configuration
   * @param {string} scopedIndex - Optional scoped index for wildcard fields
   */
  rebuildSelectOptions(fieldName, optionsRule, scopedIndex = null) {
    // Find the select element
    const selectElement = document.querySelector(`[name="${fieldName}"]`);

    if (!selectElement) {
      console.warn(`updateOptions: Select field "${fieldName}" not found`);
      return;
    }

    if (selectElement.tagName !== 'SELECT') {
      console.warn(`updateOptions: Field "${fieldName}" is not a <select> element`);
      return;
    }

    // Save current selection to preserve it if still valid
    const currentValue = selectElement.value;

    // Build options array
    const options = [];

    // Add default option if specified
    if (optionsRule.defaultOption) {
      options.push({
        value: optionsRule.defaultOption.value || '',
        text: optionsRule.defaultOption.text || 'Choose...'
      });
    }

    // Build options from source array
    if (optionsRule.sourceArray) {
      let arrayIndex = 0;
      const maxIterations = 1000; // Safety limit to prevent infinite loops

      while (arrayIndex < maxIterations) {
        // Check if this array index exists by looking for at least one field
        // We'll check for the first field name used in the templates
        const templateFields = this.extractFieldNamesFromTemplate(
          optionsRule.valueTemplate + ' ' + optionsRule.textTemplate
        );

        let indexExists = false;
        if (templateFields.length > 0) {
          const checkFieldName = `${optionsRule.sourceArray}.${arrayIndex}.${templateFields[0]}`;
          const checkField = document.querySelector(`[name="${checkFieldName}"]`);
          indexExists = checkField !== null;
        } else {
          // Fallback: check for any field matching the pattern
          const anyField = document.querySelector(`[name^="${optionsRule.sourceArray}.${arrayIndex}."]`);
          indexExists = anyField !== null;
        }

        if (!indexExists) break;

        // Parse templates to get value and text
        const value = this.parseOptionTemplate(optionsRule.valueTemplate, optionsRule.sourceArray, arrayIndex);
        const text = this.parseOptionTemplate(optionsRule.textTemplate, optionsRule.sourceArray, arrayIndex);

        options.push({ value, text });
        arrayIndex++;
      }
    }

    // Rebuild select options
    selectElement.innerHTML = '';
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.text;

      // Restore selection if the value still exists
      if (opt.value == currentValue) {
        option.selected = true;
      }

      selectElement.appendChild(option);
    });
  }

  /**
   * Extract field names from a template string
   * Example: "{first_name} {last_name}" -> ["first_name", "last_name"]
   *
   * @param {string} template - Template string with {fieldName} placeholders
   * @returns {Array} - Array of field names
   */
  extractFieldNamesFromTemplate(template) {
    const fieldNames = [];
    const fieldPattern = /\{(\w+)\}/g;
    let match;

    while ((match = fieldPattern.exec(template)) !== null) {
      const fieldName = match[1];
      // Exclude special keywords like "index"
      if (fieldName !== 'index') {
        fieldNames.push(fieldName);
      }
    }

    return fieldNames;
  }

  /**
   * Get the value of a field, handling different input types
   *
   * @param {string} fieldName - The name of the field
   * @returns {string} - The field's value
   */
  getFieldValue(fieldName) {
    const targetField = document.querySelector(`[name="${fieldName}"]`);
    if (!targetField) {
      return '';
    }

    if (targetField.type === 'checkbox') {
      return targetField.checked ? (targetField.value || 'true') : '';
    } else if (targetField.type === 'radio') {
      const checked = document.querySelector(`[name="${fieldName}"]:checked`);
      return checked ? checked.value : '';
    } else {
      return targetField.value;
    }
  }

  /**
   * Set the value of a field, handling different input types
   *
   * @param {string} fieldName - The name of the field
   * @param {string} value - The value to set
   * @param {boolean} triggerChange - Whether to trigger a change event (default: true)
   */
  setFieldValue(fieldName, value, triggerChange = true) {
    const targetField = document.querySelector(`[name="${fieldName}"]`);
    if (!targetField) {
      console.warn(`Field "${fieldName}" not found for setValue`);
      return;
    }

    if (targetField.type === 'checkbox') {
      // For checkboxes, treat truthy string values as checked
      targetField.checked = (value === 'true' || value === targetField.value || value === true);
    } else if (targetField.type === 'radio') {
      // For radio buttons, check the one matching the value
      const radioToCheck = document.querySelector(`[name="${fieldName}"][value="${value}"]`);
      if (radioToCheck) {
        radioToCheck.checked = true;
      }
    } else {
      // For text inputs, selects, textareas, etc.
      targetField.value = value;
    }

    // Trigger change event so other rules can react
    if (triggerChange) {
      targetField.dispatchEvent(new Event('change', { bubbles: true }));
      targetField.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  /**
   * Evaluate a condition against current form state
   *
   * Supported condition operators:
   * - equals: value === condition.equals
   * - notEquals: value !== condition.notEquals
   * - in: condition.in.includes(value)
   * - notIn: !condition.notIn.includes(value)
   * - matches: new RegExp(condition.matches).test(value)
   * - isEmpty: checks if field is empty/falsy
   * - greaterThan: value > condition.greaterThan (numeric)
   * - lessThan: value < condition.lessThan (numeric)
   * - greaterThanOrEqual: value >= condition.greaterThanOrEqual (numeric)
   * - lessThanOrEqual: value <= condition.lessThanOrEqual (numeric)
   *
   * Supported logical operators:
   * - and: all conditions must be true
   * - or: at least one condition must be true
   * - not: negates a condition or group
   *
   * @param {Object} condition - The condition object to evaluate
   * @param {string} scopedIndex - Optional index to replace wildcards with (for scoped evaluation)
   * @returns {boolean} - True if condition is met, false otherwise
   */
  evaluateCondition(condition, scopedIndex = null) {
    if (!condition) return true;

    // Handle logical operators (recursive evaluation)
    if (condition.and !== undefined) {
      // AND: all conditions must be true
      if (!Array.isArray(condition.and)) {
        console.warn('AND operator expects an array of conditions');
        return false;
      }
      return condition.and.every(subCondition => this.evaluateCondition(subCondition, scopedIndex));
    }

    if (condition.or !== undefined) {
      // OR: at least one condition must be true
      if (!Array.isArray(condition.or)) {
        console.warn('OR operator expects an array of conditions');
        return false;
      }
      return condition.or.some(subCondition => this.evaluateCondition(subCondition, scopedIndex));
    }

    if (condition.not !== undefined) {
      // NOT: negate the result of the condition
      return !this.evaluateCondition(condition.not, scopedIndex);
    }

    // Handle field-based conditions
    // Support both "when" (legacy) and "field" (new explicit syntax)
    let whenField = condition.when || condition.field;

    if (!whenField) {
      console.warn('Condition missing "when" or "field" property:', condition);
      return false;
    }

    // Replace wildcard with scoped index if provided
    if (scopedIndex !== null && this.hasWildcard(whenField)) {
      whenField = this.replaceWildcard(whenField, scopedIndex);
    }

    const targetField = document.querySelector(`[name="${whenField}"]`);
    if (!targetField) {
      console.warn(`Field "${whenField}" not found for rule evaluation`);
      return false;
    }

    const value = this.getFieldValue(whenField);

    // Support multiple condition types
    if (condition.equals !== undefined) {
      return value === condition.equals;
    }
    if (condition.notEquals !== undefined) {
      return value !== condition.notEquals;
    }
    if (condition.in !== undefined) {
      return condition.in.includes(value);
    }
    if (condition.notIn !== undefined) {
      return !condition.notIn.includes(value);
    }
    if (condition.matches !== undefined) {
      return new RegExp(condition.matches).test(value);
    }
    if (condition.isEmpty !== undefined) {
      const isEmpty = !value || value.trim() === '';
      return condition.isEmpty ? isEmpty : !isEmpty;
    }
    if (condition.greaterThan !== undefined) {
      const numValue = parseFloat(value);
      return !isNaN(numValue) && numValue > condition.greaterThan;
    }
    if (condition.lessThan !== undefined) {
      const numValue = parseFloat(value);
      return !isNaN(numValue) && numValue < condition.lessThan;
    }
    if (condition.greaterThanOrEqual !== undefined) {
      const numValue = parseFloat(value);
      return !isNaN(numValue) && numValue >= condition.greaterThanOrEqual;
    }
    if (condition.lessThanOrEqual !== undefined) {
      const numValue = parseFloat(value);
      return !isNaN(numValue) && numValue <= condition.lessThanOrEqual;
    }

    return false;
  }

  /**
   * Evaluate a calculate expression and return the computed value
   * Supports date functions and simple expressions
   *
   * @param {string} expression - The expression to evaluate (e.g., "addYears({value}, 16)")
   * @param {string} sourceValue - The source value to use in the expression
   * @param {string} scopedIndex - Optional scoped index for wildcard replacement
   * @returns {string} - The computed value
   */
  evaluateCalculateExpression(expression, sourceValue, scopedIndex = null) {
    if (!expression) return '';

    // If expression is just a literal number or string (no functions), return it
    if (!expression.includes('(')) {
      return expression;
    }

    // Helper function to check if a date string is valid and complete (YYYY-MM-DD format)
    const isValidDate = (dateStr) => {
      if (!dateStr || typeof dateStr !== 'string') return false;
      // Check for YYYY-MM-DD format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

      // Extract year and validate it's reasonable (between 1900 and 2100)
      const year = parseInt(dateStr.substring(0, 4), 10);
      if (year < 1900 || year > 2100) return false;

      const date = new Date(dateStr);
      return date instanceof Date && !isNaN(date.getTime());
    };

    // If the source value looks like it should be a date but isn't valid, skip calculation
    if (sourceValue && sourceValue.includes('-') && !isValidDate(sourceValue)) {
      return '';
    }

    // Replace {value} with the actual source value
    let processedExpression = expression.replace(/\{value\}/g, `"${sourceValue}"`);

    // Replace other field references like {field_name} or {array.*.field}
    const fieldPattern = /\{([a-zA-Z0-9_.*]+)\}/g;
    let match;
    const matches = [];

    while ((match = fieldPattern.exec(expression)) !== null) {
      matches.push(match);
    }

    matches.forEach(match => {
      let fieldName = match[1];
      if (fieldName !== 'value') {
        // Replace wildcard with scoped index if provided
        if (scopedIndex !== null && this.hasWildcard(fieldName)) {
          fieldName = this.replaceWildcard(fieldName, scopedIndex);
        }
        const fieldValue = this.getFieldValue(fieldName);

        // If this field value looks like an incomplete date, skip the calculation
        if (fieldValue && fieldValue.includes('-') && !isValidDate(fieldValue)) {
          return '';
        }

        processedExpression = processedExpression.replace(match[0], `"${fieldValue}"`);
      }
    });

    // If we returned early due to incomplete date, processedExpression might be incomplete
    if (processedExpression === '') return '';

    // Replace today() with current date string
    processedExpression = processedExpression.replace(/today\(\)/g, () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `"${year}-${month}-${day}"`;
    });

    // Helper function to parse date from various formats
    const parseDate = (dateStr) => {
      if (!dateStr) return null;

      // Handle YYYY-MM-DD format explicitly to avoid timezone issues
      const ymdMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (ymdMatch) {
        const year = parseInt(ymdMatch[1], 10);
        const month = parseInt(ymdMatch[2], 10) - 1; // Month is 0-indexed
        const day = parseInt(ymdMatch[3], 10);
        return new Date(year, month, day);
      }

      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    };

    // Helper function to format date as YYYY-MM-DD (for date inputs)
    const formatDate = (date) => {
      if (!date || isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Define calculation functions
    const calculationFunctions = {
      addYears: (dateStr, years) => {
        const date = parseDate(dateStr);
        if (!date) return '';
        date.setFullYear(date.getFullYear() + years);
        return formatDate(date);
      },
      addMonths: (dateStr, months) => {
        const date = parseDate(dateStr);
        if (!date) return '';
        date.setMonth(date.getMonth() + months);
        return formatDate(date);
      },
      addDays: (dateStr, days) => {
        const date = parseDate(dateStr);
        if (!date) return '';
        date.setDate(date.getDate() + days);
        return formatDate(date);
      },
      subtractYears: (dateStr, years) => {
        const date = parseDate(dateStr);
        if (!date) return '';
        date.setFullYear(date.getFullYear() - years);
        return formatDate(date);
      },
      subtractMonths: (dateStr, months) => {
        const date = parseDate(dateStr);
        if (!date) return '';
        date.setMonth(date.getMonth() - months);
        return formatDate(date);
      },
      subtractDays: (dateStr, days) => {
        const date = parseDate(dateStr);
        if (!date) return '';
        date.setDate(date.getDate() - days);
        return formatDate(date);
      },
      yearsDiff: (dateStr1, dateStr2) => {
        const date1 = parseDate(dateStr1);
        const date2 = parseDate(dateStr2);
        if (!date1 || !date2) return '';
        const diffMs = date2.getTime() - date1.getTime();
        const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
        return Math.floor(diffYears).toString();
      },
      monthsDiff: (dateStr1, dateStr2) => {
        const date1 = parseDate(dateStr1);
        const date2 = parseDate(dateStr2);
        if (!date1 || !date2) return '';
        const diffMs = date2.getTime() - date1.getTime();
        const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
        return Math.floor(diffMonths).toString();
      },
      daysDiff: (dateStr1, dateStr2) => {
        const date1 = parseDate(dateStr1);
        const date2 = parseDate(dateStr2);
        if (!date1 || !date2) return '';
        const diffMs = date2.getTime() - date1.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return Math.floor(diffDays).toString();
      },
      subtract: (a, b) => {
        const numA = parseFloat(a) || 0;
        const numB = parseFloat(b) || 0;
        const result = numA - numB;
        return Math.max(0, result).toString(); // Ensure non-negative
      },
      add: (a, b) => {
        const numA = parseFloat(a) || 0;
        const numB = parseFloat(b) || 0;
        return (numA + numB).toString();
      },
      multiply: (a, b) => {
        const numA = parseFloat(a) || 0;
        const numB = parseFloat(b) || 0;
        return (numA * numB).toString();
      },
      divide: (a, b) => {
        const numA = parseFloat(a) || 0;
        const numB = parseFloat(b) || 1; // Avoid division by zero
        return (numA / numB).toString();
      }
    };

    // Try to evaluate the expression
    try {
      // Create a safe evaluation context with only our calculation functions
      const func = new Function(...Object.keys(calculationFunctions), `return ${processedExpression};`);
      const result = func(...Object.values(calculationFunctions));
      return result !== undefined && result !== null ? result.toString() : '';
    } catch (error) {
      console.error(`Error evaluating calculate expression "${expression}":`, error);
      return '';
    }
  }

  /**
   * Apply rules to a specific field
   * @param {string} fieldSelector - The field selector (name or class)
   * @param {Object} rules - The rules to apply
   * @param {string} scopedIndex - Optional index for wildcard replacement
   */
  applyRulesToField(fieldSelector, rules, scopedIndex = null) {
    // Replace wildcards with scoped index if provided
    let actualSelector = fieldSelector;
    if (scopedIndex !== null && this.hasWildcard(fieldSelector)) {
      actualSelector = this.replaceWildcard(fieldSelector, scopedIndex);
    }

    // Determine if selector is a class (starts with .), ID (starts with #), or a name attribute
    let field;
    let input;

    if (actualSelector.startsWith('.') || actualSelector.startsWith('#')) {
      // Class or ID selector - target the element directly
      field = document.querySelector(actualSelector);
      if (field) {
        // Find input inside the wrapper (if it's a wrapper element)
        input = field.querySelector('input, select, textarea');
      }
    } else {
      // Name attribute selector (default behavior)
      // Find the field - support both web components and standard form elements
      field = document.querySelector(`[name="${actualSelector}"]`)?.closest('wc-input, wc-select, wc-textarea, .form-group, .form-field')
                 || document.querySelector(`[name="${actualSelector}"]`)?.parentElement;

      if (field) {
        input = field.querySelector('input, select, textarea') || field.querySelector(`[name="${actualSelector}"]`);
      }
    }

    if (!field) {
      // Only warn if not a wildcard and not a setText target with # or . (might render later)
      const isTextSetTarget = rules.setText && (fieldSelector.startsWith('#') || fieldSelector.startsWith('.'));
      if (!this.hasWildcard(fieldSelector) && !isTextSetTarget) {
        console.warn(`Field "${actualSelector}" not found in DOM`);
      }
      return;
    }

    // Handle visibility rules
    if (rules.visible) {
      const shouldShow = this.evaluateCondition(rules.visible, scopedIndex);
      field.classList.toggle('hidden', !shouldShow);

      // Clear value if hidden (optional behavior)
      if (!shouldShow && rules.clearWhenHidden) {
        if (input) {
          if (input.type === 'checkbox' || input.type === 'radio') {
            input.checked = false;
          } else {
            input.value = '';
          }
          // Trigger change event so other rules can react
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }

    // Handle required rules
    if (rules.required) {
      const shouldRequire = this.evaluateCondition(rules.required, scopedIndex);
      if (input) {
        input.toggleAttribute('required', shouldRequire);
        field.toggleAttribute('required', shouldRequire);
      }
    }

    // Handle disabled rules
    if (rules.disabled) {
      const shouldDisable = this.evaluateCondition(rules.disabled, scopedIndex);
      if (input) {
        input.toggleAttribute('disabled', shouldDisable);
      }
    }

    // Handle readonly rules
    if (rules.readonly) {
      const shouldReadonly = this.evaluateCondition(rules.readonly, scopedIndex);
      if (input) {
        input.toggleAttribute('readonly', shouldReadonly);
      }
    }

    // Handle custom validation rules
    if (rules.validate) {
      if (input) {
        const isValid = this.evaluateCondition(rules.validate, scopedIndex);
        const message = rules.validate.message || 'Invalid value';
        input.setCustomValidity(isValid ? '' : message);

        // Add visual feedback
        if (isValid) {
          field.classList.remove('validation-error');
        } else {
          field.classList.add('validation-error');
        }
      }
    }

    // Handle CSS class toggling
    if (rules.addClass) {
      const shouldAdd = this.evaluateCondition(rules.addClass, scopedIndex);
      const className = rules.addClass.class || '';
      if (className) {
        field.classList.toggle(className, shouldAdd);
      }
    }

    if (rules.removeClass) {
      const shouldRemove = this.evaluateCondition(rules.removeClass, scopedIndex);
      const className = rules.removeClass.class || '';
      if (className) {
        field.classList.toggle(className, !shouldRemove);
      }
    }

    // Handle setValue rules - supports both single rule and array of rules
    if (rules.setValue) {
      const setValueRules = Array.isArray(rules.setValue) ? rules.setValue : [rules.setValue];

      for (const setValueRule of setValueRules) {
        // Check if setOnLoad is specified and we're not in initial load phase
        if (setValueRule.setOnLoad === true && !this.isInitialLoad) {
          // Skip this rule - it should only run on initial load
          continue;
        }

        // Check if there's a condition to evaluate
        let shouldSet = true; // Default to true if no condition

        if (setValueRule.when !== undefined) {
          // Check if 'when' is a logical operator object (and, or, not) or a field name string
          let conditionToEvaluate;
          if (typeof setValueRule.when === 'object' && setValueRule.when !== null) {
            // New syntax: when is a logical operator object like { and: [...] }
            conditionToEvaluate = setValueRule.when;
          } else {
            // Legacy syntax: when is a field name string, pass the whole rule
            conditionToEvaluate = setValueRule;
          }

          shouldSet = this.evaluateCondition(conditionToEvaluate, scopedIndex);
        }

        if (shouldSet) {
          let valueToSet;
          let shouldCopy = true;

          // Determine the value to set
          if (setValueRule.copyFrom !== undefined) {
            // Replace wildcard in copyFrom if scoped index provided
            let copyFromField = setValueRule.copyFrom;
            if (scopedIndex !== null && this.hasWildcard(copyFromField)) {
              copyFromField = this.replaceWildcard(copyFromField, scopedIndex);
            }
            // Copy value from another field
            valueToSet = this.getFieldValue(copyFromField);

            // Check if copyOnChange is enabled
            if (setValueRule.copyOnChange === true) {
              const copyKey = `${copyFromField}->${actualSelector}`;
              const previousValue = this.previousValues.get(copyKey);

              // Only copy if source value has actually changed
              if (previousValue !== undefined && previousValue === valueToSet) {
                shouldCopy = false;
              }

              // Update the stored previous value
              this.previousValues.set(copyKey, valueToSet);
            }
          } else if (setValueRule.value !== undefined) {
            // Use hard-coded value or evaluate expression
            const value = setValueRule.value;

            // Check if the value is an expression (contains function calls like today())
            if (typeof value === 'string' && value.includes('(')) {
              // Evaluate the expression using the calculate expression evaluator
              valueToSet = this.evaluateCalculateExpression(value, '', scopedIndex);
            } else {
              // Use literal value
              valueToSet = value;
            }
          } else {
            console.warn(`setValue rule for "${actualSelector}" missing both 'value' and 'copyFrom'`);
            continue;
          }

          // Get the actual input element to set
          if (input && shouldCopy) {
            const currentValue = this.getFieldValue(actualSelector);

            // Only set if value is different to avoid infinite loops
            if (currentValue !== valueToSet) {
              this.setFieldValue(actualSelector, valueToSet, false);
            }
          }

          // Break after first matching rule (like if-else)
          break;
        }
      }
    }

    // Handle setText rules - updates text content of display elements
    if (rules.setText) {
      const setTextRule = rules.setText;

      // Get the target element (field is the display element, not an input)
      if (field) {
        // Gather values from all watched fields
        const fieldValues = {};
        let anyFieldExists = false;

        if (setTextRule.fields) {
          Object.keys(setTextRule.fields).forEach(fieldKey => {
            let fieldPattern = setTextRule.fields[fieldKey];

            // Replace wildcard with scoped index if provided
            if (scopedIndex !== null && this.hasWildcard(fieldPattern)) {
              fieldPattern = this.replaceWildcard(fieldPattern, scopedIndex);
            }

            // Check if the field actually exists in the DOM
            const fieldElement = document.querySelector(`[name="${fieldPattern}"]`);
            if (fieldElement) {
              anyFieldExists = true;
            }

            fieldValues[fieldKey] = this.getFieldValue(fieldPattern);
          });

          // Only apply setText rule if at least one referenced field exists in the DOM
          // This prevents default text from being applied when fields don't exist
          if (anyFieldExists) {
            // Parse template with field values
            let textContent = this.parseTemplate(
              setTextRule.template || '',
              fieldValues,
              setTextRule.formats || {}
            );

            // Use default if result is empty and default is provided
            if (!textContent.trim() && setTextRule.default) {
              textContent = setTextRule.default;
            }

            // Update the element's text content
            const currentText = field.textContent;
            if (currentText !== textContent) {
              field.textContent = textContent;
            }
          }
        }
      }
    }

    // Handle syncWith rules - bi-directional synchronization
    // Note: syncWith is handled separately during initialization to set up event listeners
    // This section is intentionally empty - sync logic is in setupSyncListeners()

    // Handle setAttribute rules - set attributes on target elements
    if (rules.setAttribute) {
      const setAttributeRules = Array.isArray(rules.setAttribute) ? rules.setAttribute : [rules.setAttribute];

      for (const setAttrRule of setAttributeRules) {
        // Evaluate condition
        let conditionToEvaluate;
        if (typeof setAttrRule.when === 'object' && setAttrRule.when !== null) {
          // New syntax: when is a logical operator object like { and: [...] }
          conditionToEvaluate = setAttrRule.when;
        } else if (typeof setAttrRule.when === 'string') {
          // Legacy syntax: when is a field name string
          conditionToEvaluate = setAttrRule;
        } else {
          // No condition - always apply (for load-only rules)
          conditionToEvaluate = null;
        }

        const shouldSet = conditionToEvaluate === null || this.evaluateCondition(conditionToEvaluate, scopedIndex);
        console.log(`[setAttribute] Field: ${fieldSelector}, When: ${setAttrRule.when}, ShouldSet: ${shouldSet}`);

        if (shouldSet) {
          // Get the target element
          let targetElement;
          if (setAttrRule.target) {
            // Replace wildcard in target if scoped index provided
            let targetSelector = setAttrRule.target;
            if (scopedIndex !== null && this.hasWildcard(targetSelector)) {
              targetSelector = this.replaceWildcard(targetSelector, scopedIndex);
            }
            targetElement = document.querySelector(targetSelector);
            console.log(`[setAttribute] Target selector: ${targetSelector}, Found: ${!!targetElement}`);
          } else {
            // If no target specified, use the field itself
            targetElement = field;
          }

          if (targetElement && setAttrRule.attribute) {
            let valueToSet;

            // Determine the value to set
            if (setAttrRule.value !== undefined) {
              // Check if value is a JavaScript expression
              if (typeof setAttrRule.value === 'string' && (setAttrRule.value.includes('this.') || setAttrRule.value.includes('JSON.') || setAttrRule.value.includes('Array.'))) {
                // Execute JavaScript expression in context of the source field
                // For web components, prefer the actual input element over the wrapper
                const sourceField = input || field;
                console.log(`[setAttribute] Evaluating expression for field ${fieldSelector}:`, setAttrRule.value);
                console.log(`[setAttribute] Source field:`, sourceField);
                try {
                  // Create a function that has access to 'this' as the element
                  const evalFunc = new Function('return ' + setAttrRule.value);
                  valueToSet = evalFunc.call(sourceField);
                  console.log(`[setAttribute] Evaluated value:`, valueToSet);
                } catch (e) {
                  console.error(`Error evaluating setAttribute value expression: ${setAttrRule.value}`, e);
                  console.error(`Source field:`, sourceField);
                  valueToSet = setAttrRule.value;
                }
              } else {
                valueToSet = setAttrRule.value;
                console.log(`[setAttribute] Using literal value:`, valueToSet);
              }
            } else if (setAttrRule.copyFrom !== undefined) {
              // Copy value from another field
              let copyFromField = setAttrRule.copyFrom;
              if (scopedIndex !== null && this.hasWildcard(copyFromField)) {
                copyFromField = this.replaceWildcard(copyFromField, scopedIndex);
              }
              valueToSet = this.getFieldValue(copyFromField);
            } else {
              console.warn(`setAttribute rule for "${actualSelector}" missing both 'value' and 'copyFrom'`);
              continue;
            }

            // Set the attribute
            const currentAttrValue = targetElement.getAttribute(setAttrRule.attribute);
            console.log(`[setAttribute] Setting ${setAttrRule.attribute} on ${setAttrRule.target}: "${currentAttrValue}" -> "${valueToSet}"`);
            if (currentAttrValue !== valueToSet) {
              targetElement.setAttribute(setAttrRule.attribute, valueToSet);

              // For 'value' attribute, also set the property to ensure web components update
              if (setAttrRule.attribute === 'value') {
                // Check if it's a web component by looking for the input inside
                const innerInput = targetElement.querySelector('input, select, textarea');
                if (innerInput) {
                  // It's a web component wrapper - set value on inner input
                  innerInput.value = valueToSet;
                  // Trigger events so the web component updates its display
                  innerInput.dispatchEvent(new Event('input', { bubbles: true }));
                  innerInput.dispatchEvent(new Event('change', { bubbles: true }));
                } else if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'SELECT' || targetElement.tagName === 'TEXTAREA') {
                  // It's a native input element - set property directly
                  targetElement.value = valueToSet;
                  targetElement.dispatchEvent(new Event('input', { bubbles: true }));
                  targetElement.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }

              console.log(`[setAttribute] ✓ Attribute ${setAttrRule.attribute} updated`);
            } else {
              console.log(`[setAttribute] ⊘ Attribute ${setAttrRule.attribute} unchanged (same value)`);
            }
          } else {
            if (!targetElement) {
              console.warn(`[setAttribute] Target element not found: ${setAttrRule.target}`);
            }
          }
        }
      }
    }

    // Handle updateOptions rules - dynamically rebuild select/dropdown options
    if (rules.updateOptions) {
      this.rebuildSelectOptions(actualSelector, rules.updateOptions, scopedIndex);
    }

    // Handle calculate rules - compute values based on expressions
    // ONLY trigger when the source field itself changes, not on every form change
    if (rules.calculate) {
      const calculateRule = rules.calculate;

      // Only proceed if this is the field that actually changed
      // Check if actualSelector matches the lastChangedField (or wildcard pattern matches)
      let shouldCalculate = false;

      if (this.lastChangedField) {
        if (this.hasWildcard(fieldSelector)) {
          // Check if lastChangedField matches the wildcard pattern
          const regex = this.wildcardToRegex(fieldSelector);
          shouldCalculate = regex.test(this.lastChangedField);
        } else {
          // Direct match
          shouldCalculate = this.lastChangedField === actualSelector;
        }
      }

      if (shouldCalculate) {
        // Get the source value from the current field
        const sourceValue = this.getFieldValue(actualSelector);

        if (calculateRule.targets && Array.isArray(calculateRule.targets)) {
          calculateRule.targets.forEach(target => {
            // Replace wildcard in target field with scoped index if provided
            let targetFieldName = target.field;
            if (scopedIndex !== null && this.hasWildcard(targetFieldName)) {
              targetFieldName = this.replaceWildcard(targetFieldName, scopedIndex);
            }

            // Check for infinite loop - create a unique key for this calculation
            const calcKey = `${actualSelector}->${targetFieldName}`;

            // Check if we're already calculating this relationship
            if (this.calculateInProgress.has(calcKey)) {
              console.warn(`Circular calculation detected: ${calcKey} - skipping to prevent infinite loop`);
              return;
            }

            // Check recursion depth
            const currentDepth = (this.calculateDepth.get(targetFieldName) || 0) + 1;
            if (currentDepth > this.MAX_CALCULATE_DEPTH) {
              console.warn(`Maximum calculation depth (${this.MAX_CALCULATE_DEPTH}) exceeded for field: ${targetFieldName} - skipping to prevent infinite loop`);
              return;
            }

            // Mark this calculation as in progress
            this.calculateInProgress.add(calcKey);
            this.calculateDepth.set(targetFieldName, currentDepth);

            try {
              // Evaluate the expression
              const computedValue = this.evaluateCalculateExpression(
                target.expression,
                sourceValue,
                scopedIndex
              );

              // Set the computed value to the target field
              if (computedValue !== '') {
                const currentValue = this.getFieldValue(targetFieldName);

                // Only update if value is different to avoid infinite loops
                if (currentValue !== computedValue) {
                  // Trigger change event to allow cascading calculations
                  this.setFieldValue(targetFieldName, computedValue, true);
                }
              }
            } finally {
              // Remove the calculation lock after a short delay
              setTimeout(() => {
                this.calculateInProgress.delete(calcKey);
                this.calculateDepth.delete(targetFieldName);
              }, 100);
            }
          });
        }
      }
    }
  }

  /**
   * Apply all rules to all fields
   * This is the main function that processes all rules and updates the DOM
   */
  applyRules() {
    // Don't apply rules if engine has been destroyed
    if (!this.initialized) {
      return;
    }

    Object.keys(this.rules).forEach(fieldSelector => {
      const rules = this.rules[fieldSelector];

      // Check if this is a wildcard pattern
      if (this.hasWildcard(fieldSelector)) {
        // Determine if it's a class selector or name selector
        if (fieldSelector.startsWith('.')) {
          // Class-based wildcard (e.g., ".lien_holder_*")
          const matchingClasses = this.findMatchingClassNames(fieldSelector);

          if (matchingClasses.length === 0) {
            // No matches found - this is OK for wildcards
            return;
          }

          // Apply rules to each matching class with its scoped index
          matchingClasses.forEach(({ className, index }) => {
            // Use the actual className (with index) as the selector
            this.applyRulesToField(className, rules, index);
          });
        } else {
          // Name-based wildcard (e.g., "household_vehicles.*.has_lien")
          const matchingFields = this.findMatchingFields(fieldSelector);

          if (matchingFields.length === 0) {
            // No matches found - this is OK for wildcards
            return;
          }

          // Apply rules to each matching field with its scoped index
          matchingFields.forEach(({ index }) => {
            this.applyRulesToField(fieldSelector, rules, index);
          });
        }
      } else {
        // Non-wildcard field - apply rules directly
        this.applyRulesToField(fieldSelector, rules, null);
      }
    });

    // Mark initial load as complete after first run
    if (this.isInitialLoad) {
      this.isInitialLoad = false;
    }
  }

  /**
   * Set up bi-directional sync listeners for syncWith rules
   * This prevents infinite loops by tracking which field initiated the sync
   */
  setupSyncListeners() {
    Object.keys(this.rules).forEach(fieldSelector => {
      const rules = this.rules[fieldSelector];

      if (rules.syncWith) {
        const sourceField = fieldSelector;
        const targetField = rules.syncWith;

        // Find source and target input elements
        const sourceInput = document.querySelector(`[name="${sourceField}"]`);
        const targetInput = document.querySelector(`[name="${targetField}"]`);

        if (!sourceInput) {
          console.warn(`syncWith: Source field "${sourceField}" not found`);
          return;
        }

        if (!targetInput) {
          console.warn(`syncWith: Target field "${targetField}" not found`);
          return;
        }

        // Create sync handler for source -> target
        const syncSourceToTarget = () => {
          // Check if we're already syncing this pair to prevent infinite loop
          const syncKey = `${sourceField}->${targetField}`;
          if (this.syncInProgress.has(syncKey)) {
            return;
          }

          // Mark this sync as in progress
          this.syncInProgress.add(syncKey);

          try {
            const sourceValue = this.getFieldValue(sourceField);
            const targetValue = this.getFieldValue(targetField);

            // Only sync if values are different
            if (sourceValue !== targetValue) {
              this.setFieldValue(targetField, sourceValue, true);
            }
          } finally {
            // Remove the sync lock after a short delay
            setTimeout(() => {
              this.syncInProgress.delete(syncKey);
            }, 10);
          }
        };

        // Create sync handler for target -> source
        const syncTargetToSource = () => {
          // Check if we're already syncing this pair to prevent infinite loop
          const syncKey = `${targetField}->${sourceField}`;
          if (this.syncInProgress.has(syncKey)) {
            return;
          }

          // Mark this sync as in progress
          this.syncInProgress.add(syncKey);

          try {
            const sourceValue = this.getFieldValue(sourceField);
            const targetValue = this.getFieldValue(targetField);

            // Only sync if values are different
            if (sourceValue !== targetValue) {
              this.setFieldValue(sourceField, targetValue, true);
            }
          } finally {
            // Remove the sync lock after a short delay
            setTimeout(() => {
              this.syncInProgress.delete(syncKey);
            }, 10);
          }
        };

        // Attach event listeners for both directions
        sourceInput.addEventListener('input', syncSourceToTarget);
        sourceInput.addEventListener('change', syncSourceToTarget);

        targetInput.addEventListener('input', syncTargetToSource);
        targetInput.addEventListener('change', syncTargetToSource);

        // Store references for cleanup (if needed)
        if (!this.syncListeners) {
          this.syncListeners = [];
        }
        this.syncListeners.push({
          sourceField,
          targetField,
          sourceInput,
          targetInput,
          syncSourceToTarget,
          syncTargetToSource
        });
      }
    });
  }

  /**
   * Initialize the rules engine
   * Sets up event listeners and applies initial rules
   */
  init() {
    if (this.initialized) {
      console.warn('FieldRulesEngine already initialized');
      return;
    }

    // Set up bi-directional sync listeners first
    this.setupSyncListeners();

    // Apply rules immediately
    this.applyRules();
    this.initialized = true;

    // Re-apply on any form input change (debounced for performance)
    const changeHandler = (e) => {
      if (e.target.name) {
        this.lastChangedField = e.target.name;
      }
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.applyRules();
        this.lastChangedField = null; // Reset after applying
      }, 50);
    };
    document.addEventListener('change', changeHandler);
    this.eventListeners.push({ type: 'change', handler: changeHandler });

    const inputHandler = (e) => {
      if (e.target.name) {
        this.lastChangedField = e.target.name;
      }
      // Only debounce text inputs, apply immediately for checkboxes/radios
      if (e.target.type === 'checkbox' || e.target.type === 'radio') {
        this.applyRules();
        this.lastChangedField = null; // Reset after applying
      } else {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.applyRules();
          this.lastChangedField = null; // Reset after applying
        }, 100);
      }
    };
    document.addEventListener('input', inputHandler);
    this.eventListeners.push({ type: 'input', handler: inputHandler });

    // Re-apply after HTMX swaps (if HTMX is present)
    if (typeof htmx !== 'undefined') {
      const htmxHandler = () => {
        setTimeout(() => this.applyRules(), 50);
      };
      document.addEventListener('htmx:afterSwap', htmxHandler);
      this.eventListeners.push({ type: 'htmx:afterSwap', handler: htmxHandler });
    }

    //console.log('FieldRulesEngine initialized with', Object.keys(this.rules).length, 'field rules');
  }

  /**
   * Destroy the rules engine
   * Removes all event listeners and clears state
   */
  destroy() {
    // Remove all event listeners
    this.eventListeners.forEach(({ type, handler }) => {
      document.removeEventListener(type, handler);
    });
    this.eventListeners = [];

    // Clear timers
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Clear state
    this.syncInProgress.clear();
    this.calculateInProgress.clear();
    this.calculateDepth.clear();
    this.previousValues.clear();
    this.lastChangedField = null;
    this.initialized = false;
    this.isInitialLoad = true;

    //console.log('FieldRulesEngine destroyed');
  }

  /**
   * Add or update rules at runtime
   *
   * @param {Object} newRules - Rules object to merge with existing rules
   */
  updateRules(newRules) {
    this.rules = { ...this.rules, ...newRules };
    this.applyRules();
  }

  /**
   * Remove rules for a specific field
   *
   * @param {string} fieldName - Name of the field to remove rules for
   */
  removeRule(fieldName) {
    delete this.rules[fieldName];
    this.applyRules();
  }

  /**
   * Get current rules (useful for debugging/export)
   *
   * @returns {Object} - Copy of current rules
   */
  getRules() {
    return JSON.parse(JSON.stringify(this.rules));
  }

  /**
   * Reset the engine (remove all event listeners and rules)
   */
  destroy() {
    this.rules = {};
    this.initialized = false;
    clearTimeout(this.debounceTimer);
    // Note: Event listeners will persist but won't do anything since rules are empty
  }

  /**
   * Get all fields that depend on a given field
   * Useful for debugging dependency chains
   *
   * @param {string} fieldName - Name of the field to check dependencies for
   * @returns {Array} - Array of field names that depend on the given field
   */
  getDependents(fieldName) {
    const dependents = [];
    Object.keys(this.rules).forEach(targetField => {
      const rules = this.rules[targetField];
      Object.keys(rules).forEach(ruleType => {
        const rule = rules[ruleType];
        if (rule && rule.when === fieldName) {
          dependents.push({
            field: targetField,
            ruleType: ruleType,
            condition: rule
          });
        }
      });
    });
    return dependents;
  }

  /**
   * Validate all currently active rules
   * Useful for form submission validation
   *
   * @returns {Object} - { valid: boolean, errors: Array }
   */
  validateAll() {
    const errors = [];

    Object.keys(this.rules).forEach(fieldName => {
      const rules = this.rules[fieldName];
      const field = document.querySelector(`[name="${fieldName}"]`);

      if (!field) return;

      // Check required rules
      if (rules.required) {
        const shouldRequire = this.evaluateCondition(rules.required);
        if (shouldRequire) {
          const value = field.value || (field.checked ? field.value : '');
          if (!value || value.trim() === '') {
            errors.push({
              field: fieldName,
              rule: 'required',
              message: `${fieldName} is required`
            });
          }
        }
      }

      // Check validation rules
      if (rules.validate) {
        const isValid = this.evaluateCondition(rules.validate);
        if (!isValid) {
          errors.push({
            field: fieldName,
            rule: 'validate',
            message: rules.validate.message || `${fieldName} is invalid`
          });
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
}

// Make it globally available
window.FieldRulesEngine = FieldRulesEngine;

// Export for module systems if available
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FieldRulesEngine;
}
