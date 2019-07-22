import express from 'express';
import http from 'http';
import mqtt from 'mqtt';
import WebSocket from 'ws';
import fs from 'fs'
import { auth, initializeApp, credential } from "firebase-admin";
import { isUndefined } from 'util';

var serviceAccount = require('../ServiceAccountKey.json');


const brokerUrl = process.env.BROKER_URL || 'mqtt://localhost';
var topic = process.env.TOPIC || ' ';
const port = process.env.PORT || 8997;
const app = express();

const server = http.createServer(app);

const wss = new WebSocket.Server({ server,
    verifyClient: async function (info, cb) {
        var token = info.req.headers.authorization;

        const user = await auth().verifyIdToken(String(token))
        .then(function(user){
            return user
        })
        .catch(function(err){
            console.log(err)
        })

        if(isUndefined(user))
        {
            cb(false, 401, 'Unauthorized')
        }else{
            cb(true)
        }
    }
});

wss.on('connection', (ws: WebSocket) => {
    var client = mqtt.connect(brokerUrl);

    ws.on('message', (topic_r: string) => {
        client.unsubscribe(topic);
        topic = process.env.TOPIC || topic_r;
        client.subscribe(topic);
    })

    client.on('message', (topic, message) => {
        ws.send(message.toString());
    })
})

server.listen(port, () => {
    initializeApp({
        databaseURL: "https://italy-os.firebaseio.com",
        credential: credential.cert(serviceAccount)
    })
    console.log(`Server started on port ${port}`);
});