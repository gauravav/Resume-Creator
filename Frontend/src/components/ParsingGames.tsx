'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2,
  Trophy,
  RotateCcw,
  Zap,
  Target,
  Brain,
  X
} from 'lucide-react';

interface ParsingGamesProps {
  isOpen: boolean;
}

type GameType = 'snake' | 'memory' | 'whack' | null;

// Snake Game Component
const SnakeGame = () => {
  const [snake, setSnake] = useState([[5, 5]]);
  const [food, setFood] = useState([10, 10]);
  const [direction, setDirection] = useState([0, 1]);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const gridSize = 15;

  const resetGame = useCallback(() => {
    setSnake([[5, 5]]);
    setFood([10, 10]);
    setDirection([0, 1]);
    setGameOver(false);
    setScore(0);
    setIsPaused(false);
  }, []);

  useEffect(() => {
    if (gameOver || isPaused) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          if (direction[0] !== 1) setDirection([-1, 0]);
          break;
        case 'ArrowDown':
          if (direction[0] !== -1) setDirection([1, 0]);
          break;
        case 'ArrowLeft':
          if (direction[1] !== 1) setDirection([0, -1]);
          break;
        case 'ArrowRight':
          if (direction[1] !== -1) setDirection([0, 1]);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [direction, gameOver, isPaused]);

  useEffect(() => {
    if (gameOver || isPaused) return;

    const moveSnake = setInterval(() => {
      setSnake((prevSnake) => {
        const newSnake = [...prevSnake];
        const head = [newSnake[0][0] + direction[0], newSnake[0][1] + direction[1]];

        // Check collision with walls
        if (head[0] < 0 || head[0] >= gridSize || head[1] < 0 || head[1] >= gridSize) {
          setGameOver(true);
          return prevSnake;
        }

        // Check collision with self
        if (newSnake.some(segment => segment[0] === head[0] && segment[1] === head[1])) {
          setGameOver(true);
          return prevSnake;
        }

        newSnake.unshift(head);

        // Check if food is eaten
        if (head[0] === food[0] && head[1] === food[1]) {
          setScore(s => s + 10);
          setFood([
            Math.floor(Math.random() * gridSize),
            Math.floor(Math.random() * gridSize)
          ]);
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, 150);

    return () => clearInterval(moveSnake);
  }, [direction, food, gameOver, isPaused, gridSize]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-lg font-semibold text-gray-900 dark:text-white">
          Score: {score}
        </div>
        <button
          onClick={resetGame}
          className="inline-flex items-center px-3 py-1 text-sm bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Restart
        </button>
      </div>

      <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
        <div
          className="grid gap-0.5 mx-auto"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            width: 'min(100%, 400px)',
            aspectRatio: '1'
          }}
        >
          {Array.from({ length: gridSize }).map((_, row) =>
            Array.from({ length: gridSize }).map((_, col) => {
              const isSnake = snake.some(segment => segment[0] === row && segment[1] === col);
              const isFood = food[0] === row && food[1] === col;
              const isHead = snake[0][0] === row && snake[0][1] === col;

              return (
                <div
                  key={`${row}-${col}`}
                  className={`aspect-square rounded-sm transition-colors ${
                    isHead
                      ? 'bg-green-600 dark:bg-green-500'
                      : isSnake
                      ? 'bg-green-500 dark:bg-green-600'
                      : isFood
                      ? 'bg-red-500 dark:bg-red-400'
                      : 'bg-gray-200 dark:bg-gray-800'
                  }`}
                />
              );
            })
          )}
        </div>
      </div>

      {gameOver && (
        <div className="text-center p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
          <p className="text-red-800 dark:text-red-300 font-semibold">Game Over!</p>
          <p className="text-red-600 dark:text-red-400 text-sm">Final Score: {score}</p>
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Use arrow keys to control the snake
      </p>
    </div>
  );
};

// Memory Card Game Component
const MemoryGame = () => {
  const icons = ['💼', '📄', '🎯', '💡', '🚀', '⭐', '🏆', '✨'];
  const [cards, setCards] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    resetGame();
  }, []);

  const resetGame = () => {
    const shuffled = [...icons, ...icons]
      .sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlipped([]);
    setMatched([]);
    setScore(0);
    setMoves(0);
  };

  const handleCardClick = (index: number) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) {
      return;
    }

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;

      if (cards[first] === cards[second]) {
        setMatched([...matched, first, second]);
        setScore(s => s + 20);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
    }
  };

  const allMatched = matched.length === cards.length && cards.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-x-4">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            Score: {score}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Moves: {moves}
          </span>
        </div>
        <button
          onClick={resetGame}
          className="inline-flex items-center px-3 py-1 text-sm bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Restart
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {cards.map((card, index) => (
          <button
            key={index}
            onClick={() => handleCardClick(index)}
            disabled={flipped.includes(index) || matched.includes(index)}
            className={`aspect-square text-3xl rounded-lg transition-all transform ${
              flipped.includes(index) || matched.includes(index)
                ? 'bg-white dark:bg-gray-700 rotate-0'
                : 'bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 rotate-y-180'
            } ${matched.includes(index) ? 'opacity-50' : ''}`}
          >
            {flipped.includes(index) || matched.includes(index) ? card : '?'}
          </button>
        ))}
      </div>

      {allMatched && (
        <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
          <p className="text-green-800 dark:text-green-300 font-semibold">🎉 You Won!</p>
          <p className="text-green-600 dark:text-green-400 text-sm">
            Completed in {moves} moves!
          </p>
        </div>
      )}
    </div>
  );
};

// Whack-a-Bug Game Component
const WhackABugGame = () => {
  const [bugs, setBugs] = useState<boolean[]>(Array(9).fill(false));
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setIsPlaying(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;

    const bugInterval = setInterval(() => {
      const newBugs = Array(9).fill(false);
      const randomIndex = Math.floor(Math.random() * 9);
      newBugs[randomIndex] = true;
      setBugs(newBugs);
    }, 600);

    return () => clearInterval(bugInterval);
  }, [isPlaying]);

  const startGame = () => {
    setBugs(Array(9).fill(false));
    setScore(0);
    setTimeLeft(30);
    setIsPlaying(true);
  };

  const whackBug = (index: number) => {
    if (bugs[index] && isPlaying) {
      setScore(s => s + 10);
      setBugs(prev => {
        const newBugs = [...prev];
        newBugs[index] = false;
        return newBugs;
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-x-4">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            Score: {score}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Time: {timeLeft}s
          </span>
        </div>
        <button
          onClick={startGame}
          className="inline-flex items-center px-3 py-1 text-sm bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
        >
          <Zap className="w-4 h-4 mr-1" />
          {isPlaying ? 'Restart' : 'Start'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {bugs.map((hasBug, index) => (
          <button
            key={index}
            onClick={() => whackBug(index)}
            disabled={!isPlaying}
            className={`aspect-square rounded-lg text-4xl flex items-center justify-center transition-all transform ${
              hasBug
                ? 'bg-red-500 dark:bg-red-600 scale-110'
                : 'bg-gray-200 dark:bg-gray-700'
            } ${isPlaying ? 'hover:scale-105' : 'opacity-50'}`}
          >
            {hasBug ? '🐛' : '🕳️'}
          </button>
        ))}
      </div>

      {!isPlaying && timeLeft === 0 && (
        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
          <p className="text-blue-800 dark:text-blue-300 font-semibold">Time's Up!</p>
          <p className="text-blue-600 dark:text-blue-400 text-sm">Final Score: {score}</p>
        </div>
      )}

      {!isPlaying && timeLeft === 30 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Click Start to begin! Squash the bugs as they appear!
        </p>
      )}
    </div>
  );
};

export default function ParsingGames({ isOpen }: ParsingGamesProps) {
  const [selectedGame, setSelectedGame] = useState<GameType>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-900/80 dark:bg-black/90 backdrop-blur-sm" />

        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-xl relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Gamepad2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedGame ? 'Playing Game' : 'Mini Games'}
              </h3>
            </div>
            {selectedGame && (
              <button
                onClick={() => setSelectedGame(null)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {!selectedGame ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-lg p-4 mb-6 border border-indigo-200 dark:border-indigo-700">
                <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
                  ⏳ Your resume is being parsed...
                  <br />
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                    Play a quick game while you wait!
                  </span>
                </p>
              </div>

              <button
                onClick={() => setSelectedGame('snake')}
                className="w-full flex items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-800/40 dark:hover:to-emerald-800/40 rounded-lg border border-green-200 dark:border-green-700 transition-all"
              >
                <Target className="h-8 w-8 text-green-600 dark:text-green-400 mr-4" />
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Snake Game</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Classic snake - eat and grow!</p>
                </div>
              </button>

              <button
                onClick={() => setSelectedGame('memory')}
                className="w-full flex items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-800/40 dark:hover:to-pink-800/40 rounded-lg border border-purple-200 dark:border-purple-700 transition-all"
              >
                <Brain className="h-8 w-8 text-purple-600 dark:text-purple-400 mr-4" />
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Memory Match</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Match pairs of cards!</p>
                </div>
              </button>

              <button
                onClick={() => setSelectedGame('whack')}
                className="w-full flex items-center p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 hover:from-orange-100 hover:to-red-100 dark:hover:from-orange-800/40 dark:hover:to-red-800/40 rounded-lg border border-orange-200 dark:border-orange-700 transition-all"
              >
                <Zap className="h-8 w-8 text-orange-600 dark:text-orange-400 mr-4" />
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Whack-a-Bug</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Squash the bugs quickly!</p>
                </div>
              </button>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                  <Trophy className="h-4 w-4 mr-1" />
                  <span>Have fun while we process your resume!</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {selectedGame === 'snake' && <SnakeGame />}
              {selectedGame === 'memory' && <MemoryGame />}
              {selectedGame === 'whack' && <WhackABugGame />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
