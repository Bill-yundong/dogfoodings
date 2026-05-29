import type { JSX } from 'solid-js'
import Sidebar from './Sidebar'

export default function Layout(props: { children?: JSX.Element }) {
  return (
    <div class="flex h-screen overflow-hidden bg-[#0f172a]">
      <Sidebar />
      <main class="flex-1 overflow-auto">
        <div class="min-h-full p-8">
          {props.children}
        </div>
      </main>
    </div>
  )
}
