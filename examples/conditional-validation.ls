// Example demonstrating conditional validation with nested properties

def Quote object {
  insurance_type: string @required @enum(auto,motorcycle,home,life)
}

def Vehicle object {
  make: string @required
  model: string @required
  year: string @required
}

model Prospect object {
  quote: object @ref(Quote) @required
  household_vehicles: array(@ref(Vehicle)) @uniqueItems

  // Conditional validation: require at least 1 vehicle for auto/motorcycle insurance
  @if(quote.insurance_type: @enum(auto,motorcycle), @minItems(household_vehicles,1))

  // Can also chain multiple conditions for different insurance types
  // @if(quote.insurance_type: @enum(home), @required(property_address))
}
