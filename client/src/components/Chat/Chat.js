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
  const [connectionStatus, setConnectionStatus] = useState('connecting...');

  // State for chat window draggable functionality
  const [chatPosition, setChatPosition] = useState({ x: 200, y: 100 }); // Initial position
  const [isChatDragging, setIsChatDragging] = useState(false);
  const [chatOffset, setChatOffset] = useState({ x: 0, y: 0 });

  // Mouse down on InfoBar
  const handleChatMouseDown = (e) => {
    if (e.button !== 0) return; // Only allow left mouse button
    setIsChatDragging(true);
    setChatOffset({
      x: e.clientX - chatPosition.x,
      y: e.clientY - chatPosition.y,
    });
    e.preventDefault(); // Prevent text selection or other default actions
  };

  // useEffect for handling chat window dragging
  useEffect(() => {
    const handleChatMouseMove = (e) => {
      if (!isChatDragging) return;
      setChatPosition({
        x: e.clientX - chatOffset.x,
        y: e.clientY - chatOffset.y,
      });
    };

    const handleChatMouseUp = () => {
      setIsChatDragging(false);
    };

    if (isChatDragging) {
      window.addEventListener('mousemove', handleChatMouseMove);
      window.addEventListener('mouseup', handleChatMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleChatMouseMove);
      window.removeEventListener('mouseup', handleChatMouseUp);
    };
  }, [isChatDragging, chatOffset]);

  // useEffect for socket connection and event listeners
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
    socket.on('message', (receivedMessageFromServer) => {
      setMessages((prevMessages) => {
        if (receivedMessageFromServer.user === name && receivedMessageFromServer.tempId) {
          // Current user's message echoed back, try to find and update the optimistic one
          const optimisticMessageIndex = prevMessages.findIndex(
            (msg) => msg.id === receivedMessageFromServer.tempId && msg.status === 'sending'
          );

          if (optimisticMessageIndex !== -1) {
            // Found the optimistic message, update it
            const updatedMessages = [...prevMessages];
            updatedMessages[optimisticMessageIndex] = {
              ...prevMessages[optimisticMessageIndex],
              id: receivedMessageFromServer.id,        // Final server ID
              status: 'sent',                          // Update status
              text: receivedMessageFromServer.text,    // Use server's text as source of truth
              timestamp: receivedMessageFromServer.timestamp || prevMessages[optimisticMessageIndex].timestamp,
            };
            return updatedMessages;
          } else {
            // Optimistic message with this tempId not found (or already updated).
            // Check if a message with the FINAL ID already exists to prevent duplicates.
            const existingFinalMessage = prevMessages.find(msg => msg.id === receivedMessageFromServer.id);
            if (!existingFinalMessage) {
              return [
                ...prevMessages,
                {
                  ...receivedMessageFromServer,
                  timestamp: receivedMessageFromServer.timestamp || Date.now(),
                  status: 'sent',
                },
              ];
            } else {
              return prevMessages; // Already have this message by final ID
            }
          }
        } else if (receivedMessageFromServer.user === name && !receivedMessageFromServer.tempId) {
          // Own message from server, but no tempId (e.g., from another session)
          // Check if it already exists by final ID before adding
           const existingFinalMessage = prevMessages.find(msg => msg.id === receivedMessageFromServer.id);
           if (!existingFinalMessage) {
            return [
                ...prevMessages,
                {
                  ...receivedMessageFromServer,
                  timestamp: receivedMessageFromServer.timestamp || Date.now(),
                  status: 'sent',
                },
              ];
           } else {
             return prevMessages; // Already exists
           }
        } else { // Message from another user
          // Check if it already exists by final ID before adding
          const existingFinalMessage = prevMessages.find(msg => msg.id === receivedMessageFromServer.id);
          if (!existingFinalMessage) {
            const newIncomingMessage = {
              ...receivedMessageFromServer,
              timestamp: receivedMessageFromServer.timestamp || Date.now(),
            };
            // Acknowledge delivery and read for other's messages
            if (socket && receivedMessageFromServer.id) {
              socket.emit('messageDelivered', {
                messageId: receivedMessageFromServer.id,
                recipientName: name,
                senderName: receivedMessageFromServer.user
              });
              socket.emit('messageReadByRecipient', {
                messageId: receivedMessageFromServer.id,
                readerName: name,
                senderName: receivedMessageFromServer.user
              });
            }
            return [...prevMessages, newIncomingMessage];
          } else {
            return prevMessages; // Already have this message by final ID
          }
        }
      });
    });

    socket.on('updateMessageStatus', ({ messageId, status, deliveredTo }) => {
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId ? { ...msg, status: status } : msg
        )
      );
      // TODO: In group chat, 'deliveredTo' could be used to update a list of recipients
      // For now, any 'delivered' status updates the message for the sender.
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
        socket.off('updateMessageStatus'); // Added cleanup
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

    if (message && socket) {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const optimisticMessage = {
        id: tempId, // Temporary client-side ID
        user: name, // Current user's name
        text: message,
        timestamp: Date.now(), // Optimistic timestamp
        status: 'sending', // Initial status
      };

      setMessages(prevMessages => [...prevMessages, optimisticMessage]);
      // Send message text and tempId to the server
      socket.emit('sendMessage', { text: message, tempId: tempId }, () => {
        // Callback from server after it has processed the message.
        // Input is cleared below. Nothing specific needed in callback for now.
      });
      setMessage(''); // Clear input after preparing to send
    }
  }

  return (
    <div className="outerContainer">
      <TextContainer users={users}/> {/* Moved to be before the main chat container */}
      <div
        className="container"
        style={{
          position: 'absolute',
          left: `${chatPosition.x}px`,
          top: `${chatPosition.y}px`,
          cursor: isChatDragging ? 'grabbing' : 'default', // Default cursor for container
        }}
      >
          <InfoBar room={room} onMouseDown={handleChatMouseDown} /> {/* Pass down mouse down handler */}
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
    </div>
  );
}

export default Chat;
