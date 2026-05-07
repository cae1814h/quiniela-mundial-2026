import AsyncStorage from "@react-native-async-storage/async-storage";
import { useListMessages, getListMessagesQueryKey, type UserMessage } from "@workspace/api-client-react";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { useAuth } from "./AuthContext";

const getLastSeenKey = (userId: number) => `quiniela_last_seen_message_${userId}`;

interface MessagesState {
  hasNew: boolean;
  messages: UserMessage[] | undefined;
  markSeen: () => void;
}

const MessagesContext = createContext<MessagesState>({ hasNew: false, messages: undefined, markSeen: () => {} });

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const { data: messages } = useListMessages({
    query: { enabled: !!user, refetchInterval: 30_000, queryKey: getListMessagesQueryKey() },
  });

  // Reload lastSeenAt whenever the logged-in user changes (handles account switching)
  useEffect(() => {
    if (!user) {
      setLastSeenAt(null);
      setLoaded(false);
      return;
    }
    setLoaded(false);
    AsyncStorage.getItem(getLastSeenKey(user.id))
      .then((v) => { setLastSeenAt(v); setLoaded(true); })
      .catch(() => { setLoaded(true); });
  }, [user?.id]);

  const hasNew =
    loaded &&
    !!user &&
    !!messages &&
    messages.length > 0 &&
    (!lastSeenAt || messages.some((m) => new Date(m.createdAt) > new Date(lastSeenAt)));

  const markSeen = useCallback(() => {
    if (!user || !messages || messages.length === 0) return;
    const latestAt = messages.reduce((acc, m) => {
      const d = new Date(m.createdAt).toISOString();
      return d > acc ? d : acc;
    }, "");
    if (latestAt) {
      AsyncStorage.setItem(getLastSeenKey(user.id), latestAt).catch(() => {});
      setLastSeenAt(latestAt);
    }
  }, [user, messages]);

  return (
    <MessagesContext.Provider value={{ hasNew, messages, markSeen }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  return useContext(MessagesContext);
}
