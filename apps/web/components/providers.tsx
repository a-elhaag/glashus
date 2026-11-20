"use client"

import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { onAuthStateChanged, signOut, type User } from "firebase/auth"
import { ThemeProvider } from "@/components/theme-provider"
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase"

interface AuthContextValue {
  user: User | null
  loading: boolean
  signOutUser: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOutUser: async () => {},
})

export function useAuth(): AuthContextValue {
  return React.useContext(AuthContext)
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  )
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState<boolean>(isFirebaseConfigured)

  React.useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }
    const auth = getFirebaseAuth()
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
      if (!nextUser) {
        queryClient.clear()
      }
    })
  }, [queryClient])

  const signOutUser = React.useCallback(async () => {
    if (!isFirebaseConfigured) return
    await signOut(getFirebaseAuth())
    queryClient.clear()
  }, [queryClient])

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={{ user, loading, signOutUser }}>
          {children}
        </AuthContext.Provider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
