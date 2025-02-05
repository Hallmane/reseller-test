import { create } from 'zustand'
import { NewMessage, ResellerTests } from '../types/ResellerTest'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface ResellerTestStore {
  reseller_tests: ResellerTests
  addMessage: (msg: NewMessage) => void
  get: () => ResellerTestStore
  set: (partial: ResellerTestStore | Partial<ResellerTestStore>) => void
}

const useResellerTestStore = create<ResellerTestStore>()(
  persist(
    (set, get) => ({
      reseller_tests: { "New ResellerTest": [] },
      addMessage: (msg: NewMessage) => {
        const { reseller_tests } = get()
        const { reseller_test, author, content } = msg
        if (!reseller_tests[reseller_test]) {
          reseller_tests[reseller_test] = []
        }
        reseller_tests[reseller_test].push({ author, content })
        set({ reseller_tests })
      },

      get,
      set,
    }),
    {
      name: 'reseller_test', // unique name
      storage: createJSONStorage(() => sessionStorage), // (optional) by default, 'localStorage' is used
    }
  )
)

export default useResellerTestStore
