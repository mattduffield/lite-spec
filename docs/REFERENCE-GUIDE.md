# Go Kart + Wave CSS + LiteSpec — Quick Reference Guide

## Slash Commands

| Command | What It Generates | Knowledge Bases Read |
|---------|-------------------|---------------------|
| `/create-schema` | LiteSpec `.ls` schema definition | LiteSpec |
| `/create-template` | Go Kart Content tab + Code tab | Go Kart, Wave CSS, real examples |
| `/create-screen` | Full screen: schema + form + list + field rules | All three + real examples |
| `/create-component` | New Wave CSS web component | Wave CSS + base component source |
| `/create-web-pilot` | Playwright automation script chain | Go Kart + web pilot examples |

**Usage:** Type the command followed by a description:
```
/create-schema invoice with customer, line items, total, status, due date
/create-template contact form
/create-screen ticket tracker with title, description, priority, assignee, status
/create-component progress bar with percentage, color, and animated fill
/create-web-pilot automate SafeCo auto quote for NC using prospect data
```

---

## LiteSpec Schema DSL

### Structure
```
def TypeName object {          // Reusable type → goes to $defs
  field: type @attributes
}

def ArrayType array {          // Reusable array type
  field: type @attributes
}

model EntityName object {      // Root model → main schema
  field: type @attributes
  @if(condition, actions)      // Conditional rules
  @can(view: "roles", ...)     // Permissions
  @sort(field, direction)
  @breadcrumb(field, suffix)
}
```

### Types

| LiteSpec | JSON Schema | Example |
|----------|-------------|---------|
| `string` | string | `name: string @required` |
| `integer` | integer | `age: integer @minimum(0)` |
| `number` | number | `price: number @minimum(0)` |
| `decimal` | Decimal128 | `total: decimal @default(0.00)` |
| `boolean` | boolean | `is_active: boolean @default(true)` |
| `objectid` | string (24-char hex) | `contact_id: objectid` |
| `object @ref(T)` | $ref | `address: object @ref(Address)` |
| `array(string)` | array of strings | `tags: array(string) @minItems(1)` |
| `array @ref(T)` | array of objects | `items: array @ref(LineItem)` |

### Validation Attributes

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `@required` | Field must be present | `name: string @required` |
| `@minLength(n)` | Min string length | `@minLength(2)` |
| `@maxLength(n)` | Max string length | `@maxLength(50)` |
| `@minimum(n)` | Min numeric value | `@minimum(0)` |
| `@maximum(n)` | Max numeric value | `@maximum(999999)` |
| `@enum(a,b,c)` | Allowed values | `@enum(active,inactive,pending)` |
| `@default(v)` | Default value | `@default(true)` |
| `@format(f)` | String format | `@format(date-time)` |
| `@pattern(r)` | Regex validation | `@pattern(^\d{3}-\d{4}$)` |
| `@email` | Email shorthand | `email: string @email` |
| `@uuid` | UUID shorthand | `_id: string @uuid` |
| `@minItems(n)` | Min array length | `@minItems(1)` |
| `@maxItems(n)` | Max array length | `@maxItems(10)` |
| `@uniqueItems` | Unique array items | `tags: array(string) @uniqueItems` |
| `@ref(Type)` | Reference a def | `address: object @ref(Address)` |
| `@trim` | Trim whitespace | `name: string @trim` |

### Conditional Validation

```
@if(field: condition, actions)
```

| Condition | Example |
|-----------|---------|
| `@const(value)` | `@if(has_insurance: @const(true), @required(company))` |
| `@enum(a,b)` | `@if(type: @enum(auto,moto), @minItems(vehicles,1))` |
| `@minimum(n)` | `@if(age: @minimum(16), @required(license_date))` |
| `@minLength(n)` | `@if(modified_by: @minLength(1), @required(modified_date))` |
| Nested prop | `@if(quote.type: @enum(auto), @required(drivers[].license))` |

### Permissions

```
// Collection-level (own line inside block)
@can(view: "@self admin", add: "admin", edit: "admin editor", delete: "admin")

// Field-level (inline with field)
salary: number @can(view: "finance", delete: "finance_manager")
```

### Complete Example

```
def Address object {
  street: string @required
  city: string @required
  state: string @required
  postal_code: string @required
  @can(view: "@self", edit: "admin @self editor", delete: "@self admin")
}

def LineItem array {
  product: string @required
  quantity: integer @required @minimum(1)
  unit_price: number @required @minimum(0)
}

model Invoice object {
  customer_name: string @required @minLength(2)
  customer_email: string @email
  billing_address: object @ref(Address) @required
  line_items: array @ref(LineItem) @required @minItems(1)
  total: decimal @minimum(0) @default(0.00)
  status: string @required @enum(draft,sent,paid,overdue) @default(draft)
  due_date: string @format(date-time)
  is_active: boolean @default(true)
  created_by: string
  created_date: string @format(date-time)
  modified_by: string
  modified_date: string @format(date-time)

  @if(status: @enum(sent,paid,overdue), @required(due_date))
  @if(modified_by: @minLength(1), @required(modified_date))

  @can(view: "@self admin", add: "admin", edit: "admin editor", delete: "admin")
  @sort(created_date, desc)
  @breadcrumb(customer_name, - Invoice)
}
```

---

## Go Kart Template — Content Tab

### Standard Page Structure

```html
{% extends "__template_name__" %}

{% block css %}{% endblock %}

{% block pageContent %}
<wc-article-skeleton
  _="on load WaveHelpers.waitForThenHideAndShow('#article-skeleton', '.page-content', 3000, 500) end">
</wc-article-skeleton>

<div class="page-content relative flex flex-col flex-1 py-2 px-3 gap-2 hidden">

  <!-- Header: breadcrumb + actions -->
  <div class="header-content flex flex-row gap-3 justify-between items-center">
    <wc-breadcrumb>
      <wc-breadcrumb-item label="" link="/v/home"></wc-breadcrumb-item>
      <wc-breadcrumb-item label="List" link="/x/slug_list/list"></wc-breadcrumb-item>
      <wc-breadcrumb-item label="{{ Record.name }}" link=""></wc-breadcrumb-item>
    </wc-breadcrumb>
    <wc-save-split-button method="{{ FormMethod }}"
      form="form#myForm"
      hx-include="form#myForm"
      save-url="/x/slug/{{ RecordID }}"
      save-new-url="/x/slug/create"
      save-return-url="/x/slug_list/list">
    </wc-save-split-button>
  </div>

  <!-- Form -->
  <wc-form class="form-content col-1 gap-3 text-xs overflow-auto"
    method="{{ FormMethod }}"
    id="myForm"
    hx-{{ FormMethod }}="/x/slug/{{ RecordID }}">
    {% include "meta_fields" %}

    <div class="grid-1 sm:grid-2 md:grid-4 gap-2 px-5 py-2">
      <!-- fields -->
    </div>
  </wc-form>

</div>
{% endblock %}
```

### Pongo2 Template Syntax

| Syntax | Example |
|--------|---------|
| Variable | `{{ Record.first_name }}` |
| Nested | `{{ Record.address.street }}` |
| Filter | `{{ Record.status\|upper }}` / `{{ Data.items\|json }}` |
| Conditional | `{% if Record.status == "active" %}...{% endif %}` |
| Loop | `{% for item in Data.items %}...{% endfor %}` |
| Loop index | `{{ forloop.Counter0 }}` (0-based) / `{{ forloop.Counter }}` (1-based) |
| Include | `{% include "fragment_slug" %}` |
| Extends | `{% extends "__template_name__" %}` |
| Block | `{% block pageContent %}...{% endblock %}` |
| Query param | `{{ QueryParams\|getparam:"address.state" }}` |
| Query string | `{{ QueryParams\|querystring }}` |
| ObjectID | `{{ record._id\|objectid }}` |

### Wave CSS Component Mapping (Schema Type → Component)

| Schema Type | Wave CSS Component |
|-------------|-------------------|
| `string` | `<wc-input type="text">` |
| `string @email` | `<wc-input type="email">` |
| `string @format(date-time)` | `<wc-input type="date">` |
| `string @enum(a,b,c)` | `<wc-select>` with `<option>` children |
| `integer` / `number` | `<wc-input type="number">` |
| `decimal` / currency | `<wc-input type="currency">` |
| `boolean` | `<wc-input type="checkbox" toggle-switch>` |
| multiline text | `<wc-textarea>` |
| `object @ref(T)` | Nested fieldset or `<wc-tab-item>` section |
| `array @ref(T)` | `<wc-tabulator>` for inline editing or `{% include %}` repeating fragment |
| `objectid` (FK) | `<wc-select>` with `url` or `items` attribute |
| lookup field | `<wc-select items='{{ Lookups.name\|json }}'>` |

### HTMX Patterns

| Action | Pattern |
|--------|---------|
| Save form | `hx-{{ FormMethod }}="/x/slug/{{ RecordID }}"` |
| Load fragment | `hx-get="/x/fragment/create" hx-target=".container" hx-swap="beforeend"` |
| Delete item | `hx-delete="/x/slug/{{ RecordID }}/delete/{{ idx }}?array_field=name"` |
| Navigate | `hx-get="/x/slug/{{ id }}" hx-target="#viewport" hx-push-url="true"` |
| CSRF header | `hx-headers='{"X-CSRF-Token": "{{ CSRFToken }}"}'` |
| Loading indicator | `hx-indicator="#content-loader"` |

