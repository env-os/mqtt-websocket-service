import express from 'express';
import http from 'http';
import mqtt from 'mqtt';
import WebSocket from 'ws';


const brokerUrl = process.env.BROKER_URL || 'mqtt://localhost';
const topic = process.env.TOPIC || 'general';
const port = process.env.PORT || 8999;
const app = express();

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws: WebSocket) => {

    const client = mqtt.connect(brokerUrl)
    client.on('connect', () => {
        client.subscribe(topic);
    })

    client.on('message', (topic, message) => {
        ws.send(message.toString());
    })
});

server.listen(port, () => {
    console.log(`Server started on port ${port}`);
});