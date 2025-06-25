const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid'); // Import uuid

const { addUser, removeUser, getUser, getUsersInRoom, getUserByName } = require('./users'); // Added getUserByName

const router = require('./router');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
app.use(router);

io.on('connect', (socket) => {
  socket.on('join', ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if(error) return callback(error);

    socket.join(user.room);

    socket.emit('message', { user: 'admin', text: `${user.name}, welcome to room ${user.room}.`});
    socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name} has joined!` });

    io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

    callback();
  });

  socket.on('sendMessage', (messageText, callback) => { // Renamed message to messageText for clarity
    const user = getUser(socket.id);

    if (user) { // Ensure user exists
      const messageId = uuidv4();
      const messageData = {
        id: messageId,
        user: user.name,
        text: messageText
      };
      io.to(user.room).emit('message', messageData);
    }
    // Consider sending an error back to sender if user is not found, though this is unlikely if they're connected
    callback();
  });

  socket.on('messageDelivered', (data) => {
    // data should contain { messageId, recipientName, senderName }
    const sender = getUserByName(data.senderName);
    if (sender && sender.id) { // sender.id is the socket.id
      // In Socket.IO v2.x, io.sockets.sockets is an object of sockets by id.
      // In Socket.IO v3.x/v4.x, it's a Map: io.sockets.sockets.get(socketId)
      // The package.json shows "socket.io": "^2.2.0", so it's v2.x.
      const senderSocket = io.sockets.connected[sender.id];
      if (senderSocket) {
        senderSocket.emit('updateMessageStatus', {
          messageId: data.messageId,
          status: 'delivered',
          deliveredTo: data.recipientName
        });
      } else {
        // console.log(`Sender socket not found for ${data.senderName} with id ${sender.id}`);
      }
    } else {
      // console.log(`Sender user not found: ${data.senderName}`);
    }
  });

  socket.on('messageReadByRecipient', (data) => {
    // data should contain { messageId, readerName, senderName }
    const sender = getUserByName(data.senderName);
    if (sender && sender.id) {
      const senderSocket = io.sockets.connected[sender.id];
      if (senderSocket) {
        senderSocket.emit('updateMessageStatus', {
          messageId: data.messageId,
          status: 'read',
          readBy: data.readerName
        });
      } else {
        // console.log(`Sender socket not found for ${data.senderName} (for read status)`);
      }
    } else {
      // console.log(`Sender user not found: ${data.senderName} (for read status)`);
    }
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if(user) {
      io.to(user.room).emit('message', { user: 'Admin', text: `${user.name} has left.` });
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});
    }
  })
});

server.listen(process.env.PORT || 5000, () => console.log(`Server has started.`));