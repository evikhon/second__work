import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

const emptyForm = {
  title: "",
  genre: "",
  description: "",
  text: ""
};

const formatDate = (value) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
};

const useStoredState = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
};

export default function App() {
  const [mode, setMode] = useState("login");
  const [authForm, setAuthForm] = useState({ username: "", password: "" });
  const [token, setToken] = useStoredState("authToken", "");
  const [profile, setProfile] = useStoredState("authProfile", null);
  const [works, setWorks] = useState([]);
  const [workForm, setWorkForm] = useState(emptyForm);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(false);

  const isAuthed = Boolean(token);

  const headers = useMemo(() => {
    const base = { "Content-Type": "application/json" };
    if (token) {
      return { ...base, Authorization: `Bearer ${token}` };
    }
    return base;
  }, [token]);

  const showStatus = (type, message) => {
    setStatus({ type, message });
    window.setTimeout(() => setStatus({ type: "", message: "" }), 3500);
  };

  const fetchWorks = async () => {
    if (!token) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/works`, { headers });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Не удалось загрузить список работ.");
      }
      setWorks(data.works);
    } catch (error) {
      showStatus("error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorks();
  }, [token]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    const endpoint = mode === "register" ? "register" : "login";

    try {
      const response = await fetch(`${API_BASE}/api/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Ошибка авторизации.");
      }
      setToken(data.token);
      setProfile(data.profile);
      setAuthForm({ username: "", password: "" });
      showStatus("success", `Добро пожаловать, ${data.profile.username}!`);
    } catch (error) {
      showStatus("error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setToken("");
    setProfile(null);
    setWorks([]);
    setWorkForm(emptyForm);
    showStatus("success", "Вы вышли из аккаунта.");
  };

  const handleWorkSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/works`, {
        method: "POST",
        headers,
        body: JSON.stringify(workForm)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Не удалось опубликовать работу.");
      }
      setWorks(data.works);
      setWorkForm(emptyForm);
      showStatus("success", "Произведение опубликовано!");
    } catch (error) {
      showStatus("error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/works/${id}`, {
        method: "DELETE",
        headers
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Не удалось удалить работу.");
      }
      setWorks(data.works);
      showStatus("success", "Произведение удалено.");
    } catch (error) {
      showStatus("error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="badge">Литературный портал</p>
          <h1>Создавайте, публикуйте, вдохновляйте.</h1>
          <p className="subtitle">
            Современная платформа для авторов с удобной регистрацией, хранением работ и управлением
            публикациями.
          </p>
        </div>
        <div className="hero-card">
          <h2>{isAuthed ? "Панель автора" : "Регистрация / Вход"}</h2>
          {!isAuthed ? (
            <form className="form" onSubmit={handleAuthSubmit}>
              <div className="switch">
                <button
                  type="button"
                  className={mode === "login" ? "active" : ""}
                  onClick={() => setMode("login")}
                >
                  Вход
                </button>
                <button
                  type="button"
                  className={mode === "register" ? "active" : ""}
                  onClick={() => setMode("register")}
                >
                  Регистрация
                </button>
              </div>
              <label>
                Имя пользователя
                <input
                  value={authForm.username}
                  onChange={(event) =>
                    setAuthForm((prev) => ({ ...prev, username: event.target.value }))
                  }
                  placeholder="literature_lover"
                  required
                />
              </label>
              <label>
                Пароль
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) =>
                    setAuthForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  placeholder="••••••••"
                  required
                />
              </label>
              <button className="primary" type="submit" disabled={isLoading}>
                {mode === "register" ? "Создать аккаунт" : "Войти"}
              </button>
            </form>
          ) : (
            <div className="profile">
              <div>
                <p className="muted">Автор</p>
                <p className="profile-name">{profile?.username}</p>
              </div>
              <div>
                <p className="muted">Публикаций</p>
                <p className="profile-name">{works.length}</p>
              </div>
              <button className="ghost" type="button" onClick={handleLogout}>
                Выйти
              </button>
            </div>
          )}
          {status.message ? <div className={`status ${status.type}`}>{status.message}</div> : null}
        </div>
      </header>

      <main>
        <section className="panel">
          <div>
            <h2>Новая публикация</h2>
            <p className="subtitle">Добавьте свои рассказы, стихи или эссе — всё хранится в вашем профиле.</p>
          </div>
          <form className="form" onSubmit={handleWorkSubmit}>
            <label>
              Название
              <input
                value={workForm.title}
                onChange={(event) =>
                  setWorkForm((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Туман над рекой"
                required
                disabled={!isAuthed}
              />
            </label>
            <div className="row">
              <label>
                Жанр
                <input
                  value={workForm.genre}
                  onChange={(event) =>
                    setWorkForm((prev) => ({ ...prev, genre: event.target.value }))
                  }
                  placeholder="Роман"
                  required
                  disabled={!isAuthed}
                />
              </label>
              <label>
                Короткое описание
                <input
                  value={workForm.description}
                  onChange={(event) =>
                    setWorkForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="О чём эта история"
                  required
                  disabled={!isAuthed}
                />
              </label>
            </div>
            <label>
              Текст произведения
              <textarea
                value={workForm.text}
                onChange={(event) => setWorkForm((prev) => ({ ...prev, text: event.target.value }))}
                placeholder="Начните писать здесь..."
                rows={6}
                required
                disabled={!isAuthed}
              />
            </label>
            <button className="primary" type="submit" disabled={!isAuthed || isLoading}>
              Опубликовать
            </button>
            {!isAuthed ? (
              <p className="muted">Сначала войдите или зарегистрируйтесь, чтобы публиковать работы.</p>
            ) : null}
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Ваши произведения</h2>
              <p className="subtitle">Управляйте опубликованными текстами и удаляйте устаревшие.</p>
            </div>
            <button className="ghost" type="button" onClick={fetchWorks} disabled={!isAuthed}>
              Обновить
            </button>
          </div>

          {!isAuthed ? (
            <div className="empty">Войдите, чтобы увидеть список своих произведений.</div>
          ) : isLoading ? (
            <div className="empty">Загружаем список...</div>
          ) : works.length === 0 ? (
            <div className="empty">Пока нет публикаций. Самое время добавить первую!</div>
          ) : (
            <div className="grid">
              {works.map((work) => (
                <article key={work.id} className="card">
                  <div className="card-header">
                    <div>
                      <h3>{work.title}</h3>
                      <p className="muted">{work.genre}</p>
                    </div>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDelete(work.id)}
                      disabled={isLoading}
                    >
                      Удалить
                    </button>
                  </div>
                  <p className="description">{work.description}</p>
                  <p className="content">{work.text}</p>
                  <div className="meta">
                    <span>Автор: {work.author}</span>
                    <span>{formatDate(work.createdAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
