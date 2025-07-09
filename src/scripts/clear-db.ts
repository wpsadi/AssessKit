// scripts/clearDatabase.ts

import { db } from "@/server/db";
import { sql } from "drizzle-orm";

async function clearDatabase() {
    try {
        // WARNING: This deletes everything!
        await db.execute(sql`DROP SCHEMA public CASCADE;`);
        await db.execute(sql`CREATE SCHEMA public;`);
        console.log("Database cleared.");
    } catch (err) {
        console.error("Failed to clear DB:", err);
    } finally {
        process.exit(0);
    }
}

clearDatabase();
