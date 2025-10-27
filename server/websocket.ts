import type { WebSocketServer } from 'ws';

export type PrescriptionUpdateType = 
  | 'prescription_created'
  | 'prescription_updated'
  | 'prescription_deleted'
  | 'prescription_processing'
  | 'prescription_completed'
  | 'prescription_failed';

export interface PrescriptionUpdate {
  type: PrescriptionUpdateType;
  prescriptionId: string;
  status?: string;
  timestamp: string;
}

/**
 * Broadcast a message to all connected WebSocket clients
 */
export function broadcastToClients(message: PrescriptionUpdate) {
  try {
    const wss = (global as any).wss as WebSocketServer | undefined;
    
    if (!wss) {
      console.warn('WebSocket server not initialized');
      return;
    }
    
    const messageStr = JSON.stringify(message);
    let sentCount = 0;
    
    wss.clients.forEach((client) => {
      if (client.readyState === 1) { // OPEN state
        client.send(messageStr);
        sentCount++;
      }
    });
    
    if (sentCount > 0) {
      console.log(`📡 Broadcast ${message.type} to ${sentCount} client(s)`);
    }
  } catch (error) {
    console.error('Error broadcasting WebSocket message:', error);
  }
}

/**
 * Notify clients of prescription creation
 */
export function notifyPrescriptionCreated(prescriptionId: string) {
  broadcastToClients({
    type: 'prescription_created',
    prescriptionId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notify clients of prescription update
 */
export function notifyPrescriptionUpdated(prescriptionId: string, status?: string) {
  broadcastToClients({
    type: 'prescription_updated',
    prescriptionId,
    status,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notify clients of prescription deletion
 */
export function notifyPrescriptionDeleted(prescriptionId: string) {
  broadcastToClients({
    type: 'prescription_deleted',
    prescriptionId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notify clients of prescription processing status change
 */
export function notifyPrescriptionStatus(prescriptionId: string, status: 'processing' | 'completed' | 'failed') {
  const typeMap = {
    processing: 'prescription_processing' as const,
    completed: 'prescription_completed' as const,
    failed: 'prescription_failed' as const,
  };
  
  broadcastToClients({
    type: typeMap[status],
    prescriptionId,
    status,
    timestamp: new Date().toISOString(),
  });
}

