---
description: Generate a LiteSpec schema definition from an entity description
argument-hint: "Entity description (e.g., 'contact with first name, last name, email, phone, status')"
---

# Create LiteSpec Schema

You are generating a LiteSpec schema definition. LiteSpec is a DSL that compiles to JSON Schema.

## Step 1: Load Knowledge

Read the LiteSpec knowledge base for syntax reference:
- `/Users/matthewduffield/Documents/_dev/lite-spec/docs/lite-spec-knowledge.json`

Focus on the `syntax`, `attributes`, `conditionalValidation`, and `patterns` sections.

## Step 2: Understand the Request

User request: $ARGUMENTS

Parse the entity description to identify:
- **Entity name** (the model name)
- **Fields** and their likely types (infer from names: email → string @email, phone → string, status → string @enum, date fields → string @format(date-time), amounts/prices → number or decimal, etc.)
- **Required fields** (names, email, and primary identifiers are typically required)
- **Relationships** (if nested objects or arrays are mentioned, create `def` blocks)

## Step 3: Ask Clarifying Questions (if needed)

If the request is ambiguous, ask about:
- Which fields should be required?
- Should any fields have enums? If so, what values?
- Are there nested objects (e.g., address) or arrays (e.g., line items)?
- What permissions model? (default: view for @self and admin, add/edit for admin, delete for admin)
- Any conditional validation rules needed?

If the request is clear enough, proceed directly.

## Step 4: Generate the Schema

Follow these conventions:
- Use `model` for the root entity, `def` for nested types
- Always include `created_date`, `modified_date`, `created_by`, `modified_by` audit fields
- Add `is_active: boolean @default(true)` unless inappropriate
- Use `objectid` type for foreign key references
- Use `@sort(created_date, desc)` as default sort
- Add `@breadcrumb` using the most descriptive field
- Add `@can` permissions (default: view: "@self admin", add: "admin", edit: "admin editor", delete: "admin")
## Step 5: Output

Present the complete `.ls` file content. Then ask if the user wants:
- To save it to a file
- To add conditional validation rules
- To generate a Go Kart template from this schema (suggest using `/create-template`)
- To generate the compiled JSON Schema output

## LiteSpec Quick Reference

```
# Types: string, integer, number, decimal, boolean, objectid, object, array

# Validation
@required @minLength(n) @maxLength(n) @minimum(n) @maximum(n)
@enum(val1,val2) @const(value) @default(value)
@format(date-time|date|email|uri) @pattern(regex)
@email @uuid

# Arrays
array(string) array(@ref(TypeName)) @minItems(n) @maxItems(n) @uniqueItems

# References
object @ref(TypeName)

# Permissions
@can(view: "role1 role2", add: "role", edit: "role", delete: "role")
salary: number @can(view: "finance", delete: "finance_manager")

# Conditional validation
@if(field: @const(true), @required(other_field))
@if(field: @enum(val1,val2), @minItems(array_field, 1))
@if(nested.field: @enum(val1), @required(other_field))

# Metadata
@sort(field, asc|desc)
@breadcrumb(field, suffix)
```
