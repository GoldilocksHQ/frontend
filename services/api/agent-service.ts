import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { googleSheetsToolDefinition, googleDriveToolDefinition, googleDocsToolDefinition } from '@/connectors/function-schema';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ToolDefinition {
  connectorName: string;
  functions: {
    name: string;
    description: string;
    parameters: object;
    responseSchema: object;
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
          // Add validation for function name format
          const functionNameParts = tool_call.function.name.split('_');
          if (functionNameParts.length !== 2) {
            throw new Error(`Invalid function name format: ${tool_call.function.name}. Expected format: connectorName_functionName`);
          }
          
          const [connectorName, functionName] = functionNameParts;
          if (!connectorName || !functionName) {
            throw new Error(`Invalid function name parts: connector=${connectorName}, function=${functionName}`);
          }

          const functionArgs = JSON.parse(tool_call.function.arguments);
          
          // Execute the function call
          const result = await executeFunctionCall(connectorName, functionName, functionArgs, userId);

          // Check if result is valid
          if (!result) {
            throw new Error(`No result returned for function call: ${functionName}`);
          }
          
          // Add the function response to messages
          return {
            role: "tool" as const,
            tool_call_id: tool_call.id,
            name: tool_call.function.name,
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

async function getToolDefinitions(connectorNames: string[]): Promise<ToolDefinition[]> {
  return connectorNames.map(connectorName => {
    switch (connectorName) {
      case 'google-sheets':
        return googleSheetsToolDefinition;
      case 'google-drive':
        return googleDriveToolDefinition;
      case 'google-docs':
        return googleDocsToolDefinition;
      default:
        throw new Error(`Unknown connector: ${connectorName}`);
    }
  });
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
          name: `${tool.connectorName}_${func.name}`,
          description: func.description,
          parameters: func.parameters as OpenAI.FunctionParameters,
        }
      }))
    ],
    responseFormat: [
      ...acc.responseFormat,
      ...tool.functions.map(func => ({
        function_name: `${tool.connectorName}_${func.name}`,
        json_schema: func.responseSchema as OpenAI.ResponseFormatJSONSchema
      }))
    ]
  }), { agentTools: [], responseFormat: [] }) ?? { agentTools: [], responseFormat: [] };

  return {agentTools, responseFormat};
}

async function executeFunctionCall(
  connectorName: string,
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
    
    const response = await fetch(`${baseUrl}/api/connectors`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        connector: connectorName,
        function: functionName,
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
    console.error(`Error executing ${connectorName}_${functionName}:`, error);
    throw error;
  }
} 