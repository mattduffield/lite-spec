---
description: Generate a Go Kart web pilot automation script with Playwright composition
argument-hint: "Automation description (e.g., 'automate SafeCo auto quote for NC using prospect data')"
---

# Create Web Pilot Script

You are generating a Go Kart web pilot — a Playwright browser automation script that uses template composition via {% include %} and data loading via the code tab.

## Step 1: Load Knowledge

Read the Go Kart knowledge base:
- `/Users/matthewduffield/Documents/_learn/go-kart/docs/go-kart-knowledge.json` — focus on `webPilots` section

Read real production examples:
- `/Users/matthewduffield/Documents/_learn/go-kart/docs/web-pilot-examples.json` — Full NC Auto web pilot chain (11 scripts)

Study the `nat_gen` orchestrator pattern closely — it demonstrates:
- Code tab loading data, credentials, and carrier lookups
- mapSourceToTarget() for value mapping
- Auth check with Promise.race pattern
- Conditional {% include %} based on state
- Screenshot capture at each step

## Step 2: Understand the Request

User request: $ARGUMENTS

Determine:
- **Target system/carrier**: What website is being automated
- **Data source**: Which collection provides the source data (typically 'prospect')
- **Process flow**: What pages/steps need to be automated
- **State/type variations**: Does the flow differ by state, insurance type, etc.

## Step 3: Generate the Script Architecture

### Orchestrator Script (main entry point)

**Code tab** — loads data and sets up context:
```javascript
async function getData() {
  const data = await load("{collection}", params.data_id);
  let state = data?.address?.state?.toLowerCase() || "nc";
  const carrierLookup = await loadMany(`_carrier_{name}_${state}`, {}, 100);
  const credentials = await getCredentials("{credential_name}");
  return { credentials, data, carrierLookup };
}

context = await getData();

// Helper for mapping internal values to carrier form values
context.mapSourceToTarget = function(category, sourceKey, targetProp="value") {
  const lookupDoc = context.carrierLookup?.find(l => l.name === category);
  if (!lookupDoc) return "";
  const targetItem = lookupDoc.item_list.find(item => item.key === sourceKey);
  return targetItem ? targetItem[targetProp] : "";
};
```

**Script tab** — orchestrates the flow:
```
await log('baseURL:', '{{ credentials.login_url }}');
await setProp('target_url', '{{ credentials.login_url }}');
await setProp('data.username', '{{ params.username }}');
await setProp('data.carrier', '{Carrier Name}');
await setProp('data.state', '{{ data.address.state }}');

await page.goto('{{ credentials.login_url }}');
await page.waitForLoadState();

// Auth check pattern
const authCheck = await Promise.race([
  page.locator("#authenticatedElement").waitFor({ state: 'visible', timeout: 5000 })
    .then(() => 'authenticated'),
  page.locator('#loginButton').waitFor({ state: 'visible', timeout: 5000 })
    .then(() => 'needs_login')
]).catch(() => 'needs_login');

if (authCheck === 'needs_login') {
  {% include '{carrier}_login_page' %}
}

{% include '{carrier}_dashboard_page' %}

// State-conditional page inclusion
{% if data.address.state == 'NC' %}
  {% include '{carrier}_named_insured_page_nc' %}
{% elif data.address.state == 'SC' %}
  {% include '{carrier}_named_insured_page_sc' %}
{% endif %}

await page.waitForTimeout(200);
await page.screenshot();

// Continue through each page...
```

### Page Scripts (one per page/step)

Each page script is self-contained and has access to the parent's context:

```
// {carrier}_{page_name}_page_{state}
await log('Starting {page name}...');

// Fill form fields using source data
await page.fill('#firstName', '{{ data.first_name }}');
await page.fill('#lastName', '{{ data.last_name }}');

// Use carrier lookup mapping for select fields
const mappedValue = context.mapSourceToTarget('category_name', '{{ data.source_field }}');
await page.selectOption('#carrierField', mappedValue);

// Handle dynamic elements
await page.waitForSelector('#nextButton', { state: 'visible' });
await page.click('#nextButton');
await page.waitForLoadState();

await log('{page name} completed');
```

## Step 4: Key Patterns

### Form filling
```
await page.fill('#fieldId', '{{ data.field_name }}');
await page.fill('#nestedField', '{{ data.address.street }}');
```

### Select options with mapping
```
const mapped = context.mapSourceToTarget('coverage_type', '{{ data.coverage }}');
await page.selectOption('#coverageSelect', mapped);
```

### Handling loops (drivers, vehicles)
```
{% for driver in data.household_members %}
  await page.fill('#driver_{{ forloop.Counter0 }}_first', '{{ driver.first_name }}');
  await page.fill('#driver_{{ forloop.Counter0 }}_last', '{{ driver.last_name }}');
{% endfor %}
```

### Wait and screenshot
```
await page.waitForTimeout(200);
await page.screenshot();
```

### Error handling
```
try {
  await page.click('#optionalElement', { timeout: 3000 });
} catch(e) {
  await log('Optional element not found, continuing...');
}
```

## Step 5: Output

Present:
1. **Orchestrator script** — slug, code tab, script tab
2. **Page scripts** — one per step, slug naming: `{carrier}_{page}_{state}`
3. **Carrier lookup structure** — what `_carrier_{name}_{state}` collection should contain
4. **Credential vault entry** — what credentials are needed
5. **Schedule configuration** — suggested cron expression if applicable

### Naming conventions:
- Orchestrator: `{carrier}` (e.g., `nat_gen`, `safe_co`)
- Login page: `{carrier}_login_page`
- Other pages: `{carrier}_{page_name}_page_{state}` (e.g., `nat_gen_drivers_page_nc`)
- Retention/batch: `{carrier}_retention` or `{carrier}_{process}`
