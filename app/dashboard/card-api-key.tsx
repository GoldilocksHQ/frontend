import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface CardApiKeyProps {
  apiKey: string;
}

export function CardApiKey({ apiKey }: CardApiKeyProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(apiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-base">API Key</CardTitle>
          <CardDescription>Store your API key at a safe place</CardDescription>
        </CardHeader>
        <CardContent>
        <div className="flex items-center space-x-2">
            <Input
              readOnly
              value={apiKey}
              className="font-mono"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={copyToClipboard}
              className="flex-shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="sr-only">Copy API key</span>
            </Button>
          </div>
        </CardContent>
      </Card>
  )
}

