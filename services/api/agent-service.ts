import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { UserMappedConnector } from '@/lib/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ToolDefinition {
  connector: UserMappedConnector;
  functions: {
    name: string;
    description: string;
    parameters: object;
    response_schema: object;
  }[];
}

export async function handleChatCompletion(
  model: string,
  messages: Array<{role: string, content: string}>,
  systemPrompt?: string,
  selectedTools?: string[],
  userId?: string
) {
  try {
    const tools = selectedTools ? await getToolDefinitions(selectedTools) : undefined;
    const {agentTools, responseFormat} = await setUpTools(tools!);

    const fullMessages = [
      { role: "system", content: systemPrompt || "" },
      ...messages
    ];
    const completion = await openai.chat.completions.create({
      messages: fullMessages as ChatCompletionMessageParam[],
      model: model || "gpt-4o-mini",
      tools: agentTools,
      tool_choice: "auto",
    });

    const firstResponse = completion.choices[0]?.message;

    // Handle function calls if present
    if (firstResponse?.tool_calls) {
      const results = await Promise.all(
        firstResponse.tool_calls.map(async tool_call => {
          const functionName = tool_call.function.name;
          const functionArgs = JSON.parse(tool_call.function.arguments);
          
          // Execute the function call
          const result = await executeFunctionCall(functionName, functionArgs, userId);

          // Check if result is valid
          if (!result) {
            throw new Error(`No result returned for function call: ${functionName}`);
          }
          
          // Add the function response to messages
          return {
            role: "tool" as const,
            tool_call_id: tool_call.id,
            name: functionName,
            content: JSON.stringify(result)
          };
        })
      );

      // Ensure all tool_call_ids have corresponding results
      if (results.length !== firstResponse.tool_calls.length) {
        throw new Error('Mismatch between tool_calls and results');
      }

      // Get a new completion with the function results
      const secondResponse = await openai.chat.completions.create({
        messages: [...messages, firstResponse, ...results] as ChatCompletionMessageParam[],
        model: model || "gpt-4o-mini",
        response_format: responseFormat.find(rf => rf.function_name === firstResponse.tool_calls?.[0].function.name)?.json_schema as OpenAI.ResponseFormatJSONSchema
      });

      return {
        content: secondResponse.choices[0]?.message?.content || '',
        role: secondResponse.choices[0]?.message?.role || 'assistant',
      };
    }

    return {
      content: firstResponse?.content || '',
      role: firstResponse?.role || 'assistant',
    };

  } catch (error) {
    console.error('Error in chat completion:', error);
    throw error;
  }
}

async function getToolDefinitions(connectorIds: string[]): Promise<ToolDefinition[]> {
  console.log(`Getting tool definitions for connectors: ${connectorIds}`);
  return [
    {
      connector: {
        id: "google-sheets",
        connectorName: "google-sheets",
        connectorDisplayName: "Google Sheets",
        isConnected: true
      },
      functions: [
        {
          name: "readSheet",
          description: "Read values from a Google Sheet",
          parameters: {
            type: "object",
            properties: {
              spreadsheetId: {
                type: "string",
                description: "The ID of the spreadsheet to read from"
              },
              range: {
                type: "string",
                description: "The A1 notation of the range to read (e.g., 'Sheet1!A1:B10')"
              }
            },
            required: ["spreadsheetId", "range"]
          },
          response_schema: {
            type: "json_schema",
            json_schema: {
              name: "read_sheet_response",
              schema: {
                type: "object",
                properties: {
                  values: {
                    type: "array",
                    items: {
                      type: "array",
                      items: {
                        type: "string"
                      }
                    },
                    description: "The values read from the sheet as a 2D array"
                  },
                  metadata: {
                    type: "object",
                    properties: {
                      range: { type: "string" },
                      totalRows: { type: "number" },
                      totalColumns: { type: "number" }
                    },
                    required: ["range", "totalRows", "totalColumns"],
                    additionalProperties: false
                  }
                },
                required: ["values", "metadata"],
                additionalProperties: false
              },
              strict: true
            }
          }
        },
        {
          name: "updateSheet",
          description: "Update values in a Google Sheet",
          parameters: {
            type: "object",
            properties: {
              spreadsheetId: {
                type: "string",
                description: "The ID of the spreadsheet to update"
              },
              range: {
                type: "string",
                description: "The A1 notation of the range to update (e.g., 'Sheet1!A1:B2')"
              },
              values: {
                type: "array",
                items: {
                  type: "array",
                  items: {
                    type: "string"
                  }
                },
                description: "The values to write as a 2D array"
              }
            },
            required: ["spreadsheetId", "range", "values"]
          },
          response_schema: {
            type: "json_schema",
            json_schema: {
              name: "update_sheet_response",
              schema: {
                type: "object",
                properties: {
                  updatedRange: { type: "string" },
                  updatedRows: { type: "number" },
                  updatedColumns: { type: "number" },
                  updatedCells: { type: "number" },
                  status: {
                    type: "string",
                    enum: ["success", "partial_success"]
                  }
                },
                required: ["updatedRange", "updatedRows", "updatedColumns", "updatedCells", "status"],
                additionalProperties: false
              },
              strict: true
            }
          }
        }
      ]
    }
  ];
}

async function setUpTools(tools: ToolDefinition[]) {
  const { agentTools, responseFormat } = tools?.reduce<{
    agentTools: ChatCompletionTool[];
    responseFormat: { function_name: string; json_schema: OpenAI.ResponseFormatJSONSchema }[];
  }>((acc, tool) => ({
    agentTools: [
      ...acc.agentTools,
      ...tool.functions.map(func => ({
        type: "function" as const,
        function: {
          name: `${tool.connector.connectorName}_${func.name}`,
          description: func.description,
          parameters: func.parameters as OpenAI.FunctionParameters,
        }
      }))
    ],
    responseFormat: [
      ...acc.responseFormat,
      ...tool.functions.map(func => ({
        function_name: `${tool.connector.connectorName}_${func.name}`,
        json_schema: func.response_schema as OpenAI.ResponseFormatJSONSchema
      }))
    ]
  }), { agentTools: [], responseFormat: [] }) ?? { agentTools: [], responseFormat: [] };

  return {agentTools, responseFormat};
}

async function executeFunctionCall(
  functionName: string,
  args: Record<string, unknown>,
  userId?: string
) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': process.env.GODILOCKS_API_KEY!
    };
    
    // Extract connector and function names
    const [connector, func] = functionName.split('_');
    
    const response = await fetch(`${baseUrl}/api/connectors`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        connector,
        function: func,
        arguments: args,
        userId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Function execution failed: ${errorText}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.result;
  } catch (error) {
    console.error(`Error executing ${functionName}:`, error);
    throw error;
  }
} 

// async function executeFunctionCall(
//   functionName: string,
//   args: Record<string, unknown>,
//   userId?: string
// ) {
//   try {
//     const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

//     const {data, error} = await getKey(userId!);
//     if (!data || !data.api_key) {
//       throw new Error(error?.message || "No valid credentials. User must authorize first.");
//     }

//     const headers = {
//       'Content-Type': 'application/json',
//       'x-api-key': data.api_key
//     };
    
//     if (functionName === 'google-sheets_read_sheet') {
//       const url = new URL(`${baseUrl}/api/connectors`);
//       url.searchParams.set('spreadsheetId', args.spreadsheetId as string);
//       url.searchParams.set('range', args.range as string);
//       if (userId) {
//         url.searchParams.set('userId', userId);
//       }
//       const response = await fetch(url, { headers });
      
//       if (!response.ok) {
//         const errorText = await response.text();
//         throw new Error(`Failed to read sheet: ${errorText}`);
//       }
      
//       const data = await response.json();
//       if (data.error) throw new Error(data.error);
//       return data.values;
//     }
    
//     if (functionName === 'google-sheets_update_sheet') {
//       const response = await fetch(`${baseUrl}/api/connectors`, {
//         method: 'POST',
//         headers,
//         cache: 'no-store',
//         body: JSON.stringify({
//           spreadsheetId: args.spreadsheetId,
//           range: args.range,
//           values: args.values,
//           userId: userId
//         })
//       });

//       if (!response.ok) {
//         const errorText = await response.text();
//         throw new Error(`Failed to update sheet: ${errorText}`);
//       }

//       const updateData = await response.json();
//       if (updateData.error) throw new Error(updateData.error);
//       return updateData.result;
//     }

//     throw new Error(`Unknown function: ${functionName}`);
//   } catch (error) {
//     console.error(`Error executing ${functionName}:`, error);
//     throw error;
//   }
// } 