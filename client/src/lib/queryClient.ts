import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Clone the response so we can read it multiple times if needed
      const resClone = res.clone();
      const errorData = await resClone.json();
      // Use userFriendlyMessage if available, otherwise fall back to message or generic error
      const errorMessage = errorData.userFriendlyMessage || errorData.message || res.statusText;
      throw new Error(errorMessage);
    } catch (parseError) {
      // If JSON parsing fails, fall back to text from original response
      try {
        const text = await res.text();
        throw new Error(`${res.status}: ${text || res.statusText}`);
      } catch (textError) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      // Performance: Daten 5 Minuten im Cache halten statt Infinity
      staleTime: 5 * 60 * 1000, // 5 Minuten
      // Performance: Garbage Collection nach 10 Minuten
      gcTime: 10 * 60 * 1000, // 10 Minuten (früher cacheTime)
      retry: false,
      // Performance: Parallele Anfragen begrenzen
      networkMode: 'online',
    },
    mutations: {
      retry: false,
      // Performance: Garbage Collection für Mutations
      gcTime: 5 * 60 * 1000, // 5 Minuten
    },
  },
});
