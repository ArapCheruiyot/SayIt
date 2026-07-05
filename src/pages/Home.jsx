import React from 'react';
import Navbar from '../components/Navbar';

function Home() {
  return (
    <div className="app-container">
      <Navbar />
      
      <div className="coming-soon">
        <p>📖 Reading helper coming soon...</p>
      </div>
    </div>
  );
}

export default Home;