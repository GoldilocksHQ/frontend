import { History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useRef, useEffect } from "react";
import { Interaction, InteractionType, Judgement, Message, MessageRole, Plan, Task, ToolCall } from "@/lib/core/thread";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  interfaceMessages: Message[];
  fullInteractionHistory: Interaction[];
  input: string;
  setInput: (input: string) => void;
  isWorking: boolean;
  workingStatus: string;
  onSendMessage: (message: string) => Promise<void>;
}

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
              message.role === MessageRole.USER
                ? "justify-end"
                : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] w-fit rounded-lg px-4 py-2 overflow-x-auto",
                message.role === MessageRole.USER
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              <p className="whitespace-pre-line break-words text-sm max-w-full">
                {message.content}
              </p>
            </div>
          </div>
        ))}
        {isWorking && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 max-w-[80%] rounded-lg px-4 py-2 bg-muted text-sm text-muted-foreground">
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
                        {interaction.sourceAgentId
                          ? "Assistant"
                          : "You"} 
                        {"->"}
                        {interaction.targetAgentId
                          ? "Assistant"
                          : "You"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Type: {interaction.type}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(interaction.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-line break-words">
                    {interaction.type === InteractionType.MESSAGE ? (interaction as Message).content : ""}
                    {interaction.type === InteractionType.TASK ? `Task: ${JSON.stringify((interaction as Task).instruction)}` : ""}
                    {interaction.type === InteractionType.PLAN ? `Plan: ${JSON.stringify((interaction as Plan).goal)}\nTasks: ${JSON.stringify((interaction as Plan).tasks)}` : ""}
                    {interaction.type === InteractionType.JUDGEMENT ? `Judgement: ${JSON.stringify((interaction as Judgement).satisfied)}` : ""}
                    {interaction.type === InteractionType.TOOL_CALL ? `Tool Call: ${JSON.stringify((interaction as ToolCall).toolName)}\nFunction Name: ${JSON.stringify((interaction as ToolCall).functionName)}\nParameters: ${JSON.stringify((interaction as ToolCall).parameters)}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
