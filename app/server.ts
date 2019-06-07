import express from 'express';
import http from 'http';
import mqtt from 'mqtt';
import WebSocket from 'ws';
import fs from 'fs'

const jwt = require('jsonwebtoken');


const brokerUrl = process.env.BROKER_URL || 'mqtt://localhost';
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
    console.log(`Websocket connection established.`)
    var client = mqtt.connect(brokerUrl);
    console.log(`MQTT Broker connection established.`)

    let actual_topic: string = '';
    ws.on('message', (required_topic: string) => {
        if(actual_topic != ''){
            client.unsubscribe(actual_topic);
            console.log(`Topic subscription removed (${actual_topic})`)
        }
        client.subscribe(required_topic);
        console.log(`Topic subscription started (${required_topic})`)
        actual_topic = required_topic;
    })

    client.on('message', (topic, message) => {
        ws.send(message.toString());
        console.log(`Send -> ${message} to topic: ${topic} `)
    })
})

server.listen(port, () => {
    console.log(`Server started on port ${port}`);
});