import { OpenaiMessage } from "@workspace/api-client-react";
import { User, Library } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  message: OpenaiMessage | { role: "user" | "assistant", content: string };
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`py-6 flex justify-center ${isUser ? "bg-background" : "bg-muted/30"}`}>
      <div className="max-w-3xl w-full flex gap-5 px-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground shadow-sm"}`}>
          {isUser ? <User className="w-4 h-4" /> : <Library className="w-4 h-4" />}
        </div>
        <div className="flex-1 space-y-2 pt-1 min-w-0">
          <div className="font-semibold text-sm text-foreground/80">
            {isUser ? "You" : "Election Guide"}
          </div>
          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-foreground leading-relaxed break-words">
            {isUser ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content + (isStreaming ? " ▋" : "")}
              </ReactMarkdown>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

