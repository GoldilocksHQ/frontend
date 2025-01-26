import { ArrowLeft, Loader2, History, RefreshCw } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { AgentManager } from "@/lib/agent-manager";
import { AgentError } from "@/lib/error-tracker";
import { MessageType, Thread, TaskList, Task, Message } from "@/lib/types";
import type { Agent } from "@/lib/agent-manager";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useRef, useState, useEffect } from "react";

interface ChatInterfaceProps {
  selectedAgent: Agent | null;
  agentManager: AgentManager | null;
  errors: AgentError[];
  currentThread: Thread | null;
  historicMessages: Message[];
  input: string;
  setInput: (input: string) => void;
  isWorking: boolean;
  workingStatus: string;
  onSend: (input: string) => Promise<void>;
  onClearMessages: () => void;
  onBack: () => void;
  onError: (error: string, context?: string) => void;
  onClearErrors: () => void;
}

export function ChatInterface({
  selectedAgent,
  errors: agentErrors,
  currentThread,
  historicMessages,
  input,
  setInput,
  isWorking,
  workingStatus,
  onSend,
  onClearMessages,
  onBack,
}: ChatInterfaceProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [activitiesOpen, setActivitiesOpen] = useState(false);

  // Update scroll position when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [currentThread?.messages]);

  const handleNewline = (currentInput: string): string => {
    if (currentInput.length === 0) return currentInput;
    return currentInput + "\n";
  };

  const renderTaskChain = (taskChain: TaskList) => (
    <div className="space-y-2">
      <div className="font-medium text-sm text-muted-foreground">
        Task Chain {taskChain.id}
      </div>
      {taskChain.tasks.map((task: Task, i: number) => (
        <div key={i} className="pl-4 border-l-2 border-muted">
          <div className="text-sm">
            <span className="font-medium">Task {i + 1}:</span> {task.instruction}
          </div>
          {task.result && (
            <div className="mt-1 text-sm text-muted-foreground">
              Result: {task.result}
            </div>
          )}
          {task.error && (
            <div className="mt-1 text-sm text-destructive">
              Error: {task.error}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Card className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <CardTitle>Chat with {selectedAgent?.agentName}</CardTitle>
          <div className="flex gap-2">
            <Dialog open={activitiesOpen} onOpenChange={setActivitiesOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <History className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Activities</DialogTitle>
                  <DialogDescription>
                    View all conversations and task chains
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="messages" className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="messages">Messages</TabsTrigger>
                    <TabsTrigger value="tasks">Task Chains</TabsTrigger>
                    <TabsTrigger value="errors">Errors</TabsTrigger>
                  </TabsList>
                  <div className="mt-4">
                    <TabsContent value="messages" className="mt-0 space-y-4">
                      {historicMessages.concat(currentThread?.messages || []).map((message: Message, i: number) => (
                        <div key={`history-${message.id}-${i}`} className="p-4 rounded-lg bg-muted">
                          <div className="font-medium text-sm mb-2 text-muted-foreground flex items-center justify-between">
                            <span>
                              {message.messageType === MessageType.SYSTEM && "System Prompt"}
                              {message.messageType === MessageType.AGENT_TO_USER && `From: ${selectedAgent?.agentName} to User`}
                              {message.messageType === MessageType.USER_TO_AGENT && "From: User"}
                              {message.messageType === MessageType.AGENT_TO_AGENT && 
                                `From: ${message.sourceAgentId === selectedAgent?.id ? selectedAgent?.agentName : message.sourceAgentId} to ${message.targetAgentId === selectedAgent?.id ? selectedAgent?.agentName : message.targetAgentId}`
                              }
                            </span>
                            <span className="text-xs opacity-50">
                              {new Date(message.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <ReactMarkdown className="text-sm">{message.content}</ReactMarkdown>
                        </div>
                      ))}
                    </TabsContent>
                    <TabsContent value="tasks" className="mt-0 space-y-4">
                      {currentThread?.taskLists.map((taskChain, i) => (
                        <div key={`task-${taskChain.id}-${i}`} className="p-4 rounded-lg bg-muted">
                          {renderTaskChain(taskChain)}
                        </div>
                      ))}
                    </TabsContent>
                    <TabsContent value="errors" className="mt-0 space-y-4">
                      {agentErrors.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          No errors recorded
                        </div>
                      ) : (
                        agentErrors.map((error, i) => (
                          <div key={`error-${i}-${error.timestamp}`} className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                            <div className="font-medium text-sm mb-2 flex items-center justify-between">
                              <span className="text-destructive">Error</span>
                              <span className="text-xs opacity-50">
                                {new Date(error.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-sm">{error.message}</div>
                            {error.context && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                <pre className="whitespace-pre-wrap">
                                  {typeof error.context === 'string' 
                                    ? error.context 
                                    : JSON.stringify(error.context, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" onClick={onClearMessages}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 py-4">
        <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4">
          <div className="space-y-4">
            {historicMessages.concat(currentThread?.messages || []).map((message, i) => (
              <div key={`chat-${message.id}-${i}`} className={`flex items-start gap-3 ${message.role === "assistant" ? "flex-row" : "flex-row-reverse"}`}>
                <Avatar className="mt-1 flex-shrink-0">
                  <AvatarFallback>{message.role === "assistant" ? "AI" : "U"}</AvatarFallback>
                </Avatar>
                <div className={`flex flex-col ${message.role === "assistant" ? "items-start" : "items-end"} max-w-[85%]`}>
                  <div className={`rounded-lg p-3 overflow-hidden ${
                    message.role === "assistant" 
                      ? "bg-muted text-foreground" 
                      : "bg-primary text-primary-foreground"
                  }`}>
                    <ReactMarkdown className="prose prose-xs max-w-none text-sm break-words whitespace-pre-wrap [&_p]:m-0 [&_p:not(:first-child)]:mt-4 [&_pre]:my-3 [&_pre]:bg-background/50 [&_pre]:p-2 [&_pre]:rounded [&_code]:text-foreground">
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {isWorking && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{workingStatus}</span>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="pt-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isWorking && input.trim()) onSend(input);
                } else if (e.key === "Enter" && e.shiftKey) {
                  e.preventDefault();
                  setInput(handleNewline(input));
                }
              }}
              placeholder="Type a message..."
              className="min-h-[80px] flex-1 resize-none"
            />
            <Button 
              onClick={() => onSend(input)} 
              disabled={isWorking || !input.trim()}
              className="self-center"
            >
              {isWorking ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 