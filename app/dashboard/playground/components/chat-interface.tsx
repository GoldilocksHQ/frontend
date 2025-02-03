import { History } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Interaction, Message, MessageRole } from "@/lib/core/thread";
import { InteractionHistory } from "./interaction-history";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";
import { AgentManager } from "@/lib/managers/agent-manager";

interface ChatInterfaceProps {
  interfaceMessages: Message[];
  fullInteractionHistory: Interaction[];
  input: string;
  setInput: (input: string) => void;
  isWorking: boolean;
  workingStatus: string;
  onSendMessage: (message: string) => Promise<void>;
  agentManager: AgentManager;
}

export function ChatInterface({
  interfaceMessages,
  fullInteractionHistory,
  input,
  setInput,
  isWorking,
  workingStatus,
  onSendMessage,
  agentManager,
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
              {message.content}
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

        <InteractionHistory
          fullInteractionHistory={fullInteractionHistory}
          agentManager={agentManager}
          isHistoryOpen={isHistoryOpen}
          setIsHistoryOpen={() => setIsHistoryOpen(false)}
        />
      </div>
    </div>
  );
}