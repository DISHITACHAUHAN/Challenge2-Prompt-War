import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, KeyboardEvent } from "react";

const QUICK_REPLIES = [
  "How elections work",
  "How to vote",
  "Important dates",
  "Registration help"
];

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-background border-t">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap gap-2 mb-3">
          {QUICK_REPLIES.map((reply) => (
            <button
              key={reply}
              onClick={() => onSend(reply)}
              disabled={disabled}
              className="text-xs bg-accent text-accent-foreground px-3 py-1.5 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reply}
            </button>
          ))}
        </div>
        <div className="relative shadow-sm rounded-xl overflow-hidden border bg-card focus-within:ring-1 focus-within:ring-ring">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the election process..."
            className="min-h-[60px] max-h-[200px] w-full resize-none border-0 shadow-none focus-visible:ring-0 p-4 pr-12 text-base"
            disabled={disabled}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            className="absolute bottom-3 right-3 rounded-lg h-8 w-8"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
