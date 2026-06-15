import { useState } from "react";
import { STORE_USERNAME_KEY } from "@/lib/constants";

export function useUsername() {
  const [username, setUsernameState] = useState<string | null>(
    () => localStorage.getItem(STORE_USERNAME_KEY)
  );

  const setUsername = (name: string) => {
    localStorage.setItem(STORE_USERNAME_KEY, name);
    setUsernameState(name);
  };

  return { username, setUsername };
}
