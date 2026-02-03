/**
 * Field Rules Manager
 *
 * Manages the lifecycle of FieldRulesEngine instances for HTMX-based SPAs.
 * Ensures that each page/route has its own isolated field rules that are
 * properly cleaned up when navigating away.
 *
 * Usage in your template:
 * <script>
 *   if (window.initFieldRules) {
 *     window.initFieldRules({{ .Screen.FieldRules|safe }});
 *   }
 * </script>
 */

(function() {
  'use strict';

  // Store the current engine instance
  let currentEngine = null;

  /**
   * Initialize field rules for the current page
   * Called by each template with its own field rules
   *
   * @param {Object|string} rules - Field rules object or JSON string
   */
  window.initFieldRules = function(rules) {
    // Destroy existing engine if present
    if (currentEngine) {
      currentEngine.destroy();
      currentEngine = null;
    }

    // Default to empty object if no rules provided
    if (!rules || rules === '') {
      rules = {};
    }

    // Parse rules if provided as JSON string
    if (typeof rules === 'string') {
      try {
        rules = JSON.parse(rules);
      } catch (e) {
        console.error('Failed to parse field rules JSON:', e);
        rules = {};
      }
    }

    // Skip if empty rules object (nothing to initialize)
    if (typeof rules === 'object' && Object.keys(rules).length === 0) {
      return;
    }

    // Create and initialize new engine
    try {
      currentEngine = new FieldRulesEngine(rules);
      currentEngine.init();
      //console.log('Field rules initialized with', Object.keys(rules).length, 'field rules');
    } catch (e) {
      console.error('Failed to initialize FieldRulesEngine:', e);
      currentEngine = null;
    }
  };

  /**
   * Get the current field rules engine instance
   * Useful for debugging or dynamic rule management
   *
   * @returns {FieldRulesEngine|null}
   */
  window.getCurrentRulesEngine = function() {
    return currentEngine;
  };

  /**
   * Manually destroy the current field rules engine
   * Usually not needed as it's handled automatically on navigation
   */
  window.destroyFieldRules = function() {
    if (currentEngine) {
      currentEngine.destroy();
      currentEngine = null;
    }
  };

  // Clean up on HTMX navigation (before new content loads)
  if (typeof htmx !== 'undefined') {
    document.addEventListener('htmx:beforeSwap', function(event) {
      // Only destroy if we're swapping the main viewport
      // (You can adjust the target check based on your app structure)
      if (event.detail.target.id === 'viewport' || event.detail.target === document.body) {
        if (currentEngine) {
          currentEngine.destroy();
          currentEngine = null;
        }
      }
    });
  }

  // For debugging: expose to console
  if (typeof window !== 'undefined') {
    window.FieldRulesManager = {
      getCurrentEngine: window.getCurrentRulesEngine,
      init: window.initFieldRules,
      destroy: window.destroyFieldRules
    };
  }

})();
