import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import session from "express-session";
import FileStore from "session-file-store";

const PORT = 3000;
const app = express();
const DATA_DIR = path.resolve("data");
const DATA_FILE = path.join(DATA_DIR, "works.json");
const UPLOADS_DIR = path.resolve("uploads");
const NEWS_FILE = path.join(DATA_DIR, "news.json");

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(express.static("assets"));
app.use("/uploads", express.static(UPLOADS_DIR));

const FileStoreSession = FileStore(session);

// Настройка сессии
app.use(
  session({
    store: new FileStoreSession({
      path: path.resolve("sessions"), // Папка для хранения сессий
      ttl: 10800, // 3 часа в секундах
    }),
    secret: "your-secret-key", // секретный ключ для шифрования сессий
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 10800000 }, // 3 часа в миллисекундах
  })
);

// Middleware для проверки, авторизован ли пользователь
const isAuthenticated = (req, res, next) => {
  if (req.session.isAdmin) {
    return next();
  }
  res.redirect("/login");
};

// Маршруты для входа и выхода
app.get("/login", (req, res) => {
  const title = "Войти";
  res.render(createPath("login"), { title, isAdmin: req.session.isAdmin });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "password") {
    req.session.isAdmin = true;
    return res.redirect("/");
  }
  res.redirect("/login");
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// Создаем папки для загрузок и данных, если их нет
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}
if (!fs.existsSync(path.resolve("sessions"))) {
  fs.mkdirSync(path.resolve("sessions"));
}

// Создаем файл works.json, если его нет
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "[]");
}
if (!fs.existsSync(NEWS_FILE)) {
  fs.writeFileSync(NEWS_FILE, "[]");
}

const readNewsData = () => {
  const data = fs.readFileSync(NEWS_FILE);
  return JSON.parse(data);
};

const writeNewsData = (data) => {
  fs.writeFileSync(NEWS_FILE, JSON.stringify(data, null, 2));
};

const createPath = (page) => path.resolve("views", `${page}.ejs`);

const readData = () => {
  const data = fs.readFileSync(DATA_FILE);
  return JSON.parse(data);
};

const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Настройки для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

app.get("/", (req, res) => {
  const title = "Главная";
  res.render(createPath("main"), { title, isAdmin: req.session.isAdmin });
});

app.get("/works", (req, res) => {
  const title = "Статьи";
  const works = readData();
  res.render(createPath("portfolio"), {
    title,
    works,
    isAdmin: req.session.isAdmin,
  });
});

app.get("/news", (req, res) => {
  const title = "Новости";
  const news = readNewsData();
  res.render(createPath("news"), { title, news, isAdmin: req.session.isAdmin });
});

app.get("/add-work", isAuthenticated, (req, res) => {
  const title = "Добавить статью";
  res.render(createPath("add-work"), { title, isAdmin: req.session.isAdmin });
});

app.post("/add-work", isAuthenticated, upload.single("image"), (req, res) => {
  const workData = req.body;
  const works = readData();
  const newWork = {
    id: Date.now().toString(),
    title: workData.title,
    description: workData.description,
    image: req.file ? req.file.filename : null,
  };
  works.push(newWork);
  writeData(works);
  res.redirect("/works");
});

app.get("/add-news", isAuthenticated, (req, res) => {
  const title = "Добавить новости";
  res.render(createPath("add-news"), { title, isAdmin: req.session.isAdmin });
});

app.post("/add-news", isAuthenticated, upload.single("image"), (req, res) => {
  const newsData = req.body;
  const news = readNewsData();
  const newNews = {
    id: Date.now().toString(),
    title: newsData.title,
    description: newsData.description,
    image: req.file ? req.file.filename : null,
  };
  news.push(newNews);
  writeNewsData(news);
  res.redirect("/news");
});

app.get("/update-news/:id", isAuthenticated, (req, res) => {
  const id = req.params.id;
  const news = readNewsData();
  const singleNews = news.find((item) => item.id === id);
  if (!singleNews) {
    return res.status(404).send("News not found");
  }
  res.render(createPath("update-news"), {
    title: "Обновить новость",
    news: singleNews,
    isAdmin: req.session.isAdmin,
  });
});

app.post(
  "/update-news/:id",
  isAuthenticated,
  upload.single("image"),
  (req, res) => {
    const id = req.params.id;
    const updatedData = req.body;
    let news = readNewsData();
    news = news.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          ...updatedData,
          image: req.file ? req.file.filename : item.image,
        };
      }
      return item;
    });
    writeNewsData(news);
    res.redirect("/news");
  }
);

app.delete("/api/news/:id", isAuthenticated, (req, res) => {
  const id = req.params.id;
  let news = readNewsData();
  news = news.filter((item) => item.id !== id);
  writeNewsData(news);
  res.status(200).json(id);
});

app.delete("/api/work/:id", isAuthenticated, (req, res) => {
  const id = req.params.id;
  let works = readData();
  works = works.filter((work) => work.id !== id);
  writeData(works);
  res.status(200).json(id);
});

app.get("/update-work/:id", isAuthenticated, (req, res) => {
  const id = req.params.id;
  const works = readData();
  const work = works.find((work) => work.id === id);
  if (!work) {
    return res.status(404).send("Work not found");
  }
  res.render(createPath("update-work"), {
    title: "Обновить статью",
    work,
    isAdmin: req.session.isAdmin,
  });
});

app.post(
  "/update-work/:id",
  isAuthenticated,
  upload.single("image"),
  (req, res) => {
    const id = req.params.id;
    const updatedData = req.body;
    let works = readData();

    works = works.map((work) => {
      if (work.id === id) {
        return {
          ...work,
          title: updatedData.title,
          description: updatedData.description,
          image: req.file ? req.file.filename : updatedData.currentImage, // Обновляем изображение, если новое загружено
        };
      }
      return work;
    });

    writeData(works);
    res.redirect("/works");
  }
);
app.get("/news/:id", (req, res) => {
  const id = req.params.id;
  const news = readNewsData();
  const newsItem = news.find((item) => item.id === id);

  if (newsItem) {
    res.render("news-info", {
      title: "Новость",
      newsItem,
      isAdmin: req.session.isAdmin,
    });
  } else {
    res.status(404).send("Новость не найдена");
  }
});
app.get("/works/:id", (req, res) => {
  const id = req.params.id;
  const works = readData();
  const worksItem = works.find((item) => item.id === id);

  if (worksItem) {
    res.render("work-info", {
      title: "Статья",
      worksItem,
      isAdmin: req.session.isAdmin,
    });
  } else {
    res.status(404).send("Статья не найдена");
  }
});
app.use((req, res, next) => {
  res.status(404).render(createPath("error"), {
    title: "404",
    isAdmin: req.session.isAdmin,
  });
});

app.listen(PORT, () => {
  console.log("Server is running on port", PORT);
});
