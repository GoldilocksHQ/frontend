import { History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useRef, useEffect } from "react";
import { Interaction, InteractionType, Judgement, Message, MessageRole, Plan, Task, ToolCall } from "@/lib/core/thread";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

interface ChatInterfaceProps {
  interfaceMessages: Message[];
  fullInteractionHistory: Interaction[];
  input: string;
  setInput: (input: string) => void;
  isWorking: boolean;
  workingStatus: string;
  onSendMessage: (message: string) => Promise<void>;
}

const formatTaskOutput = (content: string) => {
  if (!content.includes('Completed Task')) return content;

  const tasks = content.split('\nCompleted Task').filter(Boolean);
  return (
    <div className="space-y-4">
      {tasks.map((task, index) => {
        const [taskDescription, outputStr] = task.split(' - Output: ');
        try {
          const output = JSON.parse(outputStr);
          return (
            <div key={index} className="border-l-2 border-slate-200 pl-4">
              <div className="font-medium text-slate-700">
                {index === 0 ? taskDescription : `Completed Task${taskDescription}`}
              </div>
              {output.type === 'tool_call' && (
                <div className="mt-2 space-y-2">
                  <div className="text-sm text-slate-600">
                    Tool: {output.toolName}.{output.functionName}
                  </div>
                  <pre className="text-xs bg-slate-50 p-2 rounded-md overflow-x-auto">
                    {JSON.stringify(JSON.parse(output.result), null, 2)}
                  </pre>
                </div>
              )}
              {output.type === 'message' && (
                <div className="mt-2 text-sm text-slate-600">
                  {output.content}
                </div>
              )}
            </div>
          );
        } catch {
          return (
            <div key={index} className="border-l-2 border-slate-200 pl-4">
              <div className="font-medium text-slate-700">
                {index === 0 ? taskDescription : `Completed Task${taskDescription}`}
              </div>
              <div className="mt-2 text-sm text-slate-600">{outputStr}</div>
            </div>
          );
        }
      })}
    </div>
  );
};

const formatInteractionContent = (interaction: Interaction) => {
  try {
    const content = (() => {
      if (interaction.error) {
        return interaction.error;
      }

      switch (interaction.type) {
        case InteractionType.MESSAGE:
          try {
            const messageContent = (interaction as Message).content;
            if (messageContent.includes('Completed Task')) {
              return formatTaskOutput(messageContent);
            }
            const parsed = JSON.parse(messageContent);
            return parsed;
          } catch {
            return (interaction as Message).content;
          }
        case InteractionType.TASK:
          return {
            instruction: (interaction as Task).instruction,
            status: (interaction as Task).status,
            result: (interaction as Task).result
          };
        case InteractionType.PLAN:
          return {
            goal: (interaction as Plan).goal,
            tasks: (interaction as Plan).tasks.map((task: Task) => ({
              step: task.step,
              instruction: task.instruction,
              targetAgentId: task.targetAgentId,
              status: task.status,
              error: task.error,
              result: task.result,
              dependencies: task.dependencies
            })),
            reasoning: (interaction as Plan).reasoning
          };
        case InteractionType.JUDGEMENT:
          return {
            satisfied: (interaction as Judgement).satisfied,
            score: (interaction as Judgement).score,
            analysis: (interaction as Judgement).analysis,
            feedback: (interaction as Judgement).feedback
          };
        case InteractionType.TOOL_CALL:
          const toolCall = interaction as ToolCall;
          return {
            tool: toolCall.toolName,
            function: toolCall.functionName,
            parameters: toolCall.parameters,
            result: typeof toolCall.result === 'string' 
              ? JSON.parse(toolCall.result)
              : toolCall.result
          };
        default:
          return interaction;
      }
    })();

    if (React.isValidElement(content)) {
      return content;
    }

    if (typeof content === 'string') {
      return content;
    }

    const formattedJson = JSON.stringify(content, null, 2)
      .replace(/[{]/g, '<span class="text-slate-600">{</span>')
      .replace(/[}]/g, '<span class="text-slate-600">}</span>')
      .replace(/[[\]]/g, (match) => `<span class="text-slate-600">${match}</span>`)
      .replace(/"([^"]+)":/g, '<span class="text-indigo-600">"$1"</span>:')
      .replace(/: "([^"]+)"/g, ': <span class="text-emerald-600">"$1"</span>')
      .replace(/: (true|false|null|\d+)/g, ': <span class="text-amber-600">$1</span>');

    return <div dangerouslySetInnerHTML={{ __html: formattedJson }} />;
  } catch (error) {
    return `Error formatting content: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

export function ChatInterface({
  interfaceMessages,
  fullInteractionHistory,
  input,
  setInput,
  isWorking,
  workingStatus,
  onSendMessage,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [interfaceMessages, isWorking]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 w-full max-w-[calc(100vw-15rem)]">
        {interfaceMessages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === MessageRole.USER ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] w-fit rounded-lg px-4 py-2 overflow-x-auto break-words text-sm",
                message.role === MessageRole.USER
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {formatInteractionContent(message)}
            </div>
          </div>
        ))}
        {isWorking && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 max-w-[80%] rounded-lg px-4 py-2 bg-muted text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>{workingStatus || "Thinking..."}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && !isWorking) {
              onSendMessage(input);
            }
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isWorking}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIsHistoryOpen(true)}
              disabled={isWorking}
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              type="submit"
              disabled={!input.trim() || isWorking}
              className="text-sm"
            >
              Send
            </Button>
          </div>
        </form>

        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent className="max-w-[60vw] max-h-[80vh] overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>Interaction History</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {fullInteractionHistory.map((interaction) => (
                <div
                  key={interaction.id}
                  className="bg-muted/50 p-4 rounded-lg space-y-2 max-w-[calc(60vw-3rem)]"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {interaction.sourceAgentId ? "Assistant" : "You"} 
                        {"->"}
                        {interaction.targetAgentId ? "Assistant" : "You"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Type: {interaction.type}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(interaction.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm font-mono whitespace-pre-wrap break-words overflow-x-auto bg-background/50 p-2 rounded">
                    {formatInteractionContent(interaction)}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}