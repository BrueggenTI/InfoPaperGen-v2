import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, CheckCircle, Clock, Info, Trash2, RefreshCw } from "lucide-react";

interface DebugLog {
  timestamp: string;
  operation: string;
  step: string;
  status: 'success' | 'error' | 'warning' | 'info';
  details: any;
  error?: string;
  duration?: number;
}

interface DebugStatus {
  timestamp: string;
  environment: string;
  openaiConfigured: boolean;
  recentErrors: DebugLog[];
  systemInfo: {
    nodeVersion: string;
    platform: string;
    memory: any;
  };
}

export function DebugPanel() {
  const [selectedOperation, setSelectedOperation] = useState<string>("");
  const queryClient = useQueryClient();

  // Fetch debug logs
  const { data: debugData, refetch: refetchLogs } = useQuery({
    queryKey: ['/api/debug/logs', selectedOperation],
    queryFn: async () => {
      const url = selectedOperation 
        ? `/api/debug/logs?operation=${encodeURIComponent(selectedOperation)}`
        : '/api/debug/logs';
      const res = await apiRequest("GET", url);
      return await res.json();
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Fetch system status
  const { data: statusData, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/debug/status'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/debug/status");
      return await res.json() as DebugStatus;
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Clear logs mutation
  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/debug/clear", {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/debug/logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/debug/status'] });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('de-DE');
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Debugging Information</h2>
          <p className="text-muted-foreground">
            Detaillierte Informationen über Fehler und Systemstatus
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              refetchLogs();
              refetchStatus();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => clearLogsMutation.mutate()}
            disabled={clearLogsMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Logs löschen
          </Button>
        </div>
      </div>

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="status">System Status</TabsTrigger>
          <TabsTrigger value="logs">Debug Logs</TabsTrigger>
          <TabsTrigger value="errors">Aktuelle Fehler</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          {statusData && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {statusData.openaiConfigured ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    OpenAI Integration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>API Key:</span>
                      <Badge variant={statusData.openaiConfigured ? "default" : "destructive"}>
                        {statusData.openaiConfigured ? "Konfiguriert" : "Fehlt"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Umgebung:</span>
                      <Badge variant="outline">{statusData.environment}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Node.js:</span>
                      <span className="font-mono">{statusData.systemInfo.nodeVersion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform:</span>
                      <span className="font-mono">{statusData.systemInfo.platform}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Memory (RSS):</span>
                      <span className="font-mono">
                        {Math.round(statusData.systemInfo.memory.rss / 1024 / 1024)}MB
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Letzte Aktualisierung:</span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(statusData.timestamp)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedOperation === "" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedOperation("")}
              >
                Alle
              </Button>
              {debugData?.operations?.map((op: string) => (
                <Button
                  key={op}
                  variant={selectedOperation === op ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedOperation(op)}
                >
                  {op.replace(/_/g, ' ')}
                </Button>
              ))}
            </div>
          </div>

          <ScrollArea className="h-[600px] w-full border rounded-md p-4">
            <div className="space-y-3">
              {debugData?.logs?.map((log: DebugLog, index: number) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <Badge variant={getStatusBadgeVariant(log.status)}>
                        {log.status.toUpperCase()}
                      </Badge>
                      <span className="font-semibold">{log.operation}</span>
                      <span className="text-muted-foreground">→ {log.step}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>
                  
                  {log.details && (
                    <div className="mb-2">
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {log.error && (
                    <div className="text-red-600 text-sm font-mono bg-red-50 p-2 rounded">
                      {log.error}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Aktuelle Fehler
              </CardTitle>
              <CardDescription>
                Die letzten 5 aufgetretenen Fehler im System
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statusData?.recentErrors?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  Keine aktuellen Fehler gefunden
                </div>
              ) : (
                <div className="space-y-4">
                  {statusData?.recentErrors?.map((error: DebugLog, index: number) => (
                    <div key={index} className="border-l-4 border-red-500 pl-4 py-2">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-red-600">
                          {error.operation} → {error.step}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(error.timestamp)}
                        </span>
                      </div>
                      {error.error && (
                        <p className="text-sm text-red-700 font-mono bg-red-50 p-2 rounded">
                          {error.error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}