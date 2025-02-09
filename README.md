# Lite Spec
This is a domain specific language that converts Lite Spec syntax to JSON Schema.

## Demo
[Demo Site](https://mattduffield.github.io/lite-spec/views/)

## Documentation
- [LiteSpec documentation](docs/lite-spec.md)


## Build
Execute the following command to build the bundler for the parser and highlighter.

```bash
npm run build
```

## Viewing Components
Execute the following to view the components locally.

```bash
python3 -m http.server 3016
```


## Example LiteSpec Markup
```
  @allow("all", auth() == "admin") // Only allow admin to create, update, delete, and view any user record
  @allow("view", true) // Allow everyone to view any user record
  @allow("create | update | delete", auth() == "admin") // Only allow admin to create, update or delete any record
  @allow("view | update | delete", own() == user) // Only allow current user to view, update, or delete records they own
  @allow("update", "email", own() == user) // Only allow current user to update the email property on records they own   
  
  @can("view", "email", own() == user) // Only current user can view the email property if it is a record they own
  @can("view", "salary", auth() == "hr | accounting") // Only a member of (hr) or (accounting) can view this property
  @can("view", "email", auth() == "supervisor | admin") // Only allow current user to update the email of their record
```

## Another example
```
def Address object {
  street: string @required @ui(wc-input,1)
  city: string @required @ui(wc-input,2)
  state: string @required @ui(wc-select,3,,us_states)
  postal_code: string @required @ui(wc-input,4)
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
  first_name: string @required @minLength(2) @maxLength(10) @ui(wc-input,1)
  last_name: string @required @minLength(2) @maxLength(10) @ui(wc-input,2)
  email: string @email @ui(wc-input,3)
  age: integer @minimum(14) @exclusiveMaximum(130) @ui(wc-input,4)
  license_date: string @format(date-time) @ui(wc-input,5)
  gender: string @required @enum(male,female) @ui(wc-input,6)
  address: object @ref(Address) @required
  household_members: array @ref(Member) @required @minItems(1) @uniqueItems
  tags: array(string) @required @minItems(1) @uniqueItems @ui(wc-select-multiple,7,Collections)
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
```

