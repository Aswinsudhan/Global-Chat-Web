import { Layout } from "@/components/layout";
import { ChatRoom } from "@/components/chat-room";
import { GLOBAL_ROOM_ID } from "@/lib/constants";
import { UsernameModal } from "@/components/username-modal";

export default function Home() {
  return (
    <Layout>
      <ChatRoom roomId={GLOBAL_ROOM_ID} roomName="Global Chat" isGlobal={true} />
      <UsernameModal />
    </Layout>
  );
}
