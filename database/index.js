import sqlite3 from "sqlite3";

//Initialize the SQLite database and create a table for storing user token counts
const db = new sqlite3.Database(":memory:", (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Connected to the in-memory SQLite database.");
  }
});

const dbName = "user_token_counts";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS ${dbName} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  token_count INTEGER NOT NULL
);`;

db.run(createTableQuery, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Table created.");
  }
});

// Function to track and update token counts
const trackTokenCount = (userId, tokens_to_add) => {
  if (!userId) {
    return { error: "User ID header is missing." };
  }

  const findUserQuery = `SELECT * FROM ${dbName} WHERE user_id = ?`;
  const insertOrUpdateUserQuery = `
      INSERT INTO ${dbName}(user_id, token_count)
      VALUES(?, ?)
      ON CONFLICT(user_id)
      DO UPDATE SET token_count = token_count + ${tokens_to_add}
    `;

  db.get(findUserQuery, [userId], (err, row) => {
    if (err) {
      console.error(err.message);
      return { error: "Internal server error." };
    }

    const tokenCount = row ? row.token_count + tokens_to_add : tokens_to_add;
    console.log("user_id: " + userId + ", tokenCount: " + tokenCount);

    db.run(insertOrUpdateUserQuery, [userId, tokenCount], (err) => {
      if (err) {
        console.error(err.message);
        return { error: "Internal server error." };
      }
      return { tokenCount };
    });
  });
};

export default trackTokenCount;
