import { useState, useRef, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useGetRoomMessages, useGetRoomOnlineUsers, getGetRoomMessagesQueryKey, getGetRoomOnlineUsersQueryKey } from "@workspace/api-client-react";
import { Message } from "@workspace/api-client-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Users, Info, Clock, Loader2, Sparkles, X, Bot } from "lucide-react";
import { EmojiPicker } from "@/components/emoji-picker";
import { useUsername } from "@/hooks/use-username";
import { STORE_WALLPAPER_KEY } from "@/lib/constants";
import { format } from "date-fns";

interface ChatRoomProps {
  roomId: string;
  roomName: string;
  isGlobal?: boolean;
  expiresAt?: string | null;
}

export function ChatRoom({ roomId, roomName, isGlobal = false, expiresAt: initialExpiresAt }: ChatRoomProps) {
  const { username } = useUsername();
  const [wallpaper, setWallpaper] = useState<string | null>(() => localStorage.getItem(STORE_WALLPAPER_KEY));
  const [inputVal, setInputVal] = useState("");
  
  const {
    messages: wsMessages,
    setMessages: setWsMessages,
    onlineUsers,
    isConnected,
    aiActive,
    inactivityExpiresAt,
    sendMessage,
  } = useWebSocket(roomId, username);

  const expiresAt = inactivityExpiresAt || initialExpiresAt;

  const { data: initialMessages, isLoading: isLoadingMessages } = useGetRoomMessages(roomId, {
    query: { enabled: !!roomId, queryKey: getGetRoomMessagesQueryKey(roomId) }
  });

  const { data: initialOnlineUsers } = useGetRoomOnlineUsers(roomId, {
    query: { enabled: !!roomId, queryKey: getGetRoomOnlineUsersQueryKey(roomId) }
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialMessages && wsMessages.length === 0) {
      setWsMessages(initialMessages);
    }
  }, [initialMessages, setWsMessages, wsMessages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [wsMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    sendMessage(inputVal.trim());
    setInputVal("");
  };

  const users = onlineUsers.length > 0 ? onlineUsers : (initialOnlineUsers || []);
  const backgroundStyle = wallpaper ? (wallpaper.startsWith("http") || wallpaper.startsWith("data:") ? { backgroundImage: `url(${wallpaper})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: wallpaper }) : {};

  return (
    <div className="flex flex-col h-full relative" style={backgroundStyle}>
      <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-0 pointer-events-none"></div>
      
      <header className="h-16 flex items-center justify-between px-6 border-b bg-background/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg">{roomName}</h2>
            {isGlobal && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">Global</span>}
            {aiActive && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-bold uppercase tracking-wider animate-in fade-in zoom-in">
                <Sparkles className="w-3 h-3" />
                AI Active
              </span>
            )}
          </div>
          {expiresAt && !isGlobal && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Expires {format(new Date(expiresAt), "HH:mm")}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : username ? 'bg-amber-500' : 'bg-muted-foreground'}`} />
            {isConnected ? 'Connected' : username ? 'Connecting...' : 'Enter name to join'}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex z-10">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6" ref={scrollRef}>
            {isLoadingMessages ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : wsMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Start the conversation</h3>
                <p className="text-muted-foreground">Send a message to the room to begin. Type <code className="bg-muted px-1.5 py-0.5 rounded text-sm text-foreground">/ai</code> to summon the assistant.</p>
              </div>
            ) : (
              wsMessages.map((msg, idx) => {
                const isMe = msg.username === username;
                const showAvatar = idx === 0 || wsMessages[idx - 1].username !== msg.username;
                
                if (msg.isAi) {
                  return (
                    <div key={msg.id || idx} className="flex gap-4 max-w-[85%] animate-in slide-in-from-bottom-2">
                      <Avatar className="w-8 h-8 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 shrink-0 mt-1">
                        <AvatarFallback className="bg-transparent rounded-md"><Bot className="w-5 h-5" /></AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-1 items-start">
                        {showAvatar && <span className="text-xs font-semibold text-indigo-500 flex items-center gap-1">AI Assistant</span>}
                        <div className="bg-card border shadow-sm px-4 py-3 rounded-2xl rounded-tl-sm text-foreground">
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-muted-foreground ml-1">{format(new Date(msg.createdAt), "HH:mm")}</span>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={msg.id || idx} className={`flex gap-4 max-w-[85%] animate-in slide-in-from-bottom-2 ${isMe ? "ml-auto flex-row-reverse" : ""}`}>
                    {showAvatar ? (
                      <Avatar className={`w-8 h-8 rounded-md shrink-0 mt-1 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                        <AvatarFallback className="bg-transparent rounded-md">{msg.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-8 shrink-0" />
                    )}
                    <div className={`flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                      {showAvatar && <span className="text-xs font-medium text-muted-foreground">{msg.username}</span>}
                      <div className={`px-4 py-2 text-[15px] shadow-sm ${
                        isMe 
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm" 
                          : "bg-card border rounded-2xl rounded-tl-sm text-foreground"
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-muted-foreground mx-1">{format(new Date(msg.createdAt), "HH:mm")}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 bg-background/95 backdrop-blur border-t shrink-0">
            <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-end gap-2 relative">
              <div className="flex-1 relative flex items-center bg-muted rounded-xl border border-transparent focus-within:border-ring focus-within:ring-1 focus-within:ring-ring overflow-hidden">
                <Input
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder={aiActive ? "Ask the AI or type \\ai to deactivate..." : "Type a message..."}
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0 rounded-none h-12 text-base px-4"
                  maxLength={500}
                />
                <div className="pr-2">
                  <EmojiPicker onSelect={(emoji) => setInputVal(prev => prev + emoji)} />
                </div>
              </div>
              <Button type="submit" size="icon" disabled={!inputVal.trim() || !isConnected} className="h-12 w-12 rounded-xl shrink-0">
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </div>

        <div className="w-64 border-l bg-background/95 backdrop-blur hidden md:flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Online — {users.length}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
            {users.map((u) => (
              <div key={u.userId} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="relative">
                  <Avatar className="w-8 h-8 rounded-md bg-muted text-foreground">
                    <AvatarFallback className="bg-transparent rounded-md text-xs">{u.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${u.isOnline ? "bg-green-500" : "bg-muted-foreground"}`} />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium truncate">{u.username}</span>
                  <span className="text-[10px] text-muted-foreground">{u.isOnline ? "Active now" : "Away"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Needed to fix unresolved component MessageSquare in ChatRoom
import { MessageSquare } from "lucide-react";
