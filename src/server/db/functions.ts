import { db } from "@/server/db"; // your Drizzle DB instance
import { sql } from "drizzle-orm";

// Create the function
await db.execute(sql`
  CREATE OR REPLACE FUNCTION generate_plaintext_password()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.password IS NULL THEN
      -- Generates a random 12-character string (plain text)
      NEW.password := substr(md5(random()::text), 1, 12);
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
`);
