import { useState, useEffect, useRef, useCallback } from "react";
import type { Message, OnlineUser } from "@workspace/api-client-react";

export function useWebSocket(roomId: string, username: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [aiActive, setAiActive] = useState(false);
  const [inactivityExpiresAt, setInactivityExpiresAt] = useState<string | null>(null);
  const [emptyExpiresAt, setEmptyExpiresAt] = useState<string | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmounted = useRef(false);

  // Track in-progress AI messages by ID for streaming
  const aiStreamBuffers = useRef<Map<string, string>>(new Map());

  const connect = useCallback(() => {
    if (!username || !roomId || isUnmounted.current) return;

    // Don't reconnect if already connected or connecting
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
    const userId = localStorage.getItem("gc_user_id") || (() => {
      const id = Math.random().toString(36).slice(2);
      localStorage.setItem("gc_user_id", id);
      return id;
    })();

    const wsUrl = `${wsProtocol}//${location.host}/ws?username=${encodeURIComponent(username)}&roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}`;

    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    socket.onopen = () => {
      if (isUnmounted.current) { socket.close(); return; }
      setIsConnected(true);
    };

    socket.onclose = () => {
      if (isUnmounted.current) return;
      setIsConnected(false);
      // Reconnect after 2s
      reconnectTimer.current = setTimeout(() => connect(), 2000);
    };

    socket.onerror = () => {
      socket.close();
    };

    socket.onmessage = (event) => {
      if (isUnmounted.current) return;
      try {
        const data = JSON.parse(event.data as string);

        switch (data.type) {
          case "history": {
            // Server sends full message history on connect
            const msgs = (data.messages as Message[]) ?? [];
            setMessages(msgs);
            break;
          }

          case "message": {
            // A new chat message (human or system)
            const msg = data.message as Message;
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            break;
          }

          case "ai_chunk": {
            // Streaming AI response chunk — buffer and show partial message
            const { messageId, fullContent } = data as { messageId: string; fullContent: string; content: string };
            aiStreamBuffers.current.set(messageId, fullContent);
            setMessages((prev) => {
              const existing = prev.find((m) => m.id === messageId);
              if (existing) {
                return prev.map((m) => m.id === messageId ? { ...m, content: fullContent } : m);
              }
              // Create placeholder message for streaming
              const placeholder: Message = {
                id: messageId,
                roomId,
                userId: "ai",
                username: "Global Connect AI",
                content: fullContent,
                isAi: true,
                createdAt: new Date().toISOString(),
              };
              return [...prev, placeholder];
            });
            break;
          }

          case "ai_message_complete": {
            // AI message fully done — replace streaming placeholder with final
            const aiMsg = data.message as Message;
            aiStreamBuffers.current.delete(aiMsg.id);
            setMessages((prev) => {
              const exists = prev.find((m) => m.id === aiMsg.id);
              if (exists) {
                return prev.map((m) => m.id === aiMsg.id ? aiMsg : m);
              }
              return [...prev, aiMsg];
            });
            break;
          }

          case "presence": {
            const users = (data.users as OnlineUser[]) ?? [];
            setOnlineUsers(users);
            break;
          }

          case "ai_mode": {
            setAiActive(Boolean(data.active));
            break;
          }

          case "timer_update": {
            setInactivityExpiresAt(data.inactivityExpiresAt ?? null);
            setEmptyExpiresAt(data.emptyExpiresAt ?? null);
            break;
          }

          case "messages_cleared": {
            if (data.roomId === roomId) setMessages([]);
            break;
          }

          case "room_deleted": {
            // Handled by parent component via callback if needed
            break;
          }
        }
      } catch {
        // Ignore malformed messages
      }
    };
  }, [roomId, username]);

  useEffect(() => {
    isUnmounted.current = false;
    // Reset state when room changes
    setMessages([]);
    setOnlineUsers([]);
    setIsConnected(false);
    setAiActive(false);
    setInactivityExpiresAt(null);
    setEmptyExpiresAt(null);

    connect();

    return () => {
      isUnmounted.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (ws.current) {
        ws.current.onclose = null; // prevent reconnect on intentional close
        ws.current.close();
        ws.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback((content: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "message", content }));
    }
  }, []);

  return {
    messages,
    setMessages,
    onlineUsers,
    isConnected,
    aiActive,
    inactivityExpiresAt,
    emptyExpiresAt,
    sendMessage,
  };
}
