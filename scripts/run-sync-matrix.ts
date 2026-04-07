import "dotenv/config";

import { syncActiveMatrix } from "@/lib/matrix-sync";

(async () => {
  try {
    const result = await syncActiveMatrix();
    process.stdout.write(JSON.stringify(result, null, 2));
    process.stdout.write("\n");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
