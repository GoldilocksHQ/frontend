"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export default function ConnectorTest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [range, setRange] = useState("");
  const [values, setValues] = useState<string[][]>([]);
  const [valuesInput, setValuesInput] = useState("");

  const handleGoogleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/connectors');
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Redirect to Google OAuth URL
      window.location.href = data.url;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect to Google');
    } finally {
      setLoading(false);
    }
  };

  const handleReadValues = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/connectors?spreadsheetId=${spreadsheetId}&range=${range}`
      );
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setValues(data.values);
      setValuesInput(JSON.stringify(data.values, null, 2));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to read values');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateValues = async () => {
    setLoading(true);
    setError(null);
    try {
      // Parse the values input
      let parsedValues: string[][];
      try {
        parsedValues = JSON.parse(valuesInput);
        if (!Array.isArray(parsedValues) || !parsedValues.every(Array.isArray)) {
          throw new Error('Values must be a 2D array');
        }
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Failed to parse values');
      }

      const response = await fetch('/api/connectors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spreadsheetId,
          range,
          values: parsedValues,
        }),
      });
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setValues(parsedValues);
      setError('Values updated successfully');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update values');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Connector Test</h1>
      
      <div className="space-y-4">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Google Sheets</h2>
          <div className="space-y-4">
            <Button 
              onClick={handleGoogleConnect} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <svg 
                    className="h-4 w-4" 
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22c-5.523 0-10-4.477-10-10S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                    <path d="M10 17l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span>Connect Google Sheets</span>
                </>
              )}
            </Button>

            {error && (
              <div className="text-sm text-red-500">
                {error}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
          <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96">
            {loading ? 'Connecting...' : error ? 'Connection failed' : 'Ready to connect'}
          </pre>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Sheet Operations</h2>
          <div className="space-y-4">
            <div className="grid gap-4">
              <Input
                placeholder="Spreadsheet ID"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
              />
              <Input
                placeholder="Range (e.g., Sheet1!A1:B10)"
                value={range}
                onChange={(e) => setRange(e.target.value)}
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Values (JSON format):
                </label>
                <Textarea
                  placeholder='[["A1", "B1"], ["A2", "B2"]]'
                  value={valuesInput}
                  onChange={(e) => setValuesInput(e.target.value)}
                  rows={10}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={handleReadValues} 
                disabled={loading || !spreadsheetId || !range}
              >
                Read Values
              </Button>
              <Button 
                onClick={handleUpdateValues} 
                disabled={loading || !spreadsheetId || !range || !valuesInput}
              >
                Update Values
              </Button>
            </div>

            {error && (
              <div className={`text-sm ${
                error === 'Values updated successfully' 
                  ? 'text-green-500' 
                  : 'text-red-500'
              }`}>
                {error}
              </div>
            )}

            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Current Values:</h3>
              <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96">
                {JSON.stringify(values, null, 2)}
              </pre>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
