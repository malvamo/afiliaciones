import "dotenv/config";

import { runWeeklyReport } from "@/lib/reports/weekly";

(async () => {
  try {
    const result = await runWeeklyReport();
    process.stdout.write(JSON.stringify(result, null, 2));
    process.stdout.write("\n");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
