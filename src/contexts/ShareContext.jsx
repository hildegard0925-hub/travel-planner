import {
  createContext,
  useContext
} from 'react'

const ShareContext =
  createContext(null)

export function ShareProvider({
  value,
  children
}) {
  return (
    <ShareContext.Provider value={value}>
      {children}
    </ShareContext.Provider>
  )
}

export function useShare() {
  return useContext(ShareContext)
}