import { LabPage } from './routes/lab.js';
import { ThemeProvider } from './components/theme-context.js';

export function App() {
  return (
    <ThemeProvider>
      <LabPage />
    </ThemeProvider>
  );
}
