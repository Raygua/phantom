import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Lobby from './pages/Lobby.jsx';
import CreateGame from './pages/CreateGame.jsx';
import SpiritLinkBoard from './pages/PhantomBoard.jsx'; 

function App() {
  return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateGame />} />
          <Route path="/lobby/:gameId" element={<Lobby />} />
          <Route path="/spirit-link/:gameId" element={<SpiritLinkBoard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
  )
}

export default App;