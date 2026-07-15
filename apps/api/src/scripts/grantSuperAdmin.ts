import { getSupabaseClient } from "../supabase";

// This is a local-only entrypoint (unlike apps/api/netlify/functions, where
// Netlify injects environment variables directly) so it loads apps/api/.env
// itself -- nothing else in the process does that automatically.
try {
  process.loadEnvFile();
} catch {
  // No .env file present -- fine if the environment was set some other way.
}

// Grants an account super admin access (BACKLOG.md) -- the CLI-only
// replacement for a self-service invite UI at this project's current scale,
// mirroring grant:admin. Super admin bypasses the 24h "Reimport Locations"
// cooldown and is, for now, the only role allowed to create a brand-new
// neighborhood. Usage: npm run grant:super-admin -- <email>
async function main() {
  const [email] = process.argv.slice(2);
  if (!email) {
    console.error("Usage: npm run grant:super-admin -- <email>");
    process.exit(1);
  }

  const supabase = getSupabaseClient();

  const { data: user, error: userError } = await supabase
    .from("app_user")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (userError) throw new Error(`Looking up app_user failed: ${userError.message}`);
  if (!user) {
    console.error(`No app_user found for ${email} -- sign in at least once first, then re-run.`);
    process.exit(1);
  }

  const { error: insertError } = await supabase
    .from("super_admin")
    .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });
  if (insertError) throw new Error(`Granting super admin access failed: ${insertError.message}`);

  console.log(`${email} is now a super admin.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
