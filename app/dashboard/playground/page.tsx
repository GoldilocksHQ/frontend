"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AIModel, ChatResponse } from "../../../lib/aiModel"
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const aiModels = [
  { value: "o1-mini", label: "o1-mini", provider: "OpenAI" },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { value: 'gpt-4', label: 'GPT-4', provider: 'OpenAI' },
  { value: 'claude-2', label: 'Claude 2', provider: 'Claude' },
]

export default function PlaygroundPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [selectedModelValue, setSelectedModel] = useState(aiModels[0].value)
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = { role: "user", content: input };
    const currentMessages = [...messages, userMessage];

    setMessages(currentMessages);
    setInput("");

    if (!selectedModelValue) return;
    const selectedModel = aiModels.find((model) => model.value === selectedModelValue);
    if (!selectedModel) return;

    try {
      switch (selectedModel.provider) {
        case "OpenAI":
          const chatbot = new AIModel()
          const prompt = currentMessages as Array<ChatCompletionMessageParam>
          const response: ChatResponse = await chatbot.chat(prompt, selectedModelValue);

          if (response) {
            setMessages([...currentMessages, { 
              role: "assistant", 
              content: response.content 
            }]);
          }
          break;
        default:
          console.log("Provider not found");
      }
    } catch (error) {
      console.error(error);
    }
    
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-playfair">AI Chat</h2>
      </div>
      {/* <Card className="flex flex-col h-[calc(100vh-12rem)]"> */}
      <Card className="h-[750px] flex flex-col">
        <CardHeader>
          <CardTitle className="font-playfair">Chat with AI</CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-roboto">Select AI Model:</span>
            <Select value={selectedModelValue} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {aiModels.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        {/* <CardContent className="flex-1 flex flex-col"> */}
        <CardContent className="flex-1 flex flex-col h-full overflow-hidden">
          {/* <ScrollArea className="flex-1 pr-4"> */}
          <ScrollArea 
            className="flex-1 pr-4 h-[calc(100%-60px)]" 
            ref={scrollAreaRef}
          >
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
  )
}
  
  
  
  
  
  
  
  
  
  
//   return (
//     <div className="space-y-4">
//       <h1 className="text-2xl font-playfair font-bold">Playground</h1>
//       <div className="border p-4 rounded h-64 overflow-y-auto font-roboto">
//         {messages.map((msg, idx) => (
//           <div key={idx} className="mb-2">
//             <span
//               className={`font-semibold ${
//                 msg.sender === "AI" ? "text-accent" : "text-black"
//               }`}
//             >
//               {msg.sender}:
//             </span>{" "}
//             <span>{msg.text}</span>
//           </div>
//         ))}
//       </div>
//       <div className="flex space-x-2">
//         <input
//           className="flex-1 border p-2 rounded font-roboto"
//           placeholder="Type a message..."
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//         />
//         <button
//           onClick={handleSend}
//           className="bg-accent text-white py-2 px-4 rounded hover:bg-opacity-90 transition"
//         >
//           Send
//         </button>
//       </div>
//     </div>
//   );
// }
