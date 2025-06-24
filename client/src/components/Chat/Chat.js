import React, { useState, useEffect } from "react";
import queryString from 'query-string';
import io from "socket.io-client";

import TextContainer from '../TextContainer/TextContainer';
import Messages from '../Messages/Messages';
import InfoBar from '../InfoBar/InfoBar';
import Input from '../Input/Input';

import './Chat.css';

// Use environment variable for the endpoint, with a fallback for development/default.
const ENDPOINT = process.env.REACT_APP_ENDPOINT || 'https://project-chat-application.herokuapp.com/';

let socket; // Module-scoped socket variable

const Chat = ({ location }) => {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [users, setUsers] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting...'); // New state for connection status

  useEffect(() => {
    const { name: currentName, room: currentRoom } = queryString.parse(location.search);

    socket = io(ENDPOINT); // Initialize/re-initialize socket connection

    setName(currentName);
    setRoom(currentRoom);

    socket.emit('join', { name: currentName, room: currentRoom }, (err) => {
      if (err) {
        setError(err);
        // Consider further action if join fails, e.g., redirect or prevent interaction
      }
    });

    // Setup event listeners on the new socket instance
    socket.on('message', (receivedMessage) => {
      const messageWithTimestamp = {
        ...receivedMessage,
        timestamp: receivedMessage.timestamp || Date.now(),
      };
      setMessages((prevMessages) => [...prevMessages, messageWithTimestamp]);
    });

    socket.on('roomData', ({ users: newUsers }) => {
      setUsers(newUsers);
    });

    // Connection status listeners
    socket.on('connect', () => {
      setConnectionStatus('connected');
      setError(''); // Clear previous errors on successful connect
    });

    socket.on('disconnect', (reason) => {
      setConnectionStatus(`disconnected: ${reason}`);
      // setError('You have been disconnected. Attempting to reconnect...'); // Optional: set a general error
    });

    socket.io.on('reconnect_attempt', (attemptNumber) => {
      setConnectionStatus(`reconnecting... (attempt ${attemptNumber})`);
    });

    socket.io.on('reconnect_failed', () => {
      setConnectionStatus('reconnection failed');
      setError('Failed to reconnect to the server. Please check your connection or try refreshing.');
    });

    socket.on('connect_error', (err) => {
      setConnectionStatus('connection error');
      setError(`Connection Error: ${err.message}. Please try refreshing.`);
      // Potentially disconnect socket here if connect_error implies no auto-reconnect for initial
      // if (socket) socket.disconnect(); // This might be too aggressive, depends on socket.io client config
    });
    
    socket.io.on('reconnect_error', (err) => {
      setConnectionStatus('reconnection attempt error');
      // setError(`Reconnection Error: ${err.message}. Still trying...`); // Can be noisy
    });


    // Cleanup function: runs when dependencies change or component unmounts
    return () => {
      if (socket) {
        socket.disconnect(); // Disconnect the client
        // Remove all listeners associated with this socket instance
        socket.off('message');
        socket.off('roomData');
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        // For manager events, they are on socket.io
        socket.io.off('reconnect_attempt');
        socket.io.off('reconnect_failed');
        socket.io.off('reconnect_error');
      }
    };
  }, [location.search]); // ENDPOINT is effectively constant, so only location.search matters for re-runs.
                         // If ENDPOINT could truly change dynamically and require a new socket, it should be here.

  const sendMessage = (event) => {
    event.preventDefault();

    if (message && socket) { // Check if socket is initialized
      socket.emit('sendMessage', message, () => setMessage(''));
    }
  }

  return (
    <div className="outerContainer">
      <div className="container">
          <InfoBar room={room} />
          {connectionStatus && connectionStatus !== 'connected' && <p className="connectionStatusMessage">{connectionStatus}</p>}
          <Messages messages={messages} name={name} />
          {error && <p className="errorMessage">{error}</p>}
          <Input
            message={message}
            setMessage={setMessage}
            sendMessage={sendMessage}
            setError={setError}
          />
      </div>
      <TextContainer users={users}/>
    </div>
  );
}

export default Chat;
