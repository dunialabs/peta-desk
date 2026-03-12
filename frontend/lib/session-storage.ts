const inflightSuffix = ':inflight'

const getInflightSessionKey = (key: string) => `${key}${inflightSuffix}`

export const claimSessionStorageItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null

  const inflightKey = getInflightSessionKey(key)
  const pendingValue = sessionStorage.getItem(key)

  if (pendingValue !== null) {
    sessionStorage.setItem(inflightKey, pendingValue)
    sessionStorage.removeItem(key)
    return pendingValue
  }

  return sessionStorage.getItem(inflightKey)
}

export const clearClaimedSessionStorageItem = (key: string) => {
  if (typeof window === 'undefined') return

  sessionStorage.removeItem(key)
  sessionStorage.removeItem(getInflightSessionKey(key))
}
