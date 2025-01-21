import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { UserMappedConnector } from '@/lib/types';
import { getKey } from '../supabase/server';

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
    const { aiTools, responseFormat } = tools?.reduce<{
      aiTools: ChatCompletionTool[];
      responseFormat: { function_name: string; json_schema: OpenAI.ResponseFormatJSONSchema }[];
    }>((acc, tool) => ({
      aiTools: [
        ...acc.aiTools,
        ...tool.functions.map(func => ({
          type: "function" as const,
          function: {
            name: `${tool.connector.connector_name}_${func.name}`,
            description: func.description,
            parameters: func.parameters as OpenAI.FunctionParameters,
          }
        }))
      ],
      responseFormat: [
        ...acc.responseFormat,
        ...tool.functions.map(func => ({
          function_name: `${tool.connector.connector_name}_${func.name}`,
          json_schema: func.response_schema as OpenAI.ResponseFormatJSONSchema
        }))
      ]
    }), { aiTools: [], responseFormat: [] }) ?? { aiTools: [], responseFormat: [] };

    const fullMessages = [
      { role: "system", content: systemPrompt || "" },
      ...messages
    ];
    const completion = await openai.chat.completions.create({
      messages: fullMessages as ChatCompletionMessageParam[],
      model: model || "gpt-4o-mini",
      tools: aiTools,
      tool_choice: "auto",
    });

    const message = completion.choices[0]?.message;

    // Handle function calls if present
    if (message?.tool_calls) {
      const results = await Promise.all(
        message.tool_calls.map(async tool_call => {
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
      if (results.length !== message.tool_calls.length) {
        throw new Error('Mismatch between tool_calls and results');
      }

      // Get a new completion with the function results
      const newCompletion = await openai.chat.completions.create({
        messages: [...messages, message, ...results] as ChatCompletionMessageParam[],
        model: model || "gpt-4o-mini",
        response_format: responseFormat.find(rf => rf.function_name === message.tool_calls?.[0].function.name)?.json_schema as OpenAI.ResponseFormatJSONSchema
      });

      return {
        content: newCompletion.choices[0]?.message?.content || '',
        role: newCompletion.choices[0]?.message?.role || 'assistant',
      };
    }

    return {
      content: message?.content || '',
      role: message?.role || 'assistant',
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
        connector_name: "google-sheets",
        connector_display_name: "Google Sheets",
        is_connected: true
      },
      functions: [
        {
          name: "read_sheet",
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
          name: "update_sheet",
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

async function executeFunctionCall(
  functionName: string,
  args: Record<string, unknown>,
  userId?: string
) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const {data, error} = await getKey(userId!);
    if (!data || !data.api_key) {
      throw new Error(error?.message || "No valid credentials. User must authorize first.");
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': data.api_key
    };
    
    if (functionName === 'google-sheets_read_sheet') {
      const url = new URL(`${baseUrl}/api/connectors`);
      url.searchParams.set('spreadsheetId', args.spreadsheetId as string);
      url.searchParams.set('range', args.range as string);
      if (userId) {
        url.searchParams.set('userId', userId);
      }
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to read sheet: ${errorText}`);
      }
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.values;
    }
    
    if (functionName === 'google-sheets_update_sheet') {
      const response = await fetch(`${baseUrl}/api/connectors`, {
        method: 'POST',
        headers,
        cache: 'no-store',
        body: JSON.stringify({
          spreadsheetId: args.spreadsheetId,
          range: args.range,
          values: args.values,
          userId: userId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update sheet: ${errorText}`);
      }

      const updateData = await response.json();
      if (updateData.error) throw new Error(updateData.error);
      return updateData.result;
    }

    throw new Error(`Unknown function: ${functionName}`);
  } catch (error) {
    console.error(`Error executing ${functionName}:`, error);
    throw error;
  }
} 