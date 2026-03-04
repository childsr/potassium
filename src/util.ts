export function cloneMap<K, V>(map: Map<K, V>): Map<K, V> {
  const newMap = new Map<K, V>()
  for (const [key, value] of map.entries()) {
    if (value instanceof Map) {
      newMap.set(key, cloneMap(value as unknown as Map<any, any>) as unknown as V)
    }
    else if (value instanceof Set) {
      newMap.set(key, cloneSet(value as unknown as Set<any>) as unknown as V)
    }
    else {
      newMap.set(key, value)
    }
  }
  return newMap
}
export function cloneSet<T>(set: Set<T>): Set<T> {
  const newSet = new Set<T>()
  for (const value of set.values()) {
    if (value instanceof Map) {
      newSet.add(cloneMap(value as unknown as Map<any, any>) as unknown as T)
    }
    else if (value instanceof Set) {
      newSet.add(cloneSet(value as unknown as Set<any>) as unknown as T)
    }
    else {
      newSet.add(value)
    }
  }
  return newSet
}
