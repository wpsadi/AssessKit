import "dotenv/config";
import { db } from "@/server/db";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTriggers() {
	try {
		const triggersDir = path.join(__dirname, "/triggers");

		// Read all .sql files
		const files = fs
			.readdirSync(triggersDir)
			.filter((file) => file.endsWith(".sql"))
			.sort();

		console.log(`Found ${files.length} SQL trigger files`);

		for (const file of files) {
			const filePath = path.join(triggersDir, file);
			const sqlContent = fs.readFileSync(filePath, "utf8");

			console.log(`Executing: ${file}`);
			await db.execute(sqlContent);
			console.log(`✓ Successfully executed: ${file}`);
		}

		console.log("All triggers executed successfully!");
	} catch (error) {
		console.error("Error running triggers:", error);
		process.exit(1);
	}
}

runTriggers();
