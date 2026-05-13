import { useState, useEffect, useCallback } from 'react';
import type { AnchorStatus, SemanticSyncMessage } from '../types';
import { semanticSynchronizer } from '../services/semanticSync';

export const useSemanticSync = () => {
  const [messages, setMessages] = useState<SemanticSyncMessage[]>([]);

  useEffect(() => {
    const handleMessage = (message: SemanticSyncMessage) => {
      setMessages(prev => [...prev, message]);
    };

    semanticSynchronizer.subscribe('app', handleMessage);

    return () => {
      semanticSynchronizer.unsubscribe('app');
    };
  }, []);

  const addMessage = useCallback((message: SemanticSyncMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const sendStatusUpdate = useCallback(async (shipId: string, status: AnchorStatus) => {
    const message = semanticSynchronizer.createMessage(
      'ship',
      'status_update',
      {
        shipId,
        anchorStatus: status,
        syncTime: new Date().toISOString()
      }
    );
    await semanticSynchronizer.sendMessage(message);
    return message;
  }, []);

  const sendAlert = useCallback(async (shipId: string, alertType: string, severity: string, description: string) => {
    const message = semanticSynchronizer.createMessage(
      'monitoring',
      'alert',
      {
        shipId,
        alertType,
        severity,
        description,
        timestamp: Date.now()
      }
    );
    await semanticSynchronizer.sendMessage(message);
    return message;
  }, []);

  const sendCommand = useCallback(async (targetShipId: string, command: string, parameters: any) => {
    const message = semanticSynchronizer.createMessage(
      'monitoring',
      'command',
      {
        targetShipId,
        command,
        parameters,
        issuedAt: Date.now()
      }
    );
    await semanticSynchronizer.sendMessage(message);
    return message;
  }, []);

  return {
    messages,
    addMessage,
    sendStatusUpdate,
    sendAlert,
    sendCommand
  };
};
