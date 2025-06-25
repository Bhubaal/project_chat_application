import React from 'react';

import onlineIcon from '../../icons/onlineIcon.png';

import './TextContainer.css';

const TextContainer = ({ users }) => (
  <div className="textContainer">
    {/* Introductory div removed */}
    {
      users && users.length > 0 // Also check if users array is not empty
        ? (
          <div>
            <h1>People currently chatting:</h1>
            <div className="activeContainer">
              {/* The h2 here might be semantically incorrect for a list of names.
                  Consider changing to a <ul> or just mapping divs.
                  For now, retaining structure but removing outer h2 if it wraps multiple items.
                  The original code had an <h2> wrapping multiple <div> items, which is unusual.
                  Let's assume the <h2> was meant for the "People currently chatting" or similar,
                  and the list itself is a series of items.
              */}
              {users.map(({name}) => (
                <div key={name} className="activeItem">
                  <span>{name}</span> {/* Wrapped name in span for clarity/styling if needed */}
                  <img alt="Online Icon" src={onlineIcon}/>
                </div>
              ))}
            </div>
          </div>
        )
        // Optional: Show a message if no other users are present but users prop exists
        // : users ? <p>No other users currently chatting.</p>
        : null // Or show nothing if users is null/undefined/empty
    }
  </div>
);

export default TextContainer;