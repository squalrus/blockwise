import { getSupabaseClient } from "../supabase";

// This is a local-only entrypoint (unlike apps/api/netlify/functions, where
// Netlify injects environment variables directly) so it loads apps/api/.env
// itself -- nothing else in the process does that automatically.
try {
  process.loadEnvFile();
} catch {
  // No .env file present -- fine if the environment was set some other way.
}

// Grants an account admin access to a neighborhood (BACKLOG.md "Neighborhood
// admin invites") -- the CLI-only replacement for a self-service invite UI at
// this project's current scale, mirroring sync:places. Usage:
// npm run grant:admin -- <email> <neighborhood-slug>
async function main() {
  const [email, slug] = process.argv.slice(2);
  if (!email || !slug) {
    console.error("Usage: npm run grant:admin -- <email> <neighborhood-slug>");
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

  const { data: neighborhood, error: neighborhoodError } = await supabase
    .from("neighborhood")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (neighborhoodError) throw new Error(`Looking up neighborhood failed: ${neighborhoodError.message}`);
  if (!neighborhood) {
    console.error(`No neighborhood found with slug "${slug}".`);
    process.exit(1);
  }

  const { error: insertError } = await supabase
    .from("neighborhood_admin")
    .upsert(
      { user_id: user.id, neighborhood_id: neighborhood.id },
      { onConflict: "user_id,neighborhood_id", ignoreDuplicates: true }
    );
  if (insertError) throw new Error(`Granting admin access failed: ${insertError.message}`);

  console.log(`${email} is now an admin of ${slug}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
