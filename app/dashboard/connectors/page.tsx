"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Connector, ConnectorManager } from "@/lib/managers/connector-manager";
import path from "path";
import { Loader2 } from "lucide-react";
import { PlaidLinkError,  usePlaidLink } from 'react-plaid-link';
export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Array<Connector & { isConnected: boolean, isAuthenticated: boolean }>>([]);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const logoPath = path.join("../../", "logos");
  const [connectorManager, setConnectorManager] = useState<ConnectorManager | null>(null);
  const [plaidToken, setPlaidToken] = useState<string | null>(null);

  useEffect(() => {
    initializeConnectors();
  }, []);

  const initializeConnectors = async () => {
    try {
      setLoading(true);
      const manager = ConnectorManager.getInstance();
      await manager.initialize();
      setConnectorManager(manager);
      const fetchedConnectors = manager.getConnectors();
      
      // Get connection status for each connector
      const connectorsWithStatus = await Promise.all(
        fetchedConnectors.map(async (connector) => {
          const status = manager.getConnectorStatus(connector.id);
          return {
            ...connector,
            isConnected: status?.isConnected || false,
            isAuthenticated: status?.isAuthenticated || false
          };
        })
      );
      
      setConnectors(connectorsWithStatus);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Initialization failed");
    } finally {
      setLoading(false);
    }
  }

  const onSuccess = useCallback((publicToken: string) => {
    const connector = connectorManager?.getConnectorByName('plaid');
    if (connector) {
      connectorManager?.exchangeToken(connector.id, publicToken);
    }
  }, [connectorManager]);

  const onExit = useCallback((error: PlaidLinkError | null) => {
    if (error?.error_code === 'INVALID_LINK_TOKEN') {
      setPlaidToken(null);
    }
  }, []);

  const { open, ready } = usePlaidLink({
    token: plaidToken,
    onSuccess,
    onExit,
    onEvent: (eventName) => console.log('Plaid event:', eventName)
  }); 

  useEffect(() => {
    if (plaidToken && ready) {
      open();
    }
  }, [plaidToken, ready, open]);

  const handleConnect = async (connector: Connector & { isConnected: boolean }) => {
    setError(null);
    setSelectedConnectorId(connector.id);
    try {
      const response = await connectorManager?.connect(connector.id);
      
      if (response?.error) {
        throw new Error(response.error);
      }

      if (connector.name = "plaid"){
        setPlaidToken(response?.authUrl || null);
      } else {
        if (response?.authUrl) {
          window.location.href = response.authUrl;
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect');
    } finally {
      setSelectedConnectorId(null);
    }
  };

  return loading ? (  
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ) : (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Available Connectors</h1>
      
      {error && (
        <div className="text-red-500 mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {connectors.map((connector) => (
          <Card key={connector.id} className="p-6">
            <div className="flex flex-col h-full items-center">
              <Image 
                src={`${logoPath}/${connector.name}.svg`}
                alt={`${connector.displayName} thumbnail`}
                className="mb-4 w-16 h-16"
                width={16}
                height={16}
              />
              <h2 className="text-lg font-semibold mb-4">
                {connector.displayName}
              </h2>
              
              <div className="mt-auto">
                <Button
                  className="w-full"
                  disabled={(connector.isConnected && connector.isAuthenticated) || selectedConnectorId === connector.id}
                  variant={(connector.isConnected && connector.isAuthenticated) ? "secondary" : "default"}
                  onClick={() => handleConnect(connector)}
                >
                  {selectedConnectorId === connector.id ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <circle 
                          className="opacity-25" 
                          cx="12" 
                          cy="12" 
                          r="10" 
                          stroke="currentColor" 
                          strokeWidth="4"
                        />
                        <path 
                          className="opacity-75" 
                          fill="currentColor" 
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Connecting...
                    </>
                  ) : connector.isConnected && connector.isAuthenticated ? (
                    "Connected"
                  ) : (
                    "Connect"
                  )}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}