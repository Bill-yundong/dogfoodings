import { render } from 'solid-js/web';
import './index.css';
import { Dashboard } from './components/Dashboard';

const root = document.getElementById('root');

if (root) {
  render(() => <Dashboard />, root);
}
