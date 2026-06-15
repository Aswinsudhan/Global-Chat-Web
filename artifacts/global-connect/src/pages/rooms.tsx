import { Layout } from "@/components/layout";
import { useListRooms, getListRoomsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, Clock, Plus } from "lucide-react";
import { CreateRoomModal } from "@/components/create-room-modal";
import { useState } from "react";

export default function RoomsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: rooms, isLoading } = useListRooms({
    query: { queryKey: getListRoomsQueryKey() }
  });

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto bg-muted/20">
        <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Private Rooms</h1>
              <p className="text-muted-foreground mt-1">Join an existing room or create your own space.</p>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="shrink-0 gap-2">
              <Plus className="w-4 h-4" />
              Create Room
            </Button>
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-48 rounded-xl bg-card border animate-pulse" />
              ))}
            </div>
          ) : rooms?.length === 0 ? (
            <div className="text-center py-24 px-6 border-2 border-dashed rounded-2xl bg-card/50">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No active rooms</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6">There are no private rooms available right now. Create one to start chatting with friends.</p>
              <Button onClick={() => setCreateOpen(true)}>Create the first room</Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms?.map(room => (
                <Link key={room.id} href={`/rooms/${room.id}`}>
                  <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full flex flex-col group">
                    <CardHeader className="pb-3">
                      <CardTitle className="group-hover:text-primary transition-colors">{room.name}</CardTitle>
                      <CardDescription>Created {formatDistanceToNow(new Date(room.createdAt))} ago</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          <span>{room.memberCount} members</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4" />
                          <span>{room.messageCount} msgs</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-3 border-t bg-muted/20 flex justify-between items-center text-xs text-muted-foreground">
                      {room.expiresAt ? (
                        <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          Expires {formatDistanceToNow(new Date(room.expiresAt))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          No expiry
                        </div>
                      )}
                      <span className="font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">Join →</span>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <CreateRoomModal open={createOpen} onOpenChange={setCreateOpen} />
    </Layout>
  );
}
