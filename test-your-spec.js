const { parseDSL } = require('./src/index.js');

const dsl = `
def Quote object {
  insurance_type: string @required @enum(auto,motorcycle) @default(auto)
}

def Vehicle object {
  make: string @required
}

model Prospect object {
  quote: object @ref(Quote) @required
  household_vehicles: array(@ref(Vehicle)) @uniqueItems

  @if(quote.insurance_type: @enum(auto,motorcycle), @minItems(household_vehicles,1))
}
`;

console.log('Testing your @if condition...\n');
const schema = parseDSL(dsl);

console.log('Full schema:');
console.log(JSON.stringify(schema, null, 2));

console.log('\n\nallOf section (where @if conditions are):');
if (schema.allOf) {
  console.log(JSON.stringify(schema.allOf, null, 2));
} else {
  console.log('❌ NO allOf FOUND! The @if condition was not parsed!');
}
