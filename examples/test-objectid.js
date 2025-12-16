// Test objectid type with conditional foreign key validation
const fs = require('fs');
const { parseDSL, validateDataUsingSchema } = require('../src/index.js');

// Read the DSL
const dsl = fs.readFileSync('./examples/objectid-foreign-key-example.ls', 'utf8');

// Parse to JSON Schema
const schema = parseDSL(dsl);

console.log('Generated JSON Schema:');
console.log(JSON.stringify(schema, null, 2));
console.log('\n' + '='.repeat(80) + '\n');

// Test Case 1: CREATE - No _id, no script_id (should be VALID)
console.log('Test Case 1: CREATE - New record without _id or script_id');
const createData1 = {
  _id: "",
  script_id: "",  // Foreign key is empty during creation
  last_run_id: "",
  schedule_name: "Daily Backup",
  cron_expression: "0 0 * * *",
  is_active: true,
  created_by: "admin",
  created_date: "2025-12-15T10:00:00Z"
};
const result1 = validateDataUsingSchema(schema, createData1);
console.log('Result:', result1.valid ? 'VALID ✓' : 'INVALID ✗');
if (!result1.valid) {
  console.log('Errors:', JSON.stringify(result1.errors, null, 2));
}
console.log('\n' + '='.repeat(80) + '\n');

// Test Case 2: UPDATE - Has _id, but missing script_id (should be INVALID)
console.log('Test Case 2: UPDATE - Existing record without script_id (should fail)');
const updateData1 = {
  _id: "507f1f77bcf86cd799439011",  // Valid ObjectID
  script_id: "",  // Foreign key is missing - should fail validation
  last_run_id: "",
  schedule_name: "Daily Backup Updated",
  cron_expression: "0 0 * * *",
  is_active: true,
  created_by: "admin",
  created_date: "2025-12-15T10:00:00Z",
  modified_by: "admin",
  modified_date: "2025-12-15T11:00:00Z"
};
const result2 = validateDataUsingSchema(schema, updateData1);
console.log('Result:', result2.valid ? 'VALID ✓' : 'INVALID ✗');
if (!result2.valid) {
  console.log('Errors:', JSON.stringify(result2.errors, null, 2));
}
console.log('\n' + '='.repeat(80) + '\n');

// Test Case 3: UPDATE - Has _id and script_id (should be VALID)
console.log('Test Case 3: UPDATE - Existing record with script_id (should pass)');
const updateData2 = {
  _id: "507f1f77bcf86cd799439011",  // Valid ObjectID
  script_id: "507f191e810c19729de860ea",  // Valid foreign key ObjectID
  last_run_id: "507f191e810c19729de860eb",
  schedule_name: "Daily Backup Updated",
  cron_expression: "0 0 * * *",
  is_active: true,
  created_by: "admin",
  created_date: "2025-12-15T10:00:00Z",
  modified_by: "admin",
  modified_date: "2025-12-15T11:00:00Z"
};
const result3 = validateDataUsingSchema(schema, updateData2);
console.log('Result:', result3.valid ? 'VALID ✓' : 'INVALID ✗');
if (!result3.valid) {
  console.log('Errors:', JSON.stringify(result3.errors, null, 2));
}
console.log('\n' + '='.repeat(80) + '\n');

// Test Case 4: Invalid ObjectID format (should be INVALID)
console.log('Test Case 4: Invalid ObjectID format');
const invalidData = {
  _id: "invalid-objectid",  // Invalid format
  script_id: "",
  schedule_name: "Test Schedule",
  cron_expression: "0 0 * * *",
  is_active: true
};
const result4 = validateDataUsingSchema(schema, invalidData);
console.log('Result:', result4.valid ? 'VALID ✓' : 'INVALID ✗');
if (!result4.valid) {
  console.log('Errors:', JSON.stringify(result4.errors, null, 2));
}
