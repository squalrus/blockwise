-- Drops app_user.phone: SMS/phone auth is disabled ([auth.sms] enable_signup
-- = false in supabase/config.toml) and the only signup paths are
-- email/password and Google OAuth, so this column was always null in
-- practice -- plumbed through from Supabase Auth's user object shape but
-- never actually populated.
alter table app_user drop column phone;
