import { useRef, useEffect } from "react";
import { Message } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  messages: Message[];
  input: string;
  setInput: (input: string) => void;
  isWorking: boolean;
  workingStatus: string;
  onSendMessage: (message: string) => Promise<void>;
}

export function ChatInterface({
  messages,
  input,
  setInput,
  isWorking,
  workingStatus,
  onSendMessage
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isWorking]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-2",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
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
          <Button 
            type="submit" 
            disabled={!input.trim() || isWorking}
            className="text-sm"
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
} 