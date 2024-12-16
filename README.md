# Lite Spec
This is a domain specific language that converts Lite Spec syntax to JSON Schema.

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