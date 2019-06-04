import express from 'express';
import http from 'http';
import mqtt from 'mqtt';
import WebSocket from 'ws';
import fs from 'fs'

const jwt = require('jsonwebtoken');


const brokerUrl = process.env.BROKER_URL || 'mqtt://localhost';
var topic = process.env.TOPIC || ' ';
const port = process.env.PORT || 8997;
const app = express();

var cert_pub = fs.readFileSync('./envos.pem');
const server = http.createServer(app);

const wss = new WebSocket.Server({ server,
    verifyClient: function (info, cb) {
        var token = info.req.headers.token
        if (!token)
            cb(false, 401, 'Unauthorized')
        else {
           jwt.verify(token, cert_pub,
            {
                audience: process.env.AUDIENCE,
                issuer: process.env.ISSUER,
                ignoreExpiration: false,
                algorithms: ['RS256']
            }, function (err: any) {
                if (err) {
                    console.log(err)
                    cb(false, 401, 'Unauthorized')
                } else {
                    cb(true)
                }
            })
        }
    }
});

wss.on('connection', (ws: WebSocket) => {
    console.log(`Connected to websocket`)
    var client = mqtt.connect(brokerUrl);
    console.log(`Connected to mqtt_broker`)

    ws.on('message', (topic_r: string) => {
        if(topic!=' ')
        {
            client.unsubscribe(topic);
            console.log(`Unsubscribe by topic: ${topic}`)
        }
        topic = process.env.TOPIC || topic_r;
        client.subscribe(topic);
        console.log(`Subscribe by topic: ${topic}`)
    })

    client.on('message', (topic, message) => {
        ws.send(message.toString());
        console.log(`Send -> ${message} to topic: ${topic} `)
    })
})

server.listen(port, () => {
    console.log(`Server started on port ${port}`);
});