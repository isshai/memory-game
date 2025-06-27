import React, { useEffect, useState } from 'react';
import './App.css';

function shuffle(array) {
  let arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function App() {
  const [images, setImages] = useState([]);
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [showBirthday, setShowBirthday] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/api/images')
      .then(res => res.json())
      .then(data => {
        // Exclude cover.jpg from the game images
        const filteredImages = data.images.filter(img => !img.toLowerCase().includes('cover.jpg'));
        // Group images by pair name (e.g., pic1-a, pic1-b => pair: pic1)
        const pairs = {};
        filteredImages.forEach(img => {
          const match = img.match(/([^/\\]+)-(a|b)\./i);
          if (match) {
            const pairName = match[1];
            if (!pairs[pairName]) pairs[pairName] = [];
            pairs[pairName].push(img);
          }
        });
        // Flatten pairs to a single array (each image appears once)
        const gameImages = Object.values(pairs).flat();
        setImages(gameImages);
        // Shuffle for memory game (each image appears once)
        const gameCards = shuffle(gameImages.map((img, idx) => ({ id: idx, img, flipped: false })));
        setCards(gameCards);
      });
  }, []);

  useEffect(() => {
    if (matched.length > 0 && matched.length === images.length) {
      setTimeout(() => {
        setShowBirthday(true);
      }, 500);
    }
  }, [matched, images]);

  const handleFlip = idx => {
    if (flipped.length === 2 || flipped.includes(idx) || matched.includes(cards[idx].img)) return;
    const newFlipped = [...flipped, idx];
    setFlipped(newFlipped);
    if (newFlipped.length === 2) {
      setMoves(moves + 1);
      const [first, second] = newFlipped;
      // Check if the two images are a pair (same base name, different -a/-b)
      const getPairName = img => {
        const match = img.match(/([^/\\]+)-(a|b)\./i);
        return match ? match[1] : img;
      };
      if (
        getPairName(cards[first].img) === getPairName(cards[second].img) &&
        cards[first].img !== cards[second].img
      ) {
        setMatched([...matched, cards[first].img, cards[second].img]);
        setTimeout(() => setFlipped([]), 800);
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
    }
  };

  const resetGame = () => {
    setMatched([]);
    setFlipped([]);
    setMoves(0);
    setShowBirthday(false);
    // Re-shuffle and reset cards using the current images
    // Group images by pair name (e.g., pic1-a, pic1-b => pair: pic1)
    const pairs = {};
    images.forEach(img => {
      const match = img.match(/([^/\\]+)-(a|b)\./i);
      if (match) {
        const pairName = match[1];
        if (!pairs[pairName]) pairs[pairName] = [];
        pairs[pairName].push(img);
      }
    });
    const gameImages = Object.values(pairs).flat();
    const gameCards = shuffle(gameImages.map((img, idx) => ({ id: idx, img, flipped: false })));
    setCards(gameCards);
  };

  return (
    <div className="app-container">
      <h1>
        Memory Game
        <img src="/icon.svg" alt="logo" style={{ height: '1.5em', verticalAlign: 'middle', marginLeft: '0.5em' }} />
      </h1>
      <p className="guide">Flip two cards at a time to find all the matching pairs. A matching pair is two photos with the same theme!</p>
      <p>Moves: {moves}</p>
      <div className="memory-grid">
        {cards.map((card, idx) => (
          <div
            key={card.id}
            className={`memory-card${flipped.includes(idx) || matched.includes(card.img) ? ' flipped' : ''}`}
            onClick={() => handleFlip(idx)}
          >
            <div className="card-inner">
              <div className="card-front"></div>
              <div className="card-back">
                <img src={`http://localhost:3001${card.img}`} alt="memory" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {showBirthday && (
        <div className="birthday-overlay" style={{ backgroundImage: `url('http://localhost:3001/images/cover.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <div className="birthday-heart">💜</div>
          <div className="birthday-message" style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: '24px', padding: '2rem 3rem', fontSize: '2rem', marginBottom: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            Sabrina I love you,<br />happy birthday!
          </div>
          <button className="birthday-btn" onClick={resetGame}>
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
