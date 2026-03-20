---
description: Generate a Go Kart template (Content HTML + Code JavaScript) from a schema or description
argument-hint: "Schema name or description (e.g., 'contact form' or 'contact list view')"
---

# Create Go Kart Template

You are generating a Go Kart template — the HTML Content tab and JavaScript Code tab for a screen in the Go Kart platform.

## Step 1: Load Knowledge

Read these knowledge bases:
- `/Users/matthewduffield/Documents/_dev/wave-css/docs/wave-css-knowledge.json` — for Wave CSS components
- `/Users/matthewduffield/Documents/_learn/go-kart/docs/go-kart-knowledge.json` — for Go Kart template system (v2 with real patterns)
- `/Users/matthewduffield/Documents/_dev/lite-spec/docs/lite-spec-knowledge.json` — for schema reference (if schema name given)

Also read real examples for reference:
- `/Users/matthewduffield/Documents/_learn/go-kart/docs/template-examples.json` — 10 real production templates
- `/Users/matthewduffield/Documents/_learn/go-kart/docs/template-fragments.json` — 11 reusable fragments (base, meta_fields, etc.)

Focus on:
- Go Kart: `templateSystem.contentTab`, `templateSystem.codeTab`, `templateSystem.composition`, `fieldRules`, `patterns`
- Wave CSS: `components.form`, `components.navigation`, `components.data`, `components.buttons`
- Real examples: Study the `prospect` template for complex form patterns, `kanban_board` for composition patterns

## Step 2: Understand the Request

User request: $ARGUMENTS

Determine:
- **Template type**: form (detail/edit), list (table), or both
- **Schema/entity**: What data is being displayed/edited
- **Fields**: Either from a schema file or inferred from description
- **Route prefix**: `/v/` (public) or `/x/` (protected) — default to `/x/`

If a schema slug is provided, look for the LiteSpec file or ask the user for the field list.

## Step 3: Generate Content Tab (HTML)

### For a FORM template:

Use this structure (from real production templates):
```html
{% extends "__template_name__" %}

{% block css %}
{% endblock %}

{% block pageContent %}
<wc-article-skeleton
  _="on load WaveHelpers.waitForThenHideAndShow('#article-skeleton', '.page-content', 3000, 500) end">
</wc-article-skeleton>

<div class="page-content relative flex flex-col flex-1 py-2 px-3 gap-2 hidden">
  <div class="header-content flex flex-row gap-3 justify-between items-center">
    <wc-breadcrumb>
      <wc-breadcrumb-item label="" link="/v/home"></wc-breadcrumb-item>
      <wc-breadcrumb-item label="Entity List" link="/x/{slug}_list/list"></wc-breadcrumb-item>
      <wc-breadcrumb-item label="{{ Record.name_field }}" link=""></wc-breadcrumb-item>
    </wc-breadcrumb>
    <wc-save-split-button method="{{ FormMethod }}"
      form="form#{slug}"
      hx-include="form#{slug}"
      save-url="/x/{slug}/{{ RecordID }}"
      save-new-url="/x/{slug}/create"
      save-return-url="/x/{slug}_list/list">
    </wc-save-split-button>
  </div>

  <wc-form class="form-content col-1 gap-3 text-xs overflow-auto"
    method="{{ FormMethod }}"
    id="{slug}"
    action="/v/{slug}/{{ RecordID }}"
    hx-{{ FormMethod }}="/x/{slug}/{{ RecordID }}"
    >
    {% include "meta_fields" %}

    <!-- For simple forms: grid layout -->
    <div class="grid-1 sm:grid-2 md:grid-4 gap-2 px-5 py-2">
      <!-- fields here -->
    </div>

    <!-- For complex forms: use wc-tab -->
    <wc-tab class="col-1" animate="">
      <wc-tab-item class="active" label="General">
        <div class="grid-1 sm:grid-2 md:grid-4 gap-2 px-5 py-2">
          <!-- general fields -->
        </div>
      </wc-tab-item>
      <wc-tab-item label="Details">
        <div class="grid-1 sm:grid-2 md:grid-4 gap-2 px-5 py-2">
          <!-- detail fields -->
        </div>
      </wc-tab-item>
    </wc-tab>
  </wc-form>
</div>
{% endblock %}
```

Component mapping rules:
- `string` → `<wc-input type="text">`
- `string @email` → `<wc-input type="email">`
- `string @format(date-time)` → `<wc-input type="date">`
- `string @enum(...)` → `<wc-select>` with `<option>` children
- `integer` / `number` → `<wc-input type="number">`
- `decimal` / `currency` → `<wc-input type="currency">`
- `boolean` → `<wc-input type="checkbox" toggle-switch>`
- `string (multiline)` → `<wc-textarea>`
- `object @ref(...)` → nested fieldset or wc-tab-item section
- `array @ref(...)` → `<wc-tabulator>` for inline table editing
- `objectid` (foreign key) → `<wc-select>` with url or items attribute
- Lookup fields → `<wc-select>` with items from `{{ .Lookups.lookup_name | json }}`

### For a LIST template:

```html
<wc-breadcrumb doc-title="Entity List">
  <wc-breadcrumb-item label="Home" link="/"></wc-breadcrumb-item>
  <wc-breadcrumb-item label="Entities"></wc-breadcrumb-item>
</wc-breadcrumb>

<div class="col-1 gap-4 p-4">
  <div class="flex justify-between items-center">
    <h2>Entities</h2>
    <a href="/x/{slug}/create" class="btn btn-primary">Add New</a>
  </div>
  <wc-tabulator id="{slug}Table" class="mt-4">
    <wc-tabulator-column title="Name" field="name" sorter="string"
      formatter="link" formatter-params='{"routePrefix":"x","template":"{slug}","id_name":"{slug}_id"}'></wc-tabulator-column>
    <!-- More columns -->
    <wc-tabulator-column title="Status" field="status"></wc-tabulator-column>
  </wc-tabulator>
</div>
```

## Step 4: Generate Code Tab (JavaScript)

### For a FORM template (using real production patterns):

```javascript
function runGet() {
  let collection = '{collection_name}';
  if (ctx.RecordID === 'create') {
    let record = ctx.DB.CreateNew(rdx.ConnName, rdx.DBName, '{schema_slug}');
    return {record};
  }
  let record = ctx.DB.FindByID(rdx.ConnName, rdx.DBName, collection, ctx.RecordID);
  // Load lookups if needed:
  // let status_lookup = ctx.DB.FindOne(rdx.ConnName, rdx.DBName, '_lookup', {name: 'status_lookup'});
  return {record};
}

function runPut() {
  let collection = '{collection_name}';
  let id = ctx.RecordID;
  // SaveAndValidate: validates against schema, handles tags and array fields
  // Args: connName, dbName, collection, id, form, schemaSlug, tagFields[], arrayFields[]
  id = ctx.DB.SaveAndValidate(rdx.ConnName, rdx.DBName, collection, id, form, '{schema_slug}', ['tags'], ['tags']);
  if (id === '') { id = ctx.RecordID; }
  let record = ctx.DB.FindByID(rdx.ConnName, rdx.DBName, collection, id);
  ctx.App.Session.Put(ctx.Request.Context(), 'flash', 'Save successful!');
  return {record};
}

function runPost() {
  // Same as runPut for most templates
  let collection = '{collection_name}';
  let id = ctx.RecordID;
  id = ctx.DB.SaveAndValidate(rdx.ConnName, rdx.DBName, collection, id, form, '{schema_slug}', ['tags'], ['tags']);
  let record = ctx.DB.FindByID(rdx.ConnName, rdx.DBName, collection, id);
  ctx.App.Session.Put(ctx.Request.Context(), 'flash', 'Save successful!');
  return {record};
}

function runDelete() {
  let collection = '{collection_name}';
  let id = ctx.RecordID;
  let index = ctx.RecordIndex;
  let arrayField = ctx.Request.URL.Query().Get('array_field');

  if (arrayField && index !== '') {
    // Array item deletion
    const ALLOWED_ARRAY_FIELDS = [/* whitelist array fields */];
    if (!ALLOWED_ARRAY_FIELDS.includes(arrayField)) throw new Error('Deletion not allowed');
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

### For a LIST template:

```javascript
function runList() {
  // Data loaded automatically via TabulatorApi at /api/{collection}
  // Only needed if you want to pre-load additional data
  let collection = '{collection_name}';
  let records = ctx.DB.Find(rdx.ConnName, rdx.DBName, collection, {}, 10);
  return {records};
}
```

### Key conventions:
- Always use `rdx.ConnName` and `rdx.DBName` (NOT raw session calls)
- Use `SaveAndValidate` for schema-validated saves (NOT manual UpdateByID for form data)
- Use `CreateNewWithOverrides` when query params should seed defaults
- Support array item deletion via `array_field` query param + index
- Set flash message on successful save: `ctx.App.Session.Put(ctx.Request.Context(), 'flash', 'Save successful!')`

## Step 5: Generate Field Rules (if applicable)

If the schema has conditional validation (@if rules), generate matching field rules:

```javascript
const fieldRules = {
  "dependent_field": {
    visible: { when: "trigger_field", equals: "value" },
    required: { when: "trigger_field", equals: "value" },
    clearWhenHidden: true
  }
};
window.rulesEngine = new FieldRulesEngine(fieldRules);
window.rulesEngine.init();
```

## Step 6: Output

Present the complete template with clearly labeled sections:
1. **Content Tab** (HTML)
2. **Code Tab** (JavaScript)
3. **Field Rules** (if applicable)
4. **Template Properties** (slug, schema, route prefix, collections, lookups)

Ask if the user wants modifications or to generate the complementary view (list ↔ form).
