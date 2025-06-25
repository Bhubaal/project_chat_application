import React, { useState, useEffect } from 'react'; // Consolidated React import

import onlineIcon from '../../icons/onlineIcon.png'; // Keep one onlineIcon import

// Removed duplicate React import
// Removed duplicate onlineIcon import

import './TextContainer.css';

const TextContainer = ({ users }) => {
  // State for draggable functionality
  const [position, setPosition] = useState({ x: 50, y: 150 }); // Initial position
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - offset.x,
        y: e.clientY - offset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, offset]);

  return (
  <div
    className="textContainer"
    style={{
      position: 'absolute',
      left: `${position.x}px`,
      top: `${position.y}px`,
      // cursor will be handled by CSS :active state
    }}
    onMouseDown={handleMouseDown}
  >
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