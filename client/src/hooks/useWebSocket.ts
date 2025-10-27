import { useEffect, useRef, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';

export interface PrescriptionUpdate {
  type: 
    | 'connected'
    | 'prescription_created'
    | 'prescription_updated'
    | 'prescription_deleted'
    | 'prescription_processing'
    | 'prescription_completed'
    | 'prescription_failed';
  prescriptionId?: string;
  status?: string;
  timestamp: string;
}

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000; // 1 second

  const connect = useCallback(() => {
    try {
      // Determine WebSocket URL based on current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('✅ WebSocket connected');
        reconnectAttempts.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const update: PrescriptionUpdate = JSON.parse(event.data);
          console.log('📨 WebSocket message:', update);

          // Handle different update types
          switch (update.type) {
            case 'connected':
              console.log('🤝 WebSocket connection confirmed');
              break;

            case 'prescription_created':
            case 'prescription_updated':
            case 'prescription_deleted':
            case 'prescription_processing':
            case 'prescription_completed':
            case 'prescription_failed':
              // Invalidate prescription queries to trigger refetch
              queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
              queryClient.invalidateQueries({ queryKey: ['/api/extraction-results'] });
              
              if (update.prescriptionId) {
                // Also invalidate specific prescription query if open
                queryClient.invalidateQueries({ 
                  queryKey: [`/api/prescriptions/${update.prescriptionId}`] 
                });
              }
              break;

            default:
              console.log('Unknown message type:', update.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      ws.current.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        ws.current = null;

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(
            baseReconnectDelay * Math.pow(2, reconnectAttempts.current),
            30000 // Max 30 seconds
          );
          
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          console.error('❌ Max reconnection attempts reached');
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      // Clean up on unmount
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected: ws.current?.readyState === WebSocket.OPEN,
  };
}

