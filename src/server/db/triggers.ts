import { sql } from "drizzle-orm";
import { db } from ".";

// Ensure no duplicate trigger
await db.execute(sql`
  DROP TRIGGER IF EXISTS set_default_password ON participants;
`);

await db.execute(sql`
  CREATE TRIGGER set_default_password
  BEFORE INSERT ON participants
  FOR EACH ROW
  EXECUTE FUNCTION generate_plaintext_password();
`);
