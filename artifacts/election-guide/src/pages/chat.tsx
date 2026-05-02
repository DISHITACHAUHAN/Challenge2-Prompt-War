import { useEffect, useState, useRef } from "react";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { useListOpenaiMessages, useCreateOpenaiConversation, getListOpenaiConversationsQueryKey, getListOpenaiMessagesQueryKey } from "@workspace/api-client-react";
import { useChatSSE } from "@/hooks/use-chat";
import { useQueryClient } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const WELCOME_MESSAGE = "Hi! I can help you understand the election process. What would you like to know?\n\n1. How elections work\n2. How to vote\n3. Important dates\n4. Local election info";

export default function ChatPage() {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [localMessages, setLocalMessages] = useState<{role: "user" | "assistant", content: string}[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const queryClient = useQueryClient();
  const createConv = useCreateOpenaiConversation();
  const { data: serverMessages = [], isLoading: isLoadingMessages } = useListOpenaiMessages(conversationId || 0, { query: { enabled: !!conversationId } });
  
  const { sendMessage, isStreaming, streamedContent } = useChatSSE(conversationId);

  // Initialize new chat if none selected
  useEffect(() => {
    if (!conversationId && !createConv.isPending) {
      createConv.mutate({ data: { title: "Election Guide Chat" } }, {
        onSuccess: (newConv) => {
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          setConversationId(newConv.id);
        }
      });
    }
  }, [conversationId, createConv, queryClient]);

  // Combine messages
  const displayMessages = [...serverMessages];
  
  // Add local optimistic messages if they exist
  localMessages.forEach(msg => {
    displayMessages.push({ id: Math.random(), conversationId: conversationId || 0, role: msg.role, content: msg.content, createdAt: new Date().toISOString() });
  });

  // If new conversation with no messages, show welcome
  if (displayMessages.length === 0 && conversationId && !isLoadingMessages && localMessages.length === 0) {
    displayMessages.push({ id: -1, conversationId, role: "assistant", content: WELCOME_MESSAGE, createdAt: new Date().toISOString() });
  }

  // Add streaming assistant message
  if (isStreaming) {
    displayMessages.push({ id: -2, conversationId: conversationId || 0, role: "assistant", content: streamedContent, createdAt: new Date().toISOString() });
  }

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMessages, streamedContent]);

  const handleSend = async (content: string) => {
    if (!conversationId) return;
    
    // Optimistic UI update for user message
    setLocalMessages(prev => [...prev, { role: "user", content }]);
    
    await sendMessage(content);
    
    // Clear local messages after SSE finishes and triggers invalidateQueries
    setLocalMessages([]);
  };

  const handleSelectConversation = (id: number) => {
    setConversationId(id === 0 ? null : id);
    setLocalMessages([]); // Clear any optimistic messages
  };

  return (
    <div className="flex h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <ChatSidebar currentId={conversationId} onSelect={handleSelectConversation} />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center p-3 border-b bg-background z-10">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-r-0">
              <ChatSidebar currentId={conversationId} onSelect={handleSelectConversation} />
            </SheetContent>
          </Sheet>
          <div className="font-semibold text-primary">Election Guide</div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scroll-smooth" ref={scrollRef}>
          {displayMessages.length === 0 && isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20" />
                <div className="text-muted-foreground text-sm">Loading chat...</div>
              </div>
            </div>
          ) : (
            <div className="pb-6">
              {displayMessages.map((msg, idx) => (
                <ChatMessage 
                  key={msg.id || idx} 
                  message={msg} 
                  isStreaming={msg.id === -2 && isStreaming}
                />
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={isStreaming || !conversationId} />
      </div>
    </div>
  );
}
