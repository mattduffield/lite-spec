---
description: Generate a new Wave CSS web component following the library's architecture
argument-hint: "Component description (e.g., 'a progress bar with percentage, color, and animated fill')"
---

# Create Wave CSS Component

You are generating a new web component for the Wave CSS library.

## Step 1: Load Knowledge

Read the Wave CSS knowledge base:
- `/Users/matthewduffield/Documents/_dev/wave-css/docs/wave-css-knowledge.json`

Focus on the `overview.architecture`, `components`, and `patterns` sections.

Also read the base component for reference:
- `/Users/matthewduffield/Documents/_dev/wave-css/src/js/components/wc-base-component.js`

If this is a form component, also read:
- `/Users/matthewduffield/Documents/_dev/wave-css/src/js/components/wc-base-form-component.js`

## Step 2: Understand the Request

User request: $ARGUMENTS

Determine:
- **Component name** (must start with `wc-` prefix)
- **Component type**: display, form, interactive, utility, layout
- **Base class**: WcBaseComponent (display/interactive) or WcBaseFormComponent (form inputs)
- **Attributes**: What should be configurable via HTML attributes
- **Events**: What events should it emit or listen to
- **Rendering**: What DOM structure should it create

## Step 3: Generate the Component

Follow Wave CSS architecture principles:

```javascript
import { WcBaseComponent } from './wc-base-component.js';

class WcComponentName extends WcBaseComponent {
  static get is() {
    return 'wc-component-name';
  }

  static get observedAttributes() {
    return ['id', 'class', /* component-specific attributes */];
  }

  constructor() {
    super();
    // Initialize state
    // Add 'contents' class: this.classList.add('contents');
  }

  _render() {
    // Check for existing inner element
    const innerEl = this.querySelector('.wc-component-name');
    if (innerEl) {
      this.componentElement = innerEl;
    } else {
      this.componentElement = document.createElement('div');
      this.componentElement.classList.add('wc-component-name');
      this.appendChild(this.componentElement);
      this._createInnerElement();
    }
    this._applyStyle();
    // Process HTMX if available
    if (typeof htmx !== 'undefined') { htmx.process(this); }
  }

  _createInnerElement() {
    // Build DOM structure
    // Move declarative children into componentElement
  }

  _handleAttributeChange(attrName, newValue) {
    // React to attribute changes
  }

  _applyStyle() {
    // Load CSS (inline or via stylesheet)
  }

  _wireEvents() {
    super._wireEvents();
    // Add event listeners
    // Register EventHub listeners if needed
  }

  _unWireEvents() {
    super._unWireEvents();
    // Clean up event listeners
  }

  disconnectedCallback() {
    this._unWireEvents();
  }
}

customElements.define(WcComponentName.is, WcComponentName);
export { WcComponentName };
```

### Key conventions:
- **No Shadow DOM** — use regular DOM with `classList.add('contents')`
- **CSS containment** — component uses `display: contents`
- **Inner element** — create a `.wc-component-name` wrapper div
- **Declarative children** — support `<option>` or slot-based child content
- **HTMX support** — call `htmx.process(this)` after rendering
- **EventHub integration** — use `wc.EventHub.broadcast()` for cross-component communication
- **Attribute pass-through** — use `passThruAttributes` for standard HTML attributes
- **Style isolation** — use component-specific CSS class prefix

## Step 4: Generate CSS

Create component styles using Wave CSS conventions:
- Use CSS custom properties for theming (--component-bg-color, --text-1, etc.)
- Support light and dark modes
- Use the existing utility classes where possible
- Scope styles with `.wc-component-name` prefix
- Include responsive breakpoints if needed

## Step 5: Output

Present:
1. **Component JS file** (`src/js/components/wc-component-name.js`)
2. **Component CSS** (to be added to the component's `_applyStyle()` method)
3. **Example HTML** showing usage with various attribute combinations
4. **Export registration** — line to add in `src/js/components/index.js`
5. **EventHub events** — document any custom events

Ask if the user wants:
- A matching example view file (`views/component-name.html`)
- Form component variant (extends WcBaseFormComponent)
- Additional features or attribute support
