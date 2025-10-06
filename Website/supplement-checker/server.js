// import express from 'express';
// import fetch from 'node-fetch';
// import cors from 'cors';
// import dotenv from 'dotenv';

// dotenv.config();

// const app = express();
// const PORT = 5000;

// app.use(cors());
// app.use(express.json());

// app.post("/translate", async (req, res) => {
//   const { text } = req.body;

//   try {
//     const response = await fetch("https://api-free.deepl.com/v2/translate", {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: new URLSearchParams({
//         auth_key: process.env.DEEPL_API_KEY,
//         text,
//         source_lang: "auto",
//         target_lang: "EN"
//       })
//     });

//     const data = await response.json();
//     res.json({ translatedText: data.translations[0].text });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Translation failed." });
//   }
// });

// app.listen(PORT, () => {
//   console.log(`🚀 Server running at http://localhost:${PORT}`);
// });

import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.post("/translate", async (req, res) => {
  const { text } = req.body;

  try {
    const response = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        auth_key: process.env.DEEPL_API_KEY,
        text,
        source_lang: "auto",
        target_lang: "EN"
      })
    });

    const data = await response.json();
    res.json({ translatedText: data.translations[0].text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Translation failed." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
