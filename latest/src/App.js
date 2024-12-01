// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import VirtualHome from './components/VirtualHome';
import './styles.css';
import SmartHome from './components/smartHome';
import UserProfileSelection from './components/userProfile';

const App = () => {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/virtual-home/:userId" element={<VirtualHome />} />
          <Route path="/smart-home" element={<SmartHome />} /> 
          <Route path="/users/:adminId" element={<UserProfileSelection/>} />  
          {/* <Route path="/users/:adminId" element={<Users />} /> */}
        </Routes>
      </div>
    </Router>
  );
};

export default App;
