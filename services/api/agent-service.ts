import OpenAI from 'openai';
import { ChatCompletionCreateParamsNonStreaming, ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { googleSheetsToolDefinition } from '@/connectors/google-sheets/function-schema';
import { googleDriveToolDefinition } from '@/connectors/google-drive/function-schema';
import { googleDocsToolDefinition } from '@/connectors/google-docs/function-schema';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Custom error class for API errors
export class APIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export interface ToolDefinition {
  connectorName: string;
  functions: {
    name: string;
    description: string;
    parameters: object;
    responseSchema: object;
  }[];
}

interface ChatMessage {
  role: string;
  content: string;
}

interface ToolCallResult {
  role: "tool";
  tool_call_id: string;
  name: string;
  content: string;
}


export async function handleChatCompletion(
  model: string,
  messages: ChatMessage[],
  systemPrompt?: string,
  selectedTools?: string[],
  firstResponseFormat?: OpenAI.ResponseFormatJSONSchema,
  userId?: string
): Promise<ChatMessage> {
  try {
    // Input validation
    if (!model) {
      throw new APIError('Model is required', 400);
    }

    if (!messages || messages.length === 0) {
      throw new APIError('Messages array is required and cannot be empty', 400);
    }
    
    // Prepare messages and parameters
    const fullMessages = [
      { role: "system", content: systemPrompt || "" },
      ...messages
    ];
    
    const agentParams: ChatCompletionCreateParamsNonStreaming = {
      model: model || "gpt-4o-mini",
      messages: fullMessages as ChatCompletionMessageParam[],
    };

    // Set up tools if provided
    let toolsResponseFormat: { functionName: string; jsonSchema: OpenAI.ResponseFormatJSONSchema }[] = [];
    if (selectedTools?.length) {
      const { agentTools, toolsResponseFormat: responseFormat } = await setupTools(selectedTools);
      agentParams.tools = agentTools;
      agentParams.tool_choice = "auto";
      toolsResponseFormat = responseFormat;
    }

    if (firstResponseFormat) {
      agentParams.response_format = firstResponseFormat;
    }

    // Get initial completion
    const firstResponse = await getInitialCompletion(agentParams);

    // Handle function calls if present
    if (firstResponse.tool_calls) {
      const results = await processToolCalls(firstResponse, userId);
      return getSecondCompletion(messages, firstResponse, results, model, toolsResponseFormat);
    }

    // Return the first response if no tool calls are present
    return {
      content: firstResponse.content || '',
      role: firstResponse.role || 'assistant',
    };

  } catch (error) {
    console.error('Error in chat completion:', error);
    if (error instanceof APIError) throw error;
    throw new APIError(
      'Chat completion failed',
      500,
      { error }
    );
  }
}

async function validateAndParseFunctionCall(
  tool_call: OpenAI.ChatCompletionMessageToolCall,
  userId?: string
): Promise<ToolCallResult> {
  const functionNameParts = tool_call.function.name.split('_');
  if (functionNameParts.length !== 2) {
    throw new APIError(
      `Invalid function name format: ${tool_call.function.name}`,
      400,
      { expectedFormat: 'connectorName_functionName' }
    );
  }
  
  const [connectorName, functionName] = functionNameParts;
  if (!connectorName || !functionName) {
    throw new APIError(
      'Invalid function name parts',
      400,
      { connector: connectorName, function: functionName }
    );
  }

  let functionArgs;
  try {
    functionArgs = JSON.parse(tool_call.function.arguments);
  } catch {
    throw new APIError(
      'Invalid function arguments JSON',
      400,
      { arguments: tool_call.function.arguments }
    );
  }
  
  // Execute the function call
  const result = await executeFunctionCall(connectorName, functionName, functionArgs, userId);
  if (result instanceof Error) {
    throw new APIError(
      `Function execution failed: ${result.message}`,
      500,
      { connectorName, functionName }
    );
  }

  if (!result) {
    throw new APIError(
      `No result returned for function call: ${functionName}`,
      500,
      { connectorName, functionName }
    );
  }
  
  return {
    role: "tool",
    tool_call_id: tool_call.id,
    name: tool_call.function.name,
    content: JSON.stringify(result)
  };
}

async function processToolCalls(
  firstResponse: OpenAI.ChatCompletionMessage,
  userId?: string
): Promise<ToolCallResult[]> {
  if (!firstResponse.tool_calls) {
    throw new APIError('No tool calls found in response', 400);
  }

  const results = await Promise.all(
    firstResponse.tool_calls.map(tool_call => 
      validateAndParseFunctionCall(tool_call, userId)
    )
  );

  if (results.length !== firstResponse.tool_calls.length) {
    throw new APIError(
      'Mismatch between tool_calls and results',
      500,
      { expected: firstResponse.tool_calls.length, received: results.length }
    );
  }

  return results;
}

async function getInitialCompletion(
  agentParams: ChatCompletionCreateParamsNonStreaming
): Promise<OpenAI.ChatCompletionMessage> {
  const completion = await openai.chat.completions.create(agentParams).catch(error => {
    throw new APIError(
      'OpenAI API request failed',
      error.status || 500,
      { error: error.message, model: agentParams.model }
    );
  });

  const firstResponse = completion.choices[0]?.message;
  if (!firstResponse) {
    throw new APIError('No response received from OpenAI', 500);
  }

  return firstResponse;
}

async function getSecondCompletion(
  messages: ChatMessage[],
  firstResponse: OpenAI.ChatCompletionMessage,
  results: ToolCallResult[],
  model: string,
  toolsResponseFormat: { functionName: string; jsonSchema: OpenAI.ResponseFormatJSONSchema }[]
): Promise<ChatMessage> {
  const secondResponse = await openai.chat.completions.create({
    messages: [...messages, firstResponse, ...results] as ChatCompletionMessageParam[],
    model: model || "gpt-4o-mini",
    response_format: toolsResponseFormat.find((rf: { functionName: string }) => 
      rf.functionName === firstResponse.tool_calls?.[0].function.name
    )?.jsonSchema as OpenAI.ResponseFormatJSONSchema
  }).catch(error => {
    throw new APIError(
      'Second OpenAI API request failed',
      error.status || 500,
      { error: error.message, model }
    );
  });

  if (!secondResponse.choices[0]?.message) {
    throw new APIError('No response received from second OpenAI call', 500);
  }

  return {
    content: secondResponse.choices[0].message.content || '',
    role: secondResponse.choices[0].message.role || 'assistant',
  };
}

async function setupTools(selectedTools: string[]): Promise<{
  agentTools: ChatCompletionTool[];
  toolsResponseFormat: { functionName: string; jsonSchema: OpenAI.ResponseFormatJSONSchema }[];
}> {
  try {
    const tools = await getToolDefinitions(selectedTools);
    const { agentTools, responseFormat } = await setUpTools(tools);
    return { agentTools, toolsResponseFormat: responseFormat };
  } catch (error) {
    throw new APIError(
      'Failed to set up tools',
      500,
      { error, selectedTools }
    );
  }
}

async function getToolDefinitions(connectorNames: string[]): Promise<ToolDefinition[]> {
  try {
    return connectorNames.map(connectorName => {
      switch (connectorName) {
        case 'google-sheets':
          return googleSheetsToolDefinition;
        case 'google-drive':
          return googleDriveToolDefinition;
        case 'google-docs':
          return googleDocsToolDefinition;
        default:
          throw new APIError(
            `Unknown connector: ${connectorName}`,
            400,
            { availableConnectors: ['google-sheets', 'google-drive', 'google-docs'] }
          );
      }
    });
  } catch (error) {
    if (error instanceof APIError) throw error;
    throw new APIError(
      'Failed to get tool definitions',
      500,
      { error, connectorNames }
    );
  }
}

async function setUpTools(tools: ToolDefinition[]) {
  try {
    const { agentTools, responseFormat } = tools?.reduce<{
      agentTools: ChatCompletionTool[];
      responseFormat: { functionName: string; jsonSchema: OpenAI.ResponseFormatJSONSchema }[];
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
          functionName: `${tool.connectorName}_${func.name}`,
          jsonSchema: func.responseSchema as OpenAI.ResponseFormatJSONSchema
        }))
      ]
    }), { agentTools: [], responseFormat: [] }) ?? { agentTools: [], responseFormat: [] };

    if (!agentTools.length) {
      throw new APIError('No tools were generated', 500);
    }

    return { agentTools, responseFormat };
  } catch (error) {
    if (error instanceof APIError) throw error;
    throw new APIError(
      'Failed to set up tools',
      500,
      { error, tools }
    );
  }
}

