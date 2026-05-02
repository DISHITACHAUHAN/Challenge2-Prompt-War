import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListOpenaiMessagesQueryKey, OpenaiMessage } from "@workspace/api-client-react";

export function useChatSSE(conversationId: number | null) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const queryClient = useQueryClient();

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId) return;

    setIsStreaming(true);
    setStreamedContent("");

    try {
      const response = await fetch(`/api/openai/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                setStreamedContent((prev) => prev + data.content);
              }
              if (data.done) {
                // Done streaming
              }
            } catch (e) {
              console.error("Error parsing SSE JSON", e);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsStreaming(false);
      setStreamedContent("");
      // Invalidate to refresh message list from server to get actual DB IDs
      queryClient.invalidateQueries({
        queryKey: getListOpenaiMessagesQueryKey(conversationId),
      });
    }
  }, [conversationId, queryClient]);

  return { sendMessage, isStreaming, streamedContent };
}
