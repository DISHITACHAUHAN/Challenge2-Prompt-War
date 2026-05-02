import { useListOpenaiConversations, useCreateOpenaiConversation, useDeleteOpenaiConversation, getListOpenaiConversationsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Trash2, Library } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatSidebarProps {
  currentId: number | null;
  onSelect: (id: number) => void;
}

export function ChatSidebar({ currentId, onSelect }: ChatSidebarProps) {
  const { data: conversations = [], isLoading } = useListOpenaiConversations();
  const createConv = useCreateOpenaiConversation();
  const deleteConv = useDeleteOpenaiConversation();
  const queryClient = useQueryClient();

  const handleNewChat = () => {
    createConv.mutate({ data: { title: "New Chat" } }, {
      onSuccess: (newConv) => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        onSelect(newConv.id);
      }
    });
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteConv.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        if (currentId === id) {
          onSelect(0); // Will trigger logic to select or create another
        }
      }
    });
  };

  return (
    <div className="w-72 border-r bg-sidebar flex flex-col h-[100dvh]">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-6 text-primary">
          <Library className="w-6 h-6" />
          <span className="font-semibold text-lg tracking-tight">Election Guide</span>
        </div>
        <Button onClick={handleNewChat} className="w-full flex items-center justify-center gap-2" variant="default">
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </Button>
      </div>
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No conversations yet.</div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`w-full text-left px-3 py-3 rounded-lg flex items-center justify-between group transition-colors ${
                  currentId === conv.id ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span className="truncate text-sm">{conv.title}</span>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleDelete(e, conv.id)}
                  onKeyDown={(e) => e.key === "Enter" && handleDelete(e as unknown as React.MouseEvent, conv.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity rounded cursor-pointer"
                  title="Delete chat"
                >
                  <Trash2 className="w-4 h-4" />
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
