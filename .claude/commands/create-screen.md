---
description: Generate a complete Go Kart screen — LiteSpec schema + form template + list template + field rules
argument-hint: "Entity description (e.g., 'invoice with customer, line items, total, status, due date')"
---

# Create Complete Go Kart Screen

You are generating an end-to-end screen for the Go Kart platform: schema definition, form template, list template, and field rules.

## Step 1: Load All Knowledge Bases

Read all three knowledge bases:
- `/Users/matthewduffield/Documents/_dev/lite-spec/docs/lite-spec-knowledge.json`
- `/Users/matthewduffield/Documents/_dev/wave-css/docs/wave-css-knowledge.json`
- `/Users/matthewduffield/Documents/_learn/go-kart/docs/go-kart-knowledge.json` (v2 with real patterns)

Also read real production examples for reference:
- `/Users/matthewduffield/Documents/_learn/go-kart/docs/template-examples.json` — 10 real templates
- `/Users/matthewduffield/Documents/_learn/go-kart/docs/template-fragments.json` — 11 reusable fragments

Study the `prospect` template closely — it demonstrates the most complex patterns: composition via {% include %}, advanced field rules (syncWith, calculate, updateOptions, setValue with copyFrom), array item management, and query param state management.

## Step 2: Understand the Request

User request: $ARGUMENTS

Parse to identify:
- Entity name and purpose
- Fields with types (infer from names)
- Relationships (nested objects, arrays, foreign keys)
- Any business rules or conditional logic

## Step 3: Ask Clarifying Questions

Before generating, confirm:
1. **Fields**: "I identified these fields: [list]. Should I add/remove any?"
2. **Enums**: "Should [field] have specific allowed values?"
3. **Nested objects**: "Should [field] be a separate nested type (e.g., address)?"
4. **Arrays**: "Should [field] be a list of items (e.g., line items)?"
5. **Conditional rules**: "Any fields that should show/hide based on other fields?"
6. **Permissions**: "Default permissions (admin manages, users view own records) or custom?"
7. **Route**: "Public (/v/) or protected (/x/)?" — default to /x/

Wait for user confirmation before proceeding. If the user says "just generate it" or the request is very specific, proceed with reasonable defaults.

## Step 4: Generate Schema (LiteSpec)

Follow the `/create-schema` conventions:
- `def` blocks for nested types
- `model` for the root entity
- Audit fields (created_date, modified_date, created_by, modified_by)
- is_active field
- Appropriate @can permissions
- @sort and @breadcrumb
- @if rules for conditional validation

## Step 5: Generate Form Template

Follow the `/create-template` conventions for form type:
- {% extends "__template_name__" %} with {% block pageContent %}
- wc-article-skeleton with WaveHelpers.waitForThenHideAndShow for loading state
- wc-breadcrumb with navigation back to list
- wc-form with hx-{{ FormMethod }}="/x/{slug}/{{ RecordID }}"
- {% include "meta_fields" %} for audit tracking
- Wave CSS components mapped from schema types
- wc-save-split-button with method="{{ FormMethod }}" for save/new/return
- Use wc-tab if more than 6-8 fields (group logically into tab items)
- For repeating sections (arrays): create separate fragment templates, include with {% include %}
- Add dynamic "Add Item" buttons with hx-get to fragment/create, hx-target=".container", hx-swap="beforeend"
- depends: ["base", "loader", "partial-base"] plus any included fragments

## Step 6: Generate List Template

Follow the `/create-template` conventions for list type:
- wc-breadcrumb
- "Add New" button linking to /x/{slug}/create
- wc-tabulator with columns from schema
- Link formatter on primary column for navigation to detail

## Step 7: Generate Code Tabs

**Form Code Tab (use real production patterns):**
- Use `rdx.ConnName` and `rdx.DBName` for all DB operations (NOT raw session calls)
- runGet() with `CreateNew` or `CreateNewWithOverrides` for "create", `FindByID` for existing
- runPut()/runPost() using `SaveAndValidate(rdx.ConnName, rdx.DBName, collection, id, form, schemaSlug, tagFields, arrayFields)`
- runDelete() supporting both full record deletion and array item deletion via `array_field` query param
- Set flash message: `ctx.App.Session.Put(ctx.Request.Context(), 'flash', 'Save successful!')`
- Load lookups if select fields reference them: `ctx.DB.FindOne(rdx.ConnName, rdx.DBName, '_lookup', {name: 'lookup_name'})`

**List Code Tab:**
- runList() — typically minimal: `let records = ctx.DB.Find(rdx.ConnName, rdx.DBName, collection, {}, 10); return {records};`
- TabulatorApi at /api/{collection} handles pagination/sorting/filtering automatically

## Step 8: Generate Field Rules

Map schema validation to client-side field rules AND add advanced patterns as appropriate:

**From @if schema rules:**
- @if(@const(true)) → `"visible": {"when": "field", "equals": "true"}, "required": {"when": "field", "equals": "true"}`
- @if(@enum(val1,val2)) → `"visible": {"when": "field", "in": ["val1","val2"]}`
- @if(@minimum(n)) → `"visible": {"when": "field", "greaterThanOrEqual": n}`

**Advanced patterns from real templates:**
- `syncWith` for related fields: `"first_name": {"syncWith": "array.0.first_name"}`
- `setValue` with `copyFrom` for address copying: `"mailing.street": {"setValue": {"when": "same_as_billing", "equals": "yes", "copyFrom": "billing.street"}}`
- `setText` for dynamic titles: `"#title": {"setText": {"fields": {"first": "first_name", "last": "last_name"}, "template": "{first} {last}", "default": "New Record"}}`
- `calculate` for computed fields: `"birth_date": {"calculate": {"targets": [{"field": "age", "expression": "yearsDiff({value}, today())"}]}}`
- `updateOptions` for dynamic selects: `"assigned_person": {"updateOptions": {"sourceArray": "members", "valueTemplate": "{index+1}", "textTemplate": "{first_name} {last_name}"}}`
- Wildcard targeting for repeating sections: `".item-title-*"` and `"array.*.field_name"`
- Compound conditions: `"when": {"and": [{"field": "state", "in": ["NC","SC"]}, {"field": "other", "isEmpty": false}]}`

## Step 9: Output

Present everything in clearly labeled sections:

### 1. LiteSpec Schema (`{slug}.ls`)
### 2. Form Template — Content Tab
### 3. Form Template — Code Tab
### 4. List Template — Content Tab
### 5. List Template — Code Tab
### 6. Field Rules (if applicable)
### 7. Template Properties Summary

```
Form Template:
  slug: {slug}
  schema: {slug}
  route_prefix: x
  collections: [{collection}]
  lookups: [{lookup_names}]
  template_type: form

List Template:
  slug: {slug}_list
  schema: {slug}
  route_prefix: x
  collections: [{collection}]
  template_type: list
```

### 8. App Navigation Item (for adding to an app)

```json
{
  "name": "Entity Name",
  "slug": "{slug}_list",
  "route_prefix": "x",
  "icon": "suggested-icon"
}
```

Ask if the user wants any modifications.
