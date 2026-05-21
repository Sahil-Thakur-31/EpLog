import "./App.css";
import { AuthProvider } from "./context/AuthContext.jsx";
import { AnimeListProvider } from "./context/AnimeListContext.jsx";
import AppShell from "./components/AppShell.jsx";

function App() {
  return (
    <AuthProvider>
      <AnimeListProvider>
        <AppShell />
      </AnimeListProvider>
    </AuthProvider>
  );
}

export default App;
