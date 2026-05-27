/* @refresh reload */
import { render } from 'solid-js/web';
import { Router, Route } from '@solidjs/router';
import App from './App';
import Dashboard from './pages/dashboard/Dashboard';
import MealInput from './pages/dashboard/MealInput';
import BloodSugar from './pages/dashboard/BloodSugar';
import Nutrition from './pages/dashboard/Nutrition';
import Timeline from './pages/dashboard/Timeline';
import Analyst from './pages/analyst/Analyst';
import Alignment from './pages/analyst/Alignment';
import Overview from './pages/analyst/Overview';
import Alerts from './pages/analyst/Alerts';
import Reports from './pages/analyst/Reports';
import FoodDatabase from './pages/food-database/FoodDatabase';
import FoodDetail from './pages/food-database/FoodDetail';
import './index.css';

const root = document.getElementById('root');

if (!root) throw new Error('Root element not found');

render(
  () => (
    <Router root={App}>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/meal-input" component={MealInput} />
      <Route path="/dashboard/blood-sugar" component={BloodSugar} />
      <Route path="/dashboard/nutrition" component={Nutrition} />
      <Route path="/dashboard/timeline" component={Timeline} />
      <Route path="/analyst" component={Analyst} />
      <Route path="/analyst/alignment" component={Alignment} />
      <Route path="/analyst/overview" component={Overview} />
      <Route path="/analyst/alerts" component={Alerts} />
      <Route path="/analyst/reports" component={Reports} />
      <Route path="/food-database" component={FoodDatabase} />
      <Route path="/food-database/:id" component={FoodDetail} />
    </Router>
  ),
  root
);
