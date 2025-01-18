"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getUser } from "@/services/supabase/server";
import { useEffect, useState } from "react";

interface Connector {
  id: string;
  connector_display_name: string;
  is_connected: boolean;
}

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  useEffect(() => {
    fetchConnectors();
  }, []);

  const fetchConnectors = async () => {
    try {
      const user = await getUser();
      if (!user) {
        throw new Error("User not found");
      }
      const response = await fetch('/api/connectors/list?user_id=' + encodeURIComponent(user.id));
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setConnectors(data.connectors);
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
      const response = await fetch('/api/connectors/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectorId }),
      });
      
      const data = await response.json();
      
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading connectors...</div>
      </div>
    );
  }

  return (
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
            <div className="flex flex-col h-full">
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
