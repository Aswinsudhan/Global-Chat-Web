import { Layout } from "@/components/layout";
import { ChatRoom } from "@/components/chat-room";
import { useGetRoom, getGetRoomQueryKey } from "@workspace/api-client-react";
import { useRoute } from "wouter";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function RoomPage() {
  const [, params] = useRoute("/rooms/:id");
  const roomId = params?.id;

  const { data: room, isLoading, error } = useGetRoom(roomId || "", {
    query: { enabled: !!roomId, queryKey: getGetRoomQueryKey(roomId || "") }
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !room) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Room not found</h2>
          <p className="text-muted-foreground max-w-md mb-6">This room may have expired, been deleted due to inactivity, or the URL is incorrect.</p>
          <Button asChild>
            <Link href="/rooms">Browse active rooms</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <ChatRoom 
        roomId={room.id} 
        roomName={room.name} 
        isGlobal={false} 
        expiresAt={room.expiresAt} 
      />
    </Layout>
  );
}
