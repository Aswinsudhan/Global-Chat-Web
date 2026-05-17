import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUsername } from "@/hooks/use-username";

export function UsernameModal() {
  const { username, setUsername } = useUsername();
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState("");

  useEffect(() => {
    if (!username) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [username]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim().length > 0) {
      setUsername(inputVal.trim());
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (username) setOpen(val);
    }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Welcome to Global Connect</DialogTitle>
          <DialogDescription>
            Enter a display name to join the conversation. No account required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
          <Input 
            placeholder="Your display name" 
            value={inputVal} 
            onChange={(e) => setInputVal(e.target.value)} 
            autoFocus
            maxLength={30}
          />
          <Button type="submit" disabled={!inputVal.trim()}>
            Join Chat
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
