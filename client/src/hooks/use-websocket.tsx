import { useEffect, useRef, useState } from "react";
import { WebSocketManager } from "@/lib/websocket";

export function useWebSocket(token: string | null, quizId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocketManager | null>(null);
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    if (!token) return;

    const ws = new WebSocketManager(token, quizId);
    wsRef.current = ws;

    ws.connect()
      .then(() => {
        setIsConnected(true);
      })
      .catch((error) => {
        console.error('Failed to connect to WebSocket:', error);
        setIsConnected(false);
      });

    // Listen for all message types
    const unsubscribes = [
      ws.on('quiz_started', (data) => setLastMessage(data)),
      ws.on('question_revealed', (data) => setLastMessage(data)),
      ws.on('answer_submitted', (data) => setLastMessage(data)),
      ws.on('quiz_ended', (data) => setLastMessage(data)),
      ws.on('question_ended', (data) => setLastMessage(data)),
      ws.on('question_skipped', (data) => setLastMessage(data)),
      ws.on('quiz_created', (data) => setLastMessage(data)),
      ws.on('connected', (data) => setLastMessage(data)),
      ws.on('pong', (data) => setLastMessage(data)),
    ];

    return () => {
      unsubscribes.forEach(unsub => unsub());
      ws.disconnect();
      setIsConnected(false);
    };
  }, [token, quizId]);

  const sendMessage = (data: any) => {
    if (wsRef.current) {
      wsRef.current.send(data);
    }
  };

  return {
    isConnected,
    lastMessage,
    sendMessage
  };
}
