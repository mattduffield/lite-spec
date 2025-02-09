# LiteSpec Documentation

LiteSpec is a domain-specific language (DSL) for defining JSON Schema structures with additional features for permissions and validation rules. This documentation covers the syntax, features, and usage of LiteSpec.

## Table of Contents
1. [Basic Structure](#basic-structure)
2. [Types and Definitions](#types-and-definitions)
3. [Field Attributes](#field-attributes)
4. [Validation Rules](#validation-rules)
5. [Permissions](#permissions)
6. [Arrays and References](#arrays-and-references)
7. [Examples](#examples)

## Basic Structure

LiteSpec uses a block-based syntax with curly braces to define models and definitions. There are two main structural elements:

### Model Definition
```
model ModelName object {
  // fields and rules go here
}
```

### Type Definition
```
def TypeName object|array {
  // fields and rules go here
}
```

## Types and Definitions

LiteSpec supports the following basic types:
- `string`: Text values
- `integer`: Whole numbers
- `number`: Floating-point numbers
- `decimal`: High-precision decimal numbers (maps to BSON Decimal128)
- `boolean`: True/false values
- `object`: Nested object structures
- `array`: Lists of values

## Field Attributes

Fields are defined using the syntax: `fieldName: type @attribute1 @attribute2`

### Basic Validation Attributes
- `@required`: Makes the field mandatory
- `@minLength(n)`: Minimum string length
- `@maxLength(n)`: Maximum string length
- `@minimum(n)`: Minimum numeric value
- `@maximum(n)`: Maximum numeric value
- `@exclusiveMinimum(n)`: Exclusive minimum value
- `@exclusiveMaximum(n)`: Exclusive maximum value
- `@multipleOf(n)`: Number must be multiple of n
- `@format(type)`: Specifies format (e.g., "date-time", "email")
- `@enum(value1,value2,...)`: Restricts to enumerated values
- `@default(value)`: Sets default value

### Array-Specific Attributes
- `@minItems(n)`: Minimum number of items
- `@maxItems(n)`: Maximum number of items
- `@uniqueItems`: All items must be unique

## Validation Rules

Conditional validation rules are defined using the `@if` syntax:

```
@if(field: condition, action)
```

Example:
```
@if(has_prior_coverage: @const(true), @required(prior_coverage_company))
```

This creates a JSON Schema rule that makes `prior_coverage_company` required when `has_prior_coverage` is true.

## Permissions

Permissions can be defined at both collection and field levels using the `@can` attribute.

### Collection-Level Permissions
```
@can(view: "role1 role2", add: "role3", edit: "role4", delete: "role5")
```

### Field-Level Permissions
```
salary: number @can(view: "finance", delete: "finance_manager")
```

Special tokens:
- `@self`: Refers to the owner/creator of the record
- Roles can be space-separated for multiple role support

## Arrays and References

### Array Definition
Arrays can be defined in two ways:

1. Simple arrays:
```
tags: array(string) @required @minItems(1)
```

2. Complex arrays with references:
```
household_members: array @ref(Member) @required @minItems(1)
```

### Type References
Use `@ref` to reference defined types:
```
address: object @ref(Address) @required
```

## Examples

### Complete Model Example
```
def Address object {
  street: string @required
  city: string @required
  state: string @required
  postal_code: string @required
  @can(view: "@self", add: "admin editor", edit: "admin @self editor", delete: "@self admin")
}

model Customer object {
  _id: string @uuid
  first_name: string @required @minLength(2) @maxLength(10)
  email: string @format(email)
  address: object @ref(Address) @required
  salary: number @required @minimum(30000) @maximum(999999)
  is_active: boolean @required @default(true)
  
  @if(modified_by: @minLength(1), @required(modified_date))
  @can(view: "@self admin", add: "admin", edit: "admin editor", delete: "admin")
}
```

### Output
The DSL is converted to a JSON Schema with additional metadata for permissions and UI hints. The schema can be used with standard JSON Schema validators and extended to support the permission system.

## API Usage

The library provides several key functions:

```javascript
// Parse DSL to JSON Schema
const schema = window.litespec.parseDSL(dslString);

// Validate data against schema
const result = window.litespec.validateDataUsingSchema(schema, data);
```

## Integration

The library can be integrated into web applications using the provided JavaScript file. Include the library and initialize it:

```html
<script src="lite-spec.js"></script>
```

For UI integration, the library works well with CodeMirror for DSL editing and provides real-time schema generation.
