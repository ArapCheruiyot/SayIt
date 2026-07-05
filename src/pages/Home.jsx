import React from 'react';
import Navbar from '../components/Navbar';
import Camera from '../components/Camera';

function Home() {
  return (
    <div className="app-container">
      <Navbar />
      <Camera />
      <div className="status-message">
        📷 Place a word in the box above
      </div>
    </div>
  );
}

export default Home;