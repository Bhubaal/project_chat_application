import React from 'react';

import './Message.css';

import ReactEmoji from 'react-emoji';

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  // HH:MM AM/PM format
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
};

// Destructure status from message prop
const Message = ({ message: { text, user, timestamp, status }, name }) => {
  let isSentByCurrentUser = false;
  const BOT_USER_NAME = "bot"; // Define bot name, case-insensitive check later

  const trimmedName = name.trim().toLowerCase();
  const messageUserLower = user ? user.trim().toLowerCase() : '';

  if(messageUserLower === trimmedName) {
    isSentByCurrentUser = true;
  }

  const isBotMessage = messageUserLower === BOT_USER_NAME;
  const formattedTime = formatTimestamp(timestamp);

  // Base container classes
  let containerClasses = "messageContainer";
  if (isSentByCurrentUser) {
    containerClasses += " justifyEnd";
  } else if (isBotMessage) {
    containerClasses += " justifyStart messageContainer--bot"; // Special class for bot
  } else {
    containerClasses += " justifyStart";
  }

  return (
    isSentByCurrentUser
      ? (
        <div className={containerClasses}>
          <p className="sentText pr-10">{trimmedName}</p>
          <div className="messageBox backgroundBlue">
            <p className="messageText colorWhite">{ReactEmoji.emojify(text)}</p>
            <div className="messageMeta">
              {timestamp && <p className="messageTimestamp timestampWhite">{formattedTime}</p>}
              {(status === 'sending' || status === 'sent' || status === 'delivered') && (
                <span className="messageTick singleTick">&#x2713;</span> // Single grey tick
              )}
              {status === 'read' && (
                <span className="messageTick blueTick">&#x2713;&#x2713;</span> // Double blue tick
              )}
            </div>
          </div>
        </div>
        )
        : isBotMessage
        ? ( // Bot message
          <div className={containerClasses}>
            <div className="messageBox backgroundBot"> {/* Distinct background for bot */}
              <p className="messageText colorDark">{ReactEmoji.emojify(text)}</p>
              {timestamp && <p className="messageTimestamp timestampDark">{formattedTime}</p>}
              {/* No ticks for bot messages or messages from others */}
            </div>
            <p className="sentText pl-10 ">{user}</p> {/* Show "Bot" as user */}
          </div>
        )
        : ( // Other users' messages
          <div className={containerClasses}>
            <div className="messageBox backgroundLight">
              <p className="messageText colorDark">{ReactEmoji.emojify(text)}</p>
              {timestamp && <p className="messageTimestamp timestampDark">{formattedTime}</p>}
              {/* No ticks for messages from others */}
            </div>
            <p className="sentText pl-10 ">{user}</p>
          </div>
        )
  );
}

export default Message;