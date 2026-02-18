import React from 'react';
import { Link } from 'react-router-dom'; 

function Home() {
  return (
    <div style={styles.container}>
      <h1>Bienvenue sur MonApp DevOps 🚀</h1>
      <p>Gérez vos projets simplement et efficacement.</p>
      
      <div style={styles.buttonContainer}>
        {}
        <Link to="/login">
          <button style={styles.buttonPrimary}>Se connecter</button>
        </Link>

        <Link to="/register">
          <button style={styles.buttonSecondary}>Créer un compte</button>
        </Link>
      </div>
    </div>
  );
}

const styles = {
  container: {
    textAlign: 'center',
    marginTop: '50px',
    fontFamily: 'Arial, sans-serif',
  },
  buttonContainer: {
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
  },
  buttonPrimary: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  buttonSecondary: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
  }
};

export default Home;