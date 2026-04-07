import "dotenv/config";

import { runDailyRenewalReminder } from "@/lib/reports/daily";

(async () => {
  try {
    const result = await runDailyRenewalReminder();
    process.stdout.write(JSON.stringify(result, null, 2));
    process.stdout.write("\n");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
