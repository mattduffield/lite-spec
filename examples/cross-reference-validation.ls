// Example demonstrating cross-reference validation with nested property requirements
// All conditional validation must be at the parent (model) level

def Quote object {
  insurance_type: string @required @enum(auto,motorcycle,renters) @default(auto)
}

def LiabilityLimit object {
  // Auto/Motorcycle fields
  bi: string @enum(none,30/60,50/100,100/100) @default(50/100)
  pd: string @enum(none,25,50,100,300) @default(50)
  med: string @enum(none,500,1000,2000,5000) @default(none)

  // Renters fields
  renter_liability_limit_type: string @enum(none,100000,300000,500000)
  renter_personal_property: number
  renter_loss_of_use: number
}

def Member object {
  first_name: string @required
  last_name: string @required
  driver: object @ref(Driver)
}

def Driver object {
  license_number: string
  license_status: string @enum(active,suspended,expired)
}

model Prospect object {
  quote: object @ref(Quote) @required
  liability_limits: object @ref(LiabilityLimit) @required
  household_members: array(@ref(Member)) @uniqueItems

  // Cross-reference validation - checking quote.insurance_type and requiring nested fields
  @if(quote.insurance_type: @enum(auto,motorcycle), @required(liability_limits.bi) @required(liability_limits.pd) @required(liability_limits.med))
  @if(quote.insurance_type: @enum(renters), @required(liability_limits.renter_liability_limit_type) @required(liability_limits.renter_personal_property))

  // Require household_members to have driver for auto/motorcycle
  @if(quote.insurance_type: @enum(auto,motorcycle), @minItems(household_members,1))
}

// Note: To require driver nested inside household_members[], you would use:
// @if(quote.insurance_type: @enum(auto,motorcycle), @required(household_members.driver))
// But this requires each member in the array to have a driver property