async function executeFunctionCall(
  connectorName: string,
  functionName: string,
  args: Record<string, unknown>,
  userId?: string
) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    if (!process.env.GODILOCKS_API_KEY) {
      throw new APIError('API key is not configured', 500);
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': process.env.GODILOCKS_API_KEY
    };
    
    // Add timeout and better error handling for fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const response = await fetch(`${baseUrl}/api/connectors`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          connector: connectorName,
          function: functionName,
          arguments: args,
          userId
        }),
        signal: controller.signal,
        // Add fetch options to help with timeout issues
        cache: 'no-store',
        keepalive: true
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Failed to read error response');
        throw new APIError(
          `Function execution failed: ${errorText}`,
          response.status,
          { connectorName, functionName, status: response.status }
        );
      }

      const data = await response.json().catch(() => ({ error: 'Failed to parse response JSON' }));
      if (data.error) {
        throw new APIError(
          data.error,
          500,
          { connectorName, functionName }
        );
      }
      
      return data.result;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error(`Error executing ${connectorName}_${functionName}:`, error);
    
    // Handle specific error types
    if (error instanceof APIError) return error;
    
    // Type guard for Error objects
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new APIError(
          'Request timed out',
          504,
          { connectorName, functionName }
        );
      }
      
      if ('code' in error && error.code === 'UND_ERR_HEADERS_TIMEOUT') {
        return new APIError(
          'Headers timeout',
          504,
          { connectorName, functionName }
        );
      }

      return new APIError(
        `Function execution failed: ${error.message}`,
        500,
        { error: error.message, connectorName, functionName }
      );
    }
    
    // Fallback for unknown error types
    return new APIError(
      'Function execution failed: Unknown error',
      500,
      { connectorName, functionName }
    );
  }
} 