import { constructCredentials } from "../utils";
import { FunctionResult } from "../../services/api/connector-service";
import { UUID } from "crypto";
import { getCredentials } from "@/services/supabase/server";
import { createPlaidClient } from "./auth";
import { PlaidApi } from "plaid";

const CONNECTOR_NAME = "plaid";

// Define types for function arguments and results

// type FunctionArgs = {
//   accessToken: string;
// };

export async function handleFunction(
  userId: UUID,
  functionName: string,
  // args: FunctionArgs
): Promise<FunctionResult<unknown>> {
  const plaidClient = await createPlaidClient();
  const accessToken = await getAccessToken(userId);
  try {
    switch (functionName) {
      case 'getItem':
        return await getItem(plaidClient, accessToken);
      case 'getAccounts':
        if (!accessToken) {
          return { success: false, result: null, error: "No valid access token" };
        }
        return await getAccounts(plaidClient, accessToken);
      default:
        return { success: false, result: null, error: `Unknown function: ${functionName}` };
    }
  } catch (error) {
    return { success: false, result: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function getAccessToken(userId: UUID): Promise<UUID> {
  const accessCredentials = constructCredentials(
    userId,
    CONNECTOR_NAME,
    "access"
  );
  const {
    success,
    credentials: updatedAccessCredentials,
    error: accessError,
  } = await getCredentials(await accessCredentials);

  if (!success || !updatedAccessCredentials) {
    throw new Error(
      accessError || "No valid credentials. User must authorize first."
    );
  }
  return updatedAccessCredentials.token as UUID;
}

async function getItem(plaidClient: PlaidApi, accessToken: UUID): Promise<FunctionResult<unknown>> {
  
  try {
    const item = await plaidClient.itemGet({ access_token: accessToken });
    return { success: true, result: item, error: undefined };
  } catch (error) {
    return { success: false, result: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function getAccounts(plaidClient: PlaidApi, accessToken: UUID): Promise<FunctionResult<unknown>> {
  try {
    const response = await plaidClient.authGet({ access_token: accessToken });
    const accountData = response.data.accounts;
    // if (response.data.numbers.ach.length > 0) {
    //   // Handle ACH numbers (US accounts)
    //   const achNumbers = response.data.numbers.ach;
    // }
    // if (response.data.numbers.eft.length > 0) {
    //   // Handle EFT numbers (Canadian accounts)
    //   const eftNumbers = response.data.numbers.eft;
    // }
    // if (response.data.numbers.international.length > 0) {
    //   // Handle International numbers
    //   const internationalNumbers = response.data.numbers.international;
    // }
    // if (response.data.numbers.bacs.length > 0) {
    //   // Handle BACS numbers (British accounts)
    //   const bacsNumbers = response.data.numbers.bacs;
    // }
    return { success: true, result: accountData, error: undefined };
  } catch (error) {
    //handle error
    return { success: false, result: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
}