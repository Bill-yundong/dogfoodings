import { createContext, useContext, ParentComponent } from 'solid-js'
import { createSystemStore, SystemStoreType } from '@/store/systemStore'

const SystemContext = createContext<SystemStoreType | undefined>(undefined)

export const SystemProvider: ParentComponent = (props) => {
  const store = createSystemStore()
  return (
    <SystemContext.Provider value={store}>
      {props.children}
    </SystemContext.Provider>
  )
}

export function useSystemStore(): SystemStoreType {
  const context = useContext(SystemContext)
  if (!context) {
    throw new Error('useSystemStore must be used within a SystemProvider')
  }
  return context
}
