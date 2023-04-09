import express from "express";
import { OpenAIApi, Configuration } from "openai";
import { OAuth2Client } from "google-auth-library";
import trackTokenCount from "./database/index.js";

// load .env variables
import * as dotenv from "dotenv";
dotenv.config();

// create server
const app = express();
app.use(express.json());

// set-up OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// set-up Google Authentication
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

// app.post("/authenticate", async (req, res) => {
//   const { token } = req.body;
//   try {
//     const ticket = await oauth2Client.verifyIdToken({
//       idToken: token,
//       audience: GOOGLE_CLIENT_ID,
//     });
//     const payload = ticket.getPayload();
//     res.json({ success: true, userId: payload.sub, email: payload.email });
//   } catch (error) {
//     res.status(401).json({ success: false, error: error.message });
//   }
// });

// verify user
const verifyUser = async (idToken) => {
  try {
    const ticket = await oauth2Client.verifyIdToken({
      idToken: idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return payload.email;
  } catch (error) {
    console.log(error);
    return null;
  }
};

// handle post request for GPT-3 completion
app.post("/complete-text", async (req, res) => {
  const { text, idToken } = req.body;

  // verify user
  const userId = await verifyUser(idToken);
  if (!userId) {
    res.status(401).json({ success: false, error: "Invalid user." });
    return;
  }
  console.log("text:" + text);
  openai
    .createCompletion({
      model: "text-davinci-003",
      prompt: text,
      max_tokens: 150,
      temperature: 0.6,
    })
    .then((response) => {
      // track token count for user
      const tokens_to_add = response.data.usage.total_tokens;
      trackTokenCount(userId, tokens_to_add);

      // return the completion
      res.json({ success: true, text: response.data.choices[0].text });
    });
});

// open server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
