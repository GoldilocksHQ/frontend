"use client";

import { TokenManager} from "@/lib/token-manager";
import { type Credentials  } from "@/services/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { UUID } from "crypto";

export default function TokenManagerTest() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Example credentials - replace with your test values
  const testCreds: Credentials = {
    userId: "385d3b4d-f926-4afc-a53b-f1aed66e8696" as UUID,
    tokenName: "google-sheets",
    tokenType: "access",
    createdAt: "2024-01-17T12:00:00.000Z",
    expiresAt: "2025-01-17T12:00:00.000Z",
    token: ""
  };

  const tokenManager = new TokenManager(testCreds);

  const handleStore = async () => {
    setLoading(true);
    setError(null);
    try {
      const testToken = crypto.randomUUID();
      testCreds.token = testToken;
      const result = await tokenManager.storeToken(testCreds);
      
      if (!result.success) {
        setError(result.error?.message || 'Failed to store token');
        return;
      }
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    setError(null);
    try {
      const updatedToken = crypto.randomUUID();
      testCreds.token = updatedToken;
      const result = await tokenManager.updateToken(testCreds);
      
      if (!result.success) {
        setError(result.error?.message || 'Failed to update token');
        return;
      }
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGet = async () => {
    setLoading(true);
    setError(null);
    try {
      const retrievedToken = await tokenManager.getToken();
      setToken(retrievedToken?.token || null);
      
      if (!retrievedToken) {
        setError('No token found');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckExists = async () => {
    setLoading(true);
    setError(null);
    try {
      const exists = await tokenManager.tokenExists();
      setError(exists ? 'Token exists' : 'Token does not exist');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Token Manager Test</h1>
      
      <div className="space-y-4">
        <div className="flex gap-4 flex-wrap">
          <Button onClick={handleStore} disabled={loading}>
            Store Token
          </Button>
          <Button onClick={handleUpdate} disabled={loading}>
            Update Token
          </Button>
          <Button onClick={handleGet} disabled={loading}>
            Get Token
          </Button>
          <Button onClick={handleCheckExists} disabled={loading}>
            Check Token Exists
          </Button>
        </div>

        {error && (
          <Card className="p-4 bg-destructive/10 text-destructive">
            <p>{error}</p>
          </Card>
        )}

        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">Current Token</h2>
          <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96">
            {token ? token : 'No token stored'}
          </pre>
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">Test Credentials</h2>
          <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96">
            {JSON.stringify(testCreds, null, 2)}
          </pre>
        </Card>
      </div>
    </div>
  );
}