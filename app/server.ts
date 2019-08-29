import express from 'express';
import http from 'http';
import mqtt from 'mqtt';
import WebSocket from 'ws';
import fs from 'fs'
import { auth, initializeApp, credential } from "firebase-admin";
import { isUndefined } from 'util';

var serviceAccount = require('../ServiceAccountKey.json');


const brokerUrl = process.env.BROKER_URL || 'mqtt://localhost';
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
    initializeApp({
        databaseURL: "https://italy-os.firebaseio.com",
        credential: credential.cert(serviceAccount)
    })
    console.log(`Server started on port ${port}`);
});