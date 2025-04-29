// Define the LiteSpec mode using defineSimpleMode
CodeMirror.defineSimpleMode("litespec", {
  start: [
    // Match keywords like def and model
    { regex: /\b(def|model)\b/, token: "keyword" },
    
    // Match types like object, array, string, number, etc.
    { regex: /\b(object|array|string|number|integer|boolean|decimal)\b/, token: "atom" },
    
    // Match annotations starting with @
    { regex: /(@required|@can|@ref|@if|@minimum|@exclusiveMinimum|@maximum|@exclusiveMaximum|@minLength|@maxLength|@minItems|@maxItems|@uniqueItems|@uuid|@email|@format|@enum|@const|@default|@ui|@breadcrumb|@sort)/, token: "attribute" },
    
    // Match field names before the colon
    { regex: /\b[a-zA-Z_]\w*\b(?=:)/, token: "variable-2" },

    // Match punctuation
    { regex: /[:]/, token: "punctuation" },
    
    // Match opening brace `{`
    { regex: /{/, token: "brace" },
    
    // Match closing brace `}`
    { regex: /}/, token: "brace" },

    // Match strings (enclosed in double quotes)
    { regex: /"[^"]*"/, token: "string" },
    
    // Match numbers (integers and decimals)
    { regex: /\b\d+(\.\d+)?\b/, token: "number" },
    
    // Match booleans (true, false) and the date-time keyword
    { regex: /\b(true|false|date-time)\b/, token: "atom" },
    
    // Match comments (starting with //)
    { regex: /\/\/.*/, token: "comment" }
  ]
});
