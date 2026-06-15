import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Message, User } from '@workspace/api-client';
import { getGetRoomMessagesQueryKey, getGetRoomOnlineUsersQueryKey } from '@workspace/api-client-react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

interface WebSocketHook {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onlineUsers: User[];
  isConnected: boolean;
  aiActive: boolean;
  inactivityExpiresAt: string | null;
  sendMessage: (content: string) => void;
}

export function useWebSocket(roomId: string, username: string | null): WebSocketHook {
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [aiActive, setAiActive] = useState<boolean>(false);
  const [inactivityExpiresAt, setInactivityExpiresAt] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (!roomId) return;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_URL}/rooms/${roomId}/ws?username=${username || 'guest'}`);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'previous_messages':
          setMessages(data.messages);
          break;
        case 'online_users':
          setOnlineUsers(data.users);
          queryClient.invalidateQueries({ queryKey: getGetRoomOnlineUsersQueryKey(roomId) });
          break;
        case 'new_message':
          setMessages((prev) => [...prev, data.message]);
          queryClient.invalidateQueries({ queryKey: getGetRoomMessagesQueryKey(roomId) });
          break;
        case 'user_joined':
        case 'user_left':
          setOnlineUsers(data.users);
          queryClient.invalidateQueries({ queryKey: getGetRoomOnlineUsersQueryKey(roomId) });
          break;
        case 'ai_toggled':
          setAiActive(data.active);
          break;
        case 'room_inactivity':
          setInactivityExpiresAt(data.expiresAt);
          break;
        default:
          break;
      }
    };

    socketRef.current = ws;
  }, [roomId, username, queryClient]);

  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = (content: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const message = { type: 'send_message', content };
      socketRef.current.send(JSON.stringify(message));
    }
  };

  return { messages, setMessages, onlineUsers, isConnected, aiActive, inactivityExpiresAt, sendMessage };
}
