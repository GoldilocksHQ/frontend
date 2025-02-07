import { type ToolDefinition } from "@/services/api/agent-service";

export const plaidToolDefinition: ToolDefinition = {
  connectorName: "plaid",
  functions: [
    {
      name: "getAccounts",
      description: "Get user bank accounts details from Plaid",
      parameters: {},
      responseSchema: {
        type: "json_schema",
        json_schema: {
          name: "get_accounts_response",
          schema: {
            type: "object",
            properties: {
              accounts: { type: "array" },
            },
          },
        },
      },
    },
    {
      name: "getIdentity",
      description: "Get user bank account peronsonal identity information from Plaid",
      parameters: {},
      responseSchema: {
        type: "json_schema",
        json_schema: {
          name: "get_identity_response",
          schema: {
            type: "object",
          },
        },
      },
    },
    {
      name: "evaluateSignal",
      description: "Evaluate the return risk of an ACH debit by the initiator's bank account details from Plaid. This requires initiator's bank account id which can be retrieved from the getAccounts function.",
      parameters: {
        type: "object",
        properties: {
          accountId: { 
            type: "string",
            description: "The ID of the bank account to evaluate the signal for. Can be retrieved from the getAccounts function."
          },
          clientTransactionId: { 
            type: "string",
            description: "The ID of the transaction to evaluate the signal for. If not provided, generate a random UUID."
          },
          amount: { 
            type: "number",
            description: "The amount of the transaction to evaluate the signal for."
          },
        },
        required: ["accountId", "clientTransactionId", "amount"],
      },
      responseSchema: {
        type: "json_schema",
        json_schema: {
          name: "evaluate_signal_response",
          schema: {
            type: "object",
            properties: {
              signal: { type: "string" },
            },
          },
        },
      },
    },
    {
      name: "intiatePayment",
      description: "Intiate a payment to a recipient",
      parameters: {
        type: "object",
        properties: {
          recipientName: { 
            type: "string",
            description: "The name of the recipient" 
          },
          accountNumber: { 
            type: "string",
            description: "The account number of the recipient" 
          },
          sortCode: {
            type: "string",
            description: "The sort code of the recipient" 
          },
          currency: { 
            type: "string",
            description: "The currency of the payment" 
          },
          reference: { 
            type: "string", 
            description: "The reference of the payment" 
          },
          amount: { 
            type: "number", 
            description: "The amount of the payment" 
          },
        },
        required: ["recipientName", "accountNumber", "sortCode", "currency", "reference", "amount"],
      },
      responseSchema: {
        type: "json_schema",
        json_schema: {
          name: "intiate_payment_response",
          schema: {
            type: "object",
            properties: {
              linkToken: { type: "string" },
            },
          },
        },
      },
    },
  ],
};
