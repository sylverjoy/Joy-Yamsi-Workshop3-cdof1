const express = require('express');
const axios = require('axios');

const dnsRegistry = express();
dnsRegistry.use(express.json());

// Define a map to store server URLs
const serverRegistry = new Map( );

// Route to register a server
dnsRegistry.post('/registerServer', (req, res) => {  
  const { serverName, url} = req.body;
  serverRegistry.set(serverName, url);
  res.send(`Server ${serverName} registered at ${url}`);
});

// Route to get server URL
dnsRegistry.get('/getServer', async (req, res) => {
  const { serverName }  = req.body;
  
  if (serverRegistry.has(serverName)) {
    const serverUrl = serverRegistry.get(serverName);
    const url = "http://" + serverUrl + "/";
    const response = await axios.get(url)
    res.json({ code: response.status, server: serverUrl });
  } else {
    res.status(404).json({ code: 404, message: 'Server not registered' });
  }
});

// Start the DNS registry server
dnsRegistry.listen(3002, () => {
  console.log('DNS registry server running at http://localhost:3002/');
});