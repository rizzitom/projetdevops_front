import { useMemo, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'
const AUTH_STORAGE_KEY = 'devops.auth'

function getSavedAuth() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    if (!parsed?.user || !parsed?.token) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function normalizeApiError(payload, fallbackMessage) {
  if (!payload) {
    return fallbackMessage
  }

  if (typeof payload.message === 'string') {
    return payload.message
  }

  if (Array.isArray(payload.message) && payload.message.length > 0) {
    return payload.message.join(', ')
  }

  return fallbackMessage
}

function App() {
  const [mode, setMode] = useState('login')
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [auth, setAuth] = useState(() => getSavedAuth())

  const activeForm = useMemo(
    () => (mode === 'login' ? loginData : registerData),
    [mode, loginData, registerData],
  )

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeForm),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          normalizeApiError(data, 'Une erreur est survenue. Reessaye plus tard.'),
        )
      }

      if (mode === 'register') {
        setMode('login')
        setLoginData((previous) => ({
          ...previous,
          email: registerData.email,
          password: '',
        }))
        setNotice('Compte cree. Tu peux maintenant te connecter.')
      } else {
        const nextAuth = {
          token: data.token,
          user: data.user,
        }
        setAuth(nextAuth)
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth))
      }
    } catch (submissionError) {
      setError(submissionError.message)
    } finally {
      setLoading(false)
    }
  }

  function handleFieldChange(event) {
    const { name, value } = event.target

    if (mode === 'login') {
      setLoginData((previous) => ({ ...previous, [name]: value }))
      return
    }

    setRegisterData((previous) => ({ ...previous, [name]: value }))
  }

  function logout() {
    setAuth(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  if (auth?.user) {
    return (
      <main className="home-shell">
        <section className="home-card">
          <p className="eyebrow">Plateforme evenements etudiants</p>
          <h1>Accueil</h1>
          <p className="home-empty">Page volontairement vide pour l'instant.</p>
          <p className="home-user">
            Connecte en tant que <strong>{auth.user.name}</strong>
          </p>
          <button type="button" className="secondary-btn" onClick={logout}>
            Se deconnecter
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-top">
          <p className="eyebrow">Projet DevOps</p>
          <h1>Plateforme D'évènement</h1>
          <p className="subtitle">
            Inscription et connexion des etudiants a la plateforme.
          </p>
        </div>

        <div className="switcher">
          <button
            type="button"
            className={mode === 'login' ? 'switch-btn active' : 'switch-btn'}
            onClick={() => {
              setMode('login')
              setError('')
              setNotice('')
            }}
          >
            Connexion
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'switch-btn active' : 'switch-btn'}
            onClick={() => {
              setMode('register')
              setError('')
              setNotice('')
            }}
          >
            Inscription
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' ? (
            <label>
              Nom complet
              <input
                type="text"
                name="name"
                placeholder="Prénom Nom"
                value={registerData.name}
                onChange={handleFieldChange}
                required
              />
            </label>
          ) : null}

          <label>
            Adresse email
            <input
              type="email"
              name="email"
              placeholder="prenom.nom@etu.univ-amu.fr"s
              value={mode === 'login' ? loginData.email : registerData.email}
              onChange={handleFieldChange}
              required
            />
          </label>

          <label>
            Mot de passe
            <input
              type="password"
              name="password"
              placeholder="******"
              value={mode === 'login' ? loginData.password : registerData.password}
              onChange={handleFieldChange}
              required
              minLength={6}
            />
          </label>

          {error ? <p className="error-box">{error}</p> : null}
          {notice ? <p className="notice-box">{notice}</p> : null}

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading
              ? 'Traitement...'
              : mode === 'login'
                ? 'Se connecter'
                : "S'inscrire"}
          </button>
        </form>
      </section>
    </main>
  )
}

export default App
