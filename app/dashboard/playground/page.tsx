"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AIModel, modelOptions } from "@/lib/ai-models"
import { UserMappedConnector } from "@/lib/types";
import { ConnectorManager } from "@/lib/connector-manager";
import { getUser } from "@/services/supabase/server";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";

export default function PlaygroundPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [connectors, setConnectors] = useState<UserMappedConnector[]>([]);
  const [selectedModelValue, setSelectedModel] = useState(modelOptions[0].value);
  const [selectedConnectors, setSelectedConnectors] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [aiModel] = useState(() => new AIModel(modelOptions[0].value));
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConnectors();
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    aiModel.selectModel(selectedModelValue);
    aiModel.setTools(selectedConnectors);
  }, [selectedModelValue, selectedConnectors, aiModel]);

  const fetchConnectors = async () => {
    try {
      const user = await getUser();
      if (!user) throw new Error("User not found");
      
      const connectorManager = new ConnectorManager(user.id);
      const fetchedConnectors = await connectorManager.getConnectors();
      setConnectors(fetchedConnectors);
    } catch (error) {
      console.error('Failed to fetch connectors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleConnector = (connectorId: string) => {
    setSelectedConnectors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(connectorId)) {
        newSet.delete(connectorId);
      } else {
        newSet.add(connectorId);
      }
      return newSet;
    });
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = { role: "user", content: input };
    const currentMessages = [...messages, userMessage];

    setMessages(currentMessages);
    setInput("");
    try {
      const response = await aiModel.chat(currentMessages as ChatCompletionMessageParam[]);
      setMessages([...currentMessages, { 
        role: response.role, 
        content: response.content 
      }]);
    } catch (error) {
      console.error(error);
    }
  };

  const activatedConnectors = connectors.filter(c => c.is_connected);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-playfair">AI Chat</h2>
      </div>
      <div className="flex gap-4">
        {/* Sidebar */}
        <Card className="w-64 h-[750px] flex flex-col">
          <CardHeader>
            <CardTitle className="font-playfair text-lg">Settings</CardTitle>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">AI Model</label>
                <Select value={selectedModelValue} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Active Connectors</label>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {loading ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : activatedConnectors.length === 0 ? (
                      <div className="text-sm text-muted-foreground p-2 text-center">
                        No active connectors
                      </div>
                    ) : (
                      activatedConnectors.map((connector) => (
                        <button
                          key={connector.id}
                          onClick={() => handleToggleConnector(connector.id)}
                          className={`w-full flex items-center p-2 rounded-lg transition-colors
                            ${selectedConnectors.has(connector.id) 
                              ? 'bg-primary/10 text-primary' 
                              : 'hover:bg-muted'
                            }`}
                        >
                          <Image 
                            src={`/logos/${connector.connector_name}.svg`}
                            alt={connector.connector_display_name}
                            className="mr-2"
                            width={20}
                            height={20}
                          />
                          <span className="text-sm truncate">
                            {connector.connector_display_name}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 h-[750px] flex flex-col">
          <CardHeader>
            <CardTitle className="font-playfair">Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col h-full overflow-hidden">
            <ScrollArea className="flex-1 pr-4 h-[calc(100%-60px)]" ref={scrollAreaRef}>
              <div className="flex flex-col space-y-4">
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                    <div className={`flex items-start ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>{message.role === 'user' ? 'U' : 'AI'}</AvatarFallback>
                      </Avatar>
                      <div className={`mx-2 p-3 rounded-lg ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <p className="text-sm font-roboto">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex items-center space-x-2 mt-4">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message here..."
                onKeyUp={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1 font-roboto"
              />
              <Button onClick={handleSend}>Send</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}