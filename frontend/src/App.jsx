import React from 'react';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Route, Routes, useLocation } from 'react-router-dom';

import DummyPage from './pages/DummyPage/DummyPage'; 


const App = () => {
  // const location = useLocation();
  // const noNavbarPaths = ['/', '/register'];
  // const shouldShowNavbar = !noNavbarPaths.includes(location.pathname);

  // // Optionally hide chatbot on specific routes (e.g., login/register)
  // const noChatbotPaths = ['/', '/register'];
  // const shouldShowChatbot = !noChatbotPaths.includes(location.pathname);

  return (
    <>
      <ToastContainer />
      <div className="app">
        
        <Routes>

          <Route path="/" element={<DummyPage />} />
        </Routes>
        
      </div>
    </>
  );
}

export default App;