model WebPilotSchedule object {
  _id: objectid @default("")
  script_id: objectid @default("")
  last_run_id: objectid @default("")
  schedule_name: string @required @minLength(1) @maxLength(100) @default("")
  cron_expression: string @required @minLength(1) @maxLength(50) @default("")
  is_active: boolean @required @default(true)
  created_by: string @default("")
  created_date: string @format(date-time) @default("")
  modified_by: string @default("")
  modified_date: string @format(date-time) @default("")

  @if(_id: @minLength(24), @required(script_id))
  @if(modified_by: @minLength(1) @maxLength(99), @required(modified_date))
  @can(view: "@self admin", add: "admin", edit: "admin editor", delete: "admin")
}