### Template Composition

```
depends: ["base", "loader", "partial-base"]     // Always include these

{% include "meta_fields" %}                      // Audit fields (created_by, modified_by)
{% include "fragment_name" %}                    // Inline fragment
{% if cond %}{% include "a" %}{% else %}{% include "b" %}{% endif %}
```

---

## Go Kart Template — Code Tab

### Standard Form Code

```javascript
function runGet() {
  let collection = 'entity';
  if (ctx.RecordID === 'create') {
    let record = ctx.DB.CreateNew(rdx.ConnName, rdx.DBName, 'schema_slug');
    return {record};
  }
  let record = ctx.DB.FindByID(rdx.ConnName, rdx.DBName, collection, ctx.RecordID);
  return {record};
}

function runPut() {
  let collection = 'entity';
  let id = ctx.RecordID;
  id = ctx.DB.SaveAndValidate(
    rdx.ConnName, rdx.DBName, collection, id, form,
    'schema_slug',
    ['tags'],                    // tag fields
    ['tags', 'array_field']      // array fields
  );
  if (id === '') { id = ctx.RecordID; }
  let record = ctx.DB.FindByID(rdx.ConnName, rdx.DBName, collection, id);
  ctx.App.Session.Put(ctx.Request.Context(), 'flash', 'Save successful!');
  return {record};
}

function runPost() {
  // Same as runPut for most templates
}

function runDelete() {
  let collection = 'entity';
  let id = ctx.RecordID;
  let index = ctx.RecordIndex;
  let arrayField = ctx.Request.URL.Query().Get('array_field');
  if (arrayField && index !== '') {
    // Array item deletion
    let record = ctx.DB.FindByID(rdx.ConnName, rdx.DBName, collection, id);
    let arr = record[arrayField];
    arr.splice(parseInt(index, 10), 1);
    let updateDoc = {};
    updateDoc[arrayField] = arr;
    ctx.DB.UpdateByID(rdx.ConnName, rdx.DBName, collection, id, updateDoc, null);
    return {success: true};
  }
  ctx.DB.DeleteByID(rdx.ConnName, rdx.DBName, collection, id);
  return {success: true};
}
```

### Key Database Operations

| Operation | Signature |
|-----------|-----------|
| Find by ID | `ctx.DB.FindByID(rdx.ConnName, rdx.DBName, collection, id)` |
| Find many | `ctx.DB.Find(rdx.ConnName, rdx.DBName, collection, filter, sort, projection, skip, limit)` |
| Find one | `ctx.DB.FindOne(rdx.ConnName, rdx.DBName, collection, filter)` |
| Create new | `ctx.DB.CreateNew(rdx.ConnName, rdx.DBName, schemaSlug)` |
| Create w/ overrides | `ctx.DB.CreateNewWithOverrides(rdx.ConnName, rdx.DBName, schemaSlug, username, overrides)` |
| Save + validate | `ctx.DB.SaveAndValidate(rdx.ConnName, rdx.DBName, collection, id, form, schemaSlug, tagFields, arrayFields)` |
| Update by ID | `ctx.DB.UpdateByID(rdx.ConnName, rdx.DBName, collection, id, data, arrayFields)` |
| Delete by ID | `ctx.DB.DeleteByID(rdx.ConnName, rdx.DBName, collection, id)` |

### Context Object

| Property | Purpose |
|----------|---------|
| `rdx.ConnName` | Database connection name |
| `rdx.DBName` | Database name |
| `ctx.RecordID` | Record ID from URL (or "create") |
| `ctx.RecordIndex` | Array item index for delete |
| `ctx.Username` | Current authenticated user |
| `ctx.Request` | HTTP request (URL, headers, query) |
| `ctx.ExtractQueryParams(keys)` | Extract query params as override map |
| `form.*` | Form field values (form.first_name, form.email) |
| `ObjectIDFromHex(id)` | Convert string to MongoDB ObjectID |

---

## Field Rules

### Targeting

| Target | Syntax | Example |
|--------|--------|---------|
| By field name | `"field_name"` | `"first_name"` |
| By nested name | `"parent.child"` | `"address.street"` |
| By CSS class | `".class-name"` | `".mailing_address_wrapper"` |
| By ID | `"#element-id"` | `"#title-content"` |
| By wildcard | `".prefix-*"` | `".member-title-*"` |
| Array wildcard | `"array.*.field"` | `"household_members.*.first_name"` |

### Rule Types

```json
{
  "field_name": {
    "visible":  { "when": "other_field", "equals": "value" },
    "required": { "when": "other_field", "equals": "value" },
    "clearWhenHidden": true,

    "syncWith": "array.0.field_name",

    "setValue": {
      "when": "trigger_field", "equals": "yes",
      "copyFrom": "source_field"
    },

    "setText": {
      "fields": { "first": "first_name", "last": "last_name" },
      "template": "{first} {last}",
      "default": "New Record"
    },

    "calculate": {
      "targets": [{
        "field": "array.*.computed_field",
        "expression": "addYears({value}, 16)"
      }]
    },

    "updateOptions": {
      "sourceArray": "members",
      "valueTemplate": "{index+1}",
      "textTemplate": "{first_name} {last_name}",
      "defaultOption": { "value": "", "text": "Choose..." }
    }
  }
}
```

### Condition Operators

| Operator | Example |
|----------|---------|
| `equals` | `"equals": "yes"` |
| `notEquals` | `"notEquals": "no"` |
| `in` | `"in": ["NC", "SC"]` |
| `notIn` | `"notIn": ["", "no"]` |
| `isEmpty` | `"isEmpty": false` |
| `greaterThan` | `"greaterThan": 1000` |
| Compound AND | `"when": {"and": [{"field": "a", "equals": "x"}, {"field": "b", "isEmpty": false}]}` |

### Calculate Functions

| Function | Example |
|----------|---------|
| `addYears({value}, n)` | `"expression": "addYears({value}, 16)"` |
| `yearsDiff({value}, today())` | `"expression": "yearsDiff({value}, today())"` |
| `today()` | Current date |
| Arithmetic | `"{quantity} * {unit_price}"` |

---

## Web Pilot Scripts

### Orchestrator Pattern (Code Tab)

```javascript
async function getData() {
  const data = await load("collection", params.data_id);
  const credentials = await getCredentials("carrier_name");
  const lookup = await loadMany(`_carrier_name_${state}`, {}, 100);
  return { credentials, data, lookup };
}
context = await getData();

context.mapSourceToTarget = function(category, sourceKey) {
  const doc = context.lookup?.find(l => l.name === category);
  const item = doc?.item_list.find(i => i.key === sourceKey);
  return item ? item.value : "";
};
```

### Orchestrator Pattern (Script Tab)

```
await page.goto('{{ credentials.login_url }}');
await page.waitForLoadState();

// Auth check
const authCheck = await Promise.race([
  page.locator("#authElement").waitFor({timeout: 5000}).then(() => 'auth'),
  page.locator("#loginBtn").waitFor({timeout: 5000}).then(() => 'login')
]).catch(() => 'login');

if (authCheck === 'login') { {% include 'carrier_login_page' %} }

{% include 'carrier_dashboard_page' %}

{% if data.address.state == 'NC' %}
  {% include 'carrier_page_nc' %}
{% elif data.address.state == 'SC' %}
  {% include 'carrier_page_sc' %}
{% endif %}

await page.screenshot();
```

### Common Script Actions

| Action | Code |
|--------|------|
| Navigate | `await page.goto('{{ credentials.url }}');` |
| Wait | `await page.waitForLoadState();` |
| Fill input | `await page.fill('#field', '{{ data.value }}');` |
| Select option | `await page.selectOption('#field', 'value');` |
| Click | `await page.click('#button');` |
| Screenshot | `await page.screenshot();` |
| Log | `await log('message');` |
| Set property | `await setProp('data.key', 'value');` |
| Map lookup | `context.mapSourceToTarget('category', '{{ data.field }}')` |
| Loop data | `{% for item in data.array %}...{% endfor %}` |

### Naming Conventions

| Script Type | Pattern | Example |
|-------------|---------|---------|
| Orchestrator | `{carrier}` | `nat_gen` |
| Login | `{carrier}_login_page` | `nat_gen_login_page` |
| Page (state) | `{carrier}_{page}_{state}` | `nat_gen_drivers_page_nc` |
| Scheduled | `{carrier}_{process}` | `natgen_retention` |

---

## File Locations

### Knowledge Bases
| File | Path |
|------|------|
| Wave CSS | `~/Documents/_dev/wave-css/docs/wave-css-knowledge.json` |
| Go Kart | `~/Documents/_learn/go-kart/docs/go-kart-knowledge.json` |
| LiteSpec | `~/Documents/_dev/lite-spec/docs/lite-spec-knowledge.json` |

### Real Examples
| File | Path |
|------|------|
| Templates (10) | `~/Documents/_learn/go-kart/docs/template-examples.json` |
| Fragments (11) | `~/Documents/_learn/go-kart/docs/template-fragments.json` |
| Web Pilots (11) | `~/Documents/_learn/go-kart/docs/web-pilot-examples.json` |

### Slash Commands (in each project's `.claude/commands/`)
| Command | File |
|---------|------|
| `/create-schema` | `create-schema.md` |
| `/create-template` | `create-template.md` |
| `/create-screen` | `create-screen.md` |
| `/create-component` | `create-component.md` |
| `/create-web-pilot` | `create-web-pilot.md` |
