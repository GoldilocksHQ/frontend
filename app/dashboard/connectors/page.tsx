"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getUser } from "@/services/supabase/server";
import { useEffect, useState } from "react";
import Image from "next/image";
import { UserMappedConnector } from "@/lib/types";
import { ConnectorManager } from "@/lib/connector-manager";
import path from "path";
import { Loader2 } from "lucide-react";


export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<UserMappedConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const logoPath = path.join("../../", "logos");
  let connectorManager: ConnectorManager;

  useEffect(() => {
    const initializeConnectors = async () => {
      await setConnectorManager();
      await fetchConnectors();  
    };
    initializeConnectors();
  }, []);

  const setConnectorManager = async () => {
    const user = await getUser();
    if (!user) {
      throw new Error("User not found");
    }
    connectorManager = new ConnectorManager();
  }

  const fetchConnectors = async () => {
    try {      
      const connectors = await connectorManager.getConnectors();
      setConnectors(connectors);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch connectors');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (connectorId: string) => {
    setConnectingId(connectorId);
    setError(null);
    
    try {
      const data = await connectorManager.connectConnector(connectorId);
      
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect');
    } finally {
      setConnectingId(null);
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
                src={`${logoPath}/${connector.connector_name}.svg`}
                alt={connector.connector_display_name}
                className="mb-4"
                width={32}
                height={32}
              />
              <h2 className="text-lg font-semibold mb-4">
                {connector.connector_display_name}
              </h2>
              
              <div className="mt-auto">
                <Button
                  className="w-full"
                  disabled={connector.is_connected || connectingId === connector.id}
                  variant={connector.is_connected ? "secondary" : "default"}
                  onClick={() => handleConnect(connector.id)}
                >
                  {connectingId === connector.id ? (
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
                  ) : connector.is_connected ? (
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
