// Entry point: starts the Express app on port 8080.
const app = require('./app');

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`App running on http://localhost:${port}`);
});
