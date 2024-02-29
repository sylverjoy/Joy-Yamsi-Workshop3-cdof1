const express = require('express');
const cors = require('cors')
const app = express();
const port = 3001; 

app.use(cors());

app.get('/', (req, res) => {
  res.status(200).send('Hello, world!');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});


