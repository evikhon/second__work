import express from "express";
import cors from "cors";
import { promises as fs } from "fs";
import { v4 as uuidv4 } from "uuid";

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_PATH = new URL("./data.json", import.meta.url);

app.use(cors());
app.use(express.json());

const tokens = new Map();

const defaultData = {
  users: [],
  works: []
};

const readData = async () => {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      await fs.writeFile(DATA_PATH, JSON.stringify(defaultData, null, 2));
      return { ...defaultData };
    }
    throw error;
  }
};

const writeData = async (data) => {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
};

const getAuthUser = (req) => {
  const header = req.headers.authorization;
  if (!header) {
    return null;
  }
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) {
    return null;
  }
  const userId = tokens.get(token);
  return userId || null;
};

app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Укажите имя пользователя и пароль." });
  }

  const data = await readData();
  const existing = data.users.find((user) => user.username === username);
  if (existing) {
    return res.status(409).json({ message: "Пользователь уже существует." });
  }

  const user = { id: uuidv4(), username, password };
  data.users.push(user);
  await writeData(data);

  const token = uuidv4();
  tokens.set(token, user.id);

  return res.json({
    token,
    profile: { id: user.id, username: user.username }
  });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Укажите имя пользователя и пароль." });
  }

  const data = await readData();
  const user = data.users.find((item) => item.username === username);
  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Неверные учетные данные." });
  }

  const token = uuidv4();
  tokens.set(token, user.id);

  return res.json({
    token,
    profile: { id: user.id, username: user.username }
  });
});

app.get("/api/works", async (req, res) => {
  const userId = getAuthUser(req);
  if (!userId) {
    return res.status(401).json({ message: "Требуется авторизация." });
  }

  const data = await readData();
  const works = data.works.filter((work) => work.userId === userId);
  return res.json({ works });
});

app.post("/api/works", async (req, res) => {
  const userId = getAuthUser(req);
  if (!userId) {
    return res.status(401).json({ message: "Требуется авторизация." });
  }

  const { title, genre, description, text } = req.body;
  if (!title || !genre || !description || !text) {
    return res.status(400).json({ message: "Заполните все поля произведения." });
  }

  const data = await readData();
  const user = data.users.find((item) => item.id === userId);
  const work = {
    id: uuidv4(),
    userId,
    author: user?.username || "Неизвестный автор",
    title,
    genre,
    description,
    text,
    createdAt: new Date().toISOString()
  };

  data.works.unshift(work);
  await writeData(data);

  const works = data.works.filter((item) => item.userId === userId);
  return res.json({ works });
});

app.delete("/api/works/:id", async (req, res) => {
  const userId = getAuthUser(req);
  if (!userId) {
    return res.status(401).json({ message: "Требуется авторизация." });
  }

  const data = await readData();
  const beforeCount = data.works.length;
  data.works = data.works.filter((work) => !(work.id === req.params.id && work.userId === userId));
  if (data.works.length === beforeCount) {
    return res.status(404).json({ message: "Произведение не найдено." });
  }
  await writeData(data);

  const works = data.works.filter((item) => item.userId === userId);
  return res.json({ works });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
