def Address object {
  street: string @required
  city: string @required
  state: string @required
  postal_code: string @required  
  @can(view: "@self", add: "admin editor", edit: "admin @self editor", delete: "@self admin")
}
def Member array {
  first_name: string @required
  middle_initial: string @minLength(1) @maxLength(1)
  last_name: string
  @if(first_name: @minLength(2)  @maxLength(99), @required(middle_initial)   @required(last_name))
}
model Customer object {
  _id: string @uuid
  first_name: string @required @minLength(2) @maxLength(10)
  last_name: string @required @minLength(2) @maxLength(10)
  email: string @email
  age: integer @minimum(14) @exclusiveMaximum(130)
  license_date: string @format(date-time)
  gender: string @required @enum(male,female)
  address: object @ref(Address) @required
  household_members: array @ref(Member) @required @minItems(1) @uniqueItems
  tags: array(string) @required @minItems(1) @uniqueItems
  salary: number @required @minimum(30000) @maximum(999999) @can(view: "finance", delete: "finance_manager")
  policy_total: decimal @minimum(0.00) @maximum(999999.99) @default(0.00) @can(view: "accounting", delete: "accounting_manager")
  has_prior_coverage: boolean @required
  prior_coverage_company: string @minLength(2)
  is_active: boolean @required @default(true)
  created_by: string
  created_date: string @format(date-time)
  modified_by: string
  modified_date: string @format(date-time)

  @if(has_prior_coverage: @const(true), @required(prior_coverage_company))
  @if(age: @minimum(16), @required(license_date))
  @if(gender: @enum("male", "female"), @required(tags))
  @if(modified_by: @minLength(1) @maxLength(99), @required(modified_date))

  @can(view: "@self admin", add: "admin", edit: "admin editor", delete: "admin")  // This is a comment
}
