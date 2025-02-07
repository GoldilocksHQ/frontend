import { History } from "lucide-react";
import { useState, useRef, useEffect, memo, useCallback, useMemo } from "react";
import { Interaction, Message, MessageRole } from "@/lib/core/thread";
import { InteractionHistory } from "./interaction-history";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";
import { AgentManager } from "@/lib/managers/agent-manager";
import { Virtuoso } from "react-virtuoso";

interface ChatInterfaceProps {
  interfaceMessages: Message[];
  fullInteractionHistory: Interaction[];
  input: string;
  setInput: (input: string) => void;
  isWorking: boolean;
  workingStatus: string[];
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

  const processMessageContent = useCallback((content: string) => {
    return content
      .trim()
      .replace(/^"|"$/g, '')
      .replace(/\\n/g, '<br/>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\\"/g, '"');
  }, []);

  // Memoize scroll callback
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [interfaceMessages, isWorking, workingStatus]);

  // Memoize message component
  const MessageItem = memo(({ message }: { message: Message }) => {
    const processedContent = useMemo(
      () => processMessageContent(message.content || ''),
      [message.content, processMessageContent]
    );

    return (
      <div
        className={cn(
          "flex pb-2",
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
          <div 
            className="whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        </div>
      </div>
    );
  });
  MessageItem.displayName = "MessageItem";

  // Extract status indicator to memoized component
  const StatusIndicator = memo(({ workingStatus }: { workingStatus: string[] }) => (
    <div className="flex justify-start">
      <div className="max-w-[80%] space-y-1 text-xs text-muted-foreground">
        {workingStatus.map((status, index) => (
          <div 
            key={index}
            className="flex items-center gap-2 animate-fade-in-up"
            style={{ transitionDelay: `${index * 50}ms` }}
          >
            {index === workingStatus.length - 1 && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            <div className="opacity-75">{status}</div>
          </div>
        ))}
      </div>
    </div>
  ));
  StatusIndicator.displayName = "StatusIndicator";

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 w-full max-w-[calc(100vw-15rem)]">
        <Virtuoso
          data={interfaceMessages}
          initialTopMostItemIndex={interfaceMessages.length - 1}
          itemContent={(index, message) => <MessageItem message={message} />}
          overscan={500}  // Adjust based on typical message height
          increaseViewportBy={{ top: 200, bottom: 200 }}
          components={{ 
            Footer: memo(function FooterComponent() {
              return (
                <div className="pt-2">
                  {isWorking && <StatusIndicator workingStatus={workingStatus} />}
                  <div ref={messagesEndRef} />
                </div>
              );
            })
          }}
        />
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
