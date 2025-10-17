// Example demonstrating @pattern usage in LiteSpec
// Patterns use standard regex syntax for string validation

model User object {
  // Username: 3-16 alphanumeric characters or underscore
  username: string @required @pattern(^[a-zA-Z0-9_]{3,16}$)

  // Email format validation
  email: string @pattern(^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$)

  // US Phone number format: 555-123-4567
  phone: string @pattern(^\d{3}-\d{3}-\d{4}$)

  // US ZIP code: 5 digits or ZIP+4 format
  zipcode: string @pattern(^\d{5}(-\d{4})?$)

  // URL starting with http or https
  website: string @pattern(^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$)

  // Hex color code
  favorite_color: string @pattern(^#[0-9A-Fa-f]{6}$)

  // IPv4 address
  ip_address: string @pattern(^(\d{1,3}\.){3}\d{1,3}$)

  // Complex pattern with alternation and optional parts
  status: string @pattern(^(active|inactive|pending)(-(verified|unverified))?$)
}
