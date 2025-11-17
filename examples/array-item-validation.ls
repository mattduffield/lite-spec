// Example demonstrating conditional validation for array item properties
// Use the syntax: arrayName[].propertyName to require a property in all array items

def Quote object {
  insurance_type: string @required @enum(auto,motorcycle,renters) @default(auto)
}

def Driver object {
  license_number: string @required
  license_status: string @required @enum(active,suspended,expired)
  license_date: string @format(date-time)
}

def Member object {
  first_name: string @required
  last_name: string @required
  driver: object @ref(Driver)  // NOT required by default - conditionally required
}

def Vehicle object {
  make: string @required
  model: string @required
  vin: string @minLength(17) @maxLength(17)
}

model Prospect object {
  quote: object @ref(Quote) @required
  household_members: array(@ref(Member)) @uniqueItems
  household_vehicles: array(@ref(Vehicle)) @uniqueItems

  // Require at least 1 member and each member must have a driver for auto/motorcycle
  @if(quote.insurance_type: @enum(auto,motorcycle), @minItems(household_members,1) @required(household_members[].driver))

  // Require at least 1 vehicle for auto/motorcycle
  @if(quote.insurance_type: @enum(auto,motorcycle), @minItems(household_vehicles,1))

  // For renters, household_members is optional and driver is not required
}
