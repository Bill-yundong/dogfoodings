import { Show, onMount, JSX } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import Sidebar from './components/Sidebar';
import { isLoggedIn, markDbReady } from './stores/app';
import { bulkImportFoods, getDBStats } from './db';
import { generateFoodDatabase } from './db/food-data';
import Login from './pages/auth/Login';

export default function App(props: { children?: JSX.Element }) {
  const navigate = useNavigate();

  onMount(async () => {
    try {
      const stats = await getDBStats();
      if (stats.foods === 0) {
        const foods = generateFoodDatabase();
        await bulkImportFoods(foods);
        markDbReady(foods.length);
      } else {
        markDbReady(stats.foods);
      }
    } catch (e) {
      const foods = generateFoodDatabase();
      try {
        await bulkImportFoods(foods);
        markDbReady(foods.length);
      } catch (_) {
        markDbReady(0);
      }
    }
  });

  return (
    <Show
      when={isLoggedIn()}
      fallback={<Login />}
    >
      <div class="flex h-screen overflow-hidden">
        <Sidebar />
        <main class="flex-1 overflow-y-auto p-6">
          {props.children}
        </main>
      </div>
    </Show>
  );
}
