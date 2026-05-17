import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useCreateRoom } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListRoomsQueryKey } from "@workspace/api-client-react";

interface CreateRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRoomModal({ open, onOpenChange }: CreateRoomModalProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [emptyDeleteMinutes, setEmptyDeleteMinutes] = useState(15);
  
  const createRoom = useCreateRoom({
    mutation: {
      onSuccess: (room) => {
        queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
        onOpenChange(false);
        setLocation(`/rooms/${room.id}`);
        setName("");
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createRoom.mutate({
      data: {
        name: name.trim(),
        emptyDeleteMinutes,
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a Private Room</DialogTitle>
          <DialogDescription>
            Create a space for your friends or team. Rooms auto-delete when empty.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Room Name</Label>
            <Input 
              id="name"
              placeholder="e.g. Project Brainstorm" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoFocus
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Auto-delete when empty</Label>
              <span className="text-sm font-medium text-muted-foreground">{emptyDeleteMinutes} minutes</span>
            </div>
            <Slider 
              value={[emptyDeleteMinutes]}
              onValueChange={([val]) => setEmptyDeleteMinutes(val)}
              min={5}
              max={120}
              step={5}
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              If the room has 0 members for this long, it will be automatically deleted along with all its messages.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || createRoom.isPending}>
              {createRoom.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
