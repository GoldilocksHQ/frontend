import { useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, ArrowLeft, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Agent } from "@/lib/agent-manager";

interface ChatInterfaceProps {
  selectedAgent: Agent;
  messages: { role: string; content: string }[];
  input: string;
  setInput: (input: string) => void;
  isWorking: boolean;
  workingStatus: string;
  onSend: () => void;
  onClearMessages: () => void;
  onBack: () => void;
}

export function ChatInterface({
  selectedAgent,
  messages,
  input,
  setInput,
  isWorking,
  workingStatus,
  onSend,
  onClearMessages,
  onBack,
}: ChatInterfaceProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleNewline = (currentInput: string): string => {
    return currentInput + "\n";
  };

  return (
    <Card className="flex-1 min-w-0 flex flex-col">
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <CardTitle>Chat with {selectedAgent.agentName}</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearMessages}
              title="Clear messages"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col py-4">
        <ScrollArea className="flex-1 w-full" ref={scrollAreaRef} >
          <div className="flex flex-col space-y-4 w-full">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex w-full
                  ${message.role === "user" ? "justify-end" : "justify-start"}
                `}
              >
                <div 
                  className={`flex items-start gap-3 w-[calc(100%-3rem)]
                    ${message.role === "user" ? "flex-row-reverse" : "flex-row"}
                  `}
                >
                  <div className="flex-none">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {message.role === "user" ? "U" : "A"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div
                    className={`min-w-0 p-3 rounded-lg ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <div className="prose dark:prose-invert max-w-none break-words">
                      <ReactMarkdown className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isWorking && (
              <div className="flex w-full justify-start">
                <div className="flex items-start gap-3 w-[calc(100%-3rem)]" style={{ maxWidth: "600px" }}>
                  <div className="flex-none">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>A</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="min-w-0 p-3 rounded-lg bg-muted">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <p className="text-sm">{workingStatus}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="flex items-center gap-2 mt-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here... (Press Ctrl+Enter to send)"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                onSend();
              } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                setInput(handleNewline(input));
              }
            }}
            className="min-h-[60px] max-h-[120px] resize-none flex-1"
            rows={3}
          />
          <Button className="flex-shrink-0" onClick={onSend}>Send</Button>
        </div>
      </CardContent>
    </Card>
  );
} 