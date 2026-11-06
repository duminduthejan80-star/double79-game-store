# Architecture rules
- Package the PC app as a folder-based Edge WebView2 build and keep desktop effects scoped by runtime detection; this avoids repeated startup unpacking without changing browser rendering or login storage.
- Share single-flight native polling across UI consumers and never recursively discover executables during library listing; this keeps progress refreshes responsive while Play retains executable recovery.
- Free and Pro share the native managed-download bridge; the PC app fetches the authenticated server policy before download to enforce tier access and speed.
- Represent lifetime Pro with PostgreSQL infinity and handle it explicitly in date displays so existing timestamp-based access checks remain compatible.
- Pro-by-email management uses an admin-checked database function; UI unlock codes never grant data permissions.
- Use the shared phone-format validator for phone setup and profile editing, with matching database validation; format-only saves must never mark ownership as verified.
- Keep the public website as an anonymous Firebase Realtime Database catalog and a separate app-download handoff; never mount legacy account/native-download providers on public routes.
- Store the shared app URL in Firebase websiteSettings/appDownloadUrl and enforce admin custom claims in database rules and private admin actions; a hidden route or client code is not authorization.
