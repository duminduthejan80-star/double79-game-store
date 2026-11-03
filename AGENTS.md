# Architecture rules
- Free and Pro share the native managed-download bridge; the PC app fetches the authenticated server policy before download to enforce tier access and speed.
- Represent lifetime Pro with PostgreSQL infinity and handle it explicitly in date displays so existing timestamp-based access checks remain compatible.
- Pro-by-email management uses an admin-checked database function; UI unlock codes never grant data permissions.
- Use the shared phone-format validator for phone setup and profile editing, with matching database validation; format-only saves must never mark ownership as verified.