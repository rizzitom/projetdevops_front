import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'
const AUTH_STORAGE_KEY = 'devops.auth'

function getSavedAuth() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    if (!parsed?.user || !parsed?.token) return null
    return parsed
  } catch {
    return null
  }
}

function normalizeApiError(payload, fallbackMessage) {
  if (!payload) return fallbackMessage
  if (typeof payload.message === 'string') return payload.message
  if (Array.isArray(payload.message) && payload.message.length > 0) {
    return payload.message.join(', ')
  }
  return fallbackMessage
}

async function request(endpoint, options = {}, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(
      normalizeApiError(data, 'Une erreur est survenue. Reessaye plus tard.'),
    )
  }

  return data
}

function App() {
  const [mode, setMode] = useState('login')
  const [activeTab, setActiveTab] = useState('events')
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [contentLoading, setContentLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [auth, setAuth] = useState(() => getSavedAuth())
  const [students, setStudents] = useState([])
  const [events, setEvents] = useState([])
  const [studentForm, setStudentForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
  })
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
  })
  const [editingStudentId, setEditingStudentId] = useState(null)
  const [editingEventId, setEditingEventId] = useState(null)
  const [selectedStudentIdByEvent, setSelectedStudentIdByEvent] = useState({})

  const activeForm = useMemo(
    () => (mode === 'login' ? loginData : registerData),
    [mode, loginData, registerData],
  )
  const isAdmin = auth?.user?.role === 'ADMIN'

  async function loadData(currentAuth) {
    if (!currentAuth?.token) return

    setContentLoading(true)
    setError('')
    try {
      const [studentsData, eventsData] = await Promise.all([
        request('/students', {}, currentAuth.token),
        request('/events', {}, currentAuth.token),
      ])
      setStudents(studentsData)
      setEvents(eventsData)
    } catch (dataError) {
      setError(dataError.message)
    } finally {
      setContentLoading(false)
    }
  }

  useEffect(() => {
    if (auth?.token) {
      loadData(auth)
    }
  }, [auth])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'

    try {
      const data = await request(
        endpoint,
        {
          method: 'POST',
          body: JSON.stringify(activeForm),
        },
        undefined,
      )

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
    setStudents([])
    setEvents([])
    setStudentForm({ firstName: '', lastName: '', email: '' })
    setEventForm({ title: '', description: '', date: '', location: '' })
    setEditingStudentId(null)
    setEditingEventId(null)
    setSelectedStudentIdByEvent({})
    setActiveTab('events')
    setError('')
    setNotice('')
  }

  function updateStudentFormField(event) {
    const { name, value } = event.target
    setStudentForm((previous) => ({ ...previous, [name]: value }))
  }

  function updateEventFormField(event) {
    const { name, value } = event.target
    setEventForm((previous) => ({ ...previous, [name]: value }))
  }

  async function handleStudentSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    const endpoint = editingStudentId
      ? `/students/${editingStudentId}`
      : '/students'
    const method = editingStudentId ? 'PATCH' : 'POST'

    try {
      await request(
        endpoint,
        {
          method,
          body: JSON.stringify(studentForm),
        },
        auth?.token,
      )
      await loadData(auth)
      setNotice(
        editingStudentId
          ? 'Etudiant mis a jour.'
          : 'Etudiant cree avec succes.',
      )
      setStudentForm({ firstName: '', lastName: '', email: '' })
      setEditingStudentId(null)
    } catch (submissionError) {
      setError(submissionError.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleEventSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    const endpoint = editingEventId ? `/events/${editingEventId}` : '/events'
    const method = editingEventId ? 'PATCH' : 'POST'

    try {
      await request(
        endpoint,
        {
          method,
          body: JSON.stringify(eventForm),
        },
        auth?.token,
      )
      await loadData(auth)
      setNotice(
        editingEventId ? 'Evenement mis a jour.' : 'Evenement cree avec succes.',
      )
      setEventForm({ title: '', description: '', date: '', location: '' })
      setEditingEventId(null)
    } catch (submissionError) {
      setError(submissionError.message)
    } finally {
      setLoading(false)
    }
  }

  function startEditStudent(student) {
    setEditingStudentId(student.id)
    setStudentForm({
      firstName: student.firstName ?? '',
      lastName: student.lastName ?? '',
      email: student.email ?? '',
    })
    setActiveTab('students')
  }

  function startEditEvent(eventItem) {
    setEditingEventId(eventItem.id)
    setEventForm({
      title: eventItem.title ?? '',
      description: eventItem.description ?? '',
      date: eventItem.date ? new Date(eventItem.date).toISOString().slice(0, 16) : '',
      location: eventItem.location ?? '',
    })
    setActiveTab('events')
  }

  async function deleteStudent(studentId) {
    setError('')
    setNotice('')
    setLoading(true)
    try {
      await request(`/students/${studentId}`, { method: 'DELETE' }, auth?.token)
      await loadData(auth)
      setNotice('Etudiant supprime.')
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setLoading(false)
    }
  }

  async function cancelEvent(eventId) {
    setError('')
    setNotice('')
    setLoading(true)
    try {
      await request(`/events/${eventId}/cancel`, { method: 'PATCH' }, auth?.token)
      await loadData(auth)
      setNotice('Evenement annule.')
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setLoading(false)
    }
  }

  async function subscribeToEvent(eventId) {
    const studentId = selectedStudentIdByEvent[eventId]
    if (!studentId) {
      setError('Selectionne un etudiant pour l inscription.')
      return
    }

    setError('')
    setNotice('')
    setLoading(true)
    try {
      await request(
        `/events/${eventId}/subscribe/${studentId}`,
        { method: 'POST' },
        auth?.token,
      )
      setNotice('Inscription effectuee.')
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribeFromEvent(eventId) {
    const studentId = selectedStudentIdByEvent[eventId]
    if (!studentId) {
      setError('Selectionne un etudiant pour la desinscription.')
      return
    }

    setError('')
    setNotice('')
    setLoading(true)
    try {
      await request(
        `/events/${eventId}/unsubscribe/${studentId}`,
        { method: 'DELETE' },
        auth?.token,
      )
      setNotice('Desinscription effectuee.')
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setLoading(false)
    }
  }

  function formatDate(value) {
    if (!value) return 'Date inconnue'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleString('fr-FR')
  }

  if (auth?.user) {
    return (
      <main className="dashboard-shell">
        <section className="dashboard-card">
          <header className="dashboard-header">
            <div>
              <p className="eyebrow">Plateforme evenements etudiants</p>
              <h1>Bienvenue {auth.user.name}</h1>
              <p className="subtitle">
                Role: {auth.user.role ?? 'USER'} | Gestion simple des etudiants et
                des evenements.
              </p>
            </div>
            <button type="button" className="secondary-btn" onClick={logout}>
              Se deconnecter
            </button>
          </header>

          <div className="switcher dashboard-tabs">
            <button
              type="button"
              className={activeTab === 'events' ? 'switch-btn active' : 'switch-btn'}
              onClick={() => setActiveTab('events')}
            >
              Evenements
            </button>
            <button
              type="button"
              className={
                activeTab === 'students' ? 'switch-btn active' : 'switch-btn'
              }
              onClick={() => setActiveTab('students')}
            >
              Etudiants
            </button>
          </div>

          {error ? <p className="error-box">{error}</p> : null}
          {notice ? <p className="notice-box">{notice}</p> : null}
          {contentLoading ? <p className="home-empty">Chargement...</p> : null}

          {activeTab === 'events' ? (
            <section className="content-grid">
              {isAdmin ? (
                <form className="panel-form" onSubmit={handleEventSubmit}>
                  <h2>{editingEventId ? 'Modifier evenement' : 'Creer evenement'}</h2>
                  <label>
                    Titre
                    <input
                      type="text"
                      name="title"
                      value={eventForm.title}
                      onChange={updateEventFormField}
                      required
                    />
                  </label>
                  <label>
                    Description
                    <input
                      type="text"
                      name="description"
                      value={eventForm.description}
                      onChange={updateEventFormField}
                    />
                  </label>
                  <label>
                    Date et heure
                    <input
                      type="datetime-local"
                      name="date"
                      value={eventForm.date}
                      onChange={updateEventFormField}
                      required
                    />
                  </label>
                  <label>
                    Lieu
                    <input
                      type="text"
                      name="location"
                      value={eventForm.location}
                      onChange={updateEventFormField}
                    />
                  </label>
                  <button type="submit" className="primary-btn" disabled={loading}>
                    {editingEventId ? 'Mettre a jour' : 'Creer'}
                  </button>
                  {editingEventId ? (
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => {
                        setEditingEventId(null)
                        setEventForm({
                          title: '',
                          description: '',
                          date: '',
                          location: '',
                        })
                      }}
                    >
                      Annuler edition
                    </button>
                  ) : null}
                </form>
              ) : null}

              <div className="panel-list">
                <h2>Liste des evenements</h2>
                {events.length === 0 ? (
                  <p className="home-empty">Aucun evenement pour le moment.</p>
                ) : (
                  <div className="item-list">
                    {events.map((eventItem) => (
                      <article className="item-card" key={eventItem.id}>
                        <p className="item-title">
                          {eventItem.title}{' '}
                          <span className="item-badge">{eventItem.status}</span>
                        </p>
                        <p className="item-meta">{formatDate(eventItem.date)}</p>
                        {eventItem.location ? (
                          <p className="item-meta">Lieu: {eventItem.location}</p>
                        ) : null}
                        {eventItem.description ? (
                          <p className="item-text">{eventItem.description}</p>
                        ) : null}

                        <label className="inline-label">
                          Etudiant
                          <select
                            value={selectedStudentIdByEvent[eventItem.id] ?? ''}
                            onChange={(evt) =>
                              setSelectedStudentIdByEvent((previous) => ({
                                ...previous,
                                [eventItem.id]: evt.target.value,
                              }))
                            }
                          >
                            <option value="">Choisir un etudiant</option>
                            {students.map((student) => (
                              <option key={student.id} value={student.id}>
                                {student.firstName} {student.lastName}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="item-actions">
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => subscribeToEvent(eventItem.id)}
                            disabled={loading || eventItem.status === 'CANCELED'}
                          >
                            Inscrire
                          </button>
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => unsubscribeFromEvent(eventItem.id)}
                            disabled={loading}
                          >
                            Desinscrire
                          </button>
                          {isAdmin ? (
                            <>
                              <button
                                type="button"
                                className="secondary-btn"
                                onClick={() => startEditEvent(eventItem)}
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                className="secondary-btn danger"
                                onClick={() => cancelEvent(eventItem.id)}
                                disabled={loading || eventItem.status === 'CANCELED'}
                              >
                                Annuler evenement
                              </button>
                            </>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="content-grid">
              {isAdmin ? (
                <form className="panel-form" onSubmit={handleStudentSubmit}>
                  <h2>{editingStudentId ? 'Modifier etudiant' : 'Creer etudiant'}</h2>
                  <label>
                    Prenom
                    <input
                      type="text"
                      name="firstName"
                      value={studentForm.firstName}
                      onChange={updateStudentFormField}
                      required
                    />
                  </label>
                  <label>
                    Nom
                    <input
                      type="text"
                      name="lastName"
                      value={studentForm.lastName}
                      onChange={updateStudentFormField}
                      required
                    />
                  </label>
                  <label>
                    Adresse email
                    <input
                      type="email"
                      name="email"
                      value={studentForm.email}
                      onChange={updateStudentFormField}
                      required
                    />
                  </label>
                  <button type="submit" className="primary-btn" disabled={loading}>
                    {editingStudentId ? 'Mettre a jour' : 'Creer'}
                  </button>
                  {editingStudentId ? (
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => {
                        setEditingStudentId(null)
                        setStudentForm({ firstName: '', lastName: '', email: '' })
                      }}
                    >
                      Annuler edition
                    </button>
                  ) : null}
                </form>
              ) : null}

              <div className="panel-list">
                <h2>Liste des etudiants</h2>
                {students.length === 0 ? (
                  <p className="home-empty">Aucun etudiant pour le moment.</p>
                ) : (
                  <div className="item-list">
                    {students.map((student) => (
                      <article className="item-card" key={student.id}>
                        <p className="item-title">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="item-meta">{student.email}</p>
                        {isAdmin ? (
                          <div className="item-actions">
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() => startEditStudent(student)}
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              className="secondary-btn danger"
                              onClick={() => deleteStudent(student.id)}
                              disabled={loading}
                            >
                              Supprimer
                            </button>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </section>
      </main>
    )
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-top">
          <p className="eyebrow">Projet DevOps</p>
          <h1>Plateforme D'evenement</h1>
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
                placeholder="Prenom Nom"
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
              placeholder="prenom.nom@etu.univ-amu.fr"
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
