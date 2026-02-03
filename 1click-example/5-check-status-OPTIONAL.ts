import { OneClickService } from "@defuse-protocol/one-click-sdk-typescript";
import { depositAddress } from "./3-send-deposit";

/**
 *  Step 4: Check status of Intent
 *
 *  This endpoint checks the status of an intent after deposit is sent
 *  Logic has been added here to continue polling until the intent is fulfilled or refunded
 *
 */

export async function checkStatus(depositAddress: string) {
  try {
    const status = await OneClickService.getExecutionStatus(depositAddress);
    console.log(status);
    return status;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function pollStatusUntilSuccess(depositAddress: string) {
  console.log("🔄 Starting status polling...");

  while (true) {
    try {
      // Fetch status from 1-Click API `/status` endpoint
      const statusResponse = await OneClickService.getExecutionStatus(
        depositAddress
      );
      const status = statusResponse.status;

      console.log(`   Current status: ${status}`);

      if (status === "SUCCESS") {
        console.log("🎉 Intent Fulfilled!");
        return statusResponse;
      }

      // If status is an error state, stop polling
      if (status === "REFUNDED") {
        console.log(`❌ Swap failed with status: ${status}`);
        return statusResponse;
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      console.error("Error checking status:", error);
      console.log("⏳ Waiting 5 seconds before retry...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

// Only run if this file is executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  checkStatus(depositAddress);
}
