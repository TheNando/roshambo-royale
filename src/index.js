import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

import "./styles.css";

const COLS = 20;
const ROWS = 20;
const PLAYER_SETS = 3;
const WEAPONS = ["P", "R", "S"];
const THINK_TIME = 200;
const CONTRACT_START = 10;
const CONTRACT_EVERY = 8;

const randInt = max => Math.floor(Math.random() * max);

class Player {
  constructor(weapon, x, y) {
    this.weapon = weapon;
    this.x = x;
    this.y = y;
    this.defeated = false;
  }
  applyBounds(bounds) {
    let { x, y } = this;

    if (bounds) {
      x = x <= bounds ? bounds + 1 : x;
      x = x >= COLS - bounds - 1 ? COLS - bounds - 2 : x;
      y = y <= bounds ? bounds + 1 : y;
      y = y >= ROWS - bounds - 1 ? ROWS - bounds - 2 : y;
    }

    return { x, y };
  }
}

class Board {
  constructor(x, y) {
    this.maxX = x;
    this.maxY = y;

    this.players = [];
    this.round = 0;
    this.bounds = 0;

    for (let i = 0; i <= PLAYER_SETS * 3; i++) {
      this.addPlayer(WEAPONS[i++ % 3]);
      this.addPlayer(WEAPONS[i++ % 3]);
      this.addPlayer(WEAPONS[i++ % 3]);
    }
  }

  addPlayer(weapon) {
    let isAdded = false;
    do {
      const x = randInt(this.maxX);
      const y = randInt(this.maxY);

      if (this.cellIsEmpty(x, y)) {
        this.players.push(new Player(weapon, x, y));
        isAdded = true;
      }
    } while (!isAdded);
  }

  cellIsEmpty(x, y) {
    return !this.players.find(player => player.x === x && player.y === y);
  }

  evalBoard() {
    for (let pI = 0; pI < this.players.length - 1; pI++) {
      const p1 = this.players[pI];
      for (let pJ = pI + 1; pJ < this.players.length; pJ++) {
        const p2 = this.players[pJ];
        // Can't be adjacent if they don't share one dimension
        if (p1.x !== p2.x && p1.y !== p2.y) {
          continue;
        }

        // Are adjacent if other dimension diff of 1
        if (Math.abs(p1.x - p2.x) === 1 || Math.abs(p1.y - p2.y) === 1) {
          this.fight(p1, p2);
        }
      }
    }

    // Remove defeated players
    this.players = this.players.filter(player => !player.defeated);

    return (
      this.players.every(player => player.weapon === this.players[0].weapon) &&
      this.players
    );
  }

  fight(...players) {
    const paper = players.find(player => player.weapon === "P");
    const rock = players.find(player => player.weapon === "R");
    const scissors = players.find(player => player.weapon === "S");

    if (paper && rock) {
      rock.defeated = true;
    } else if (rock && scissors) {
      scissors.defeated = true;
    } else if (scissors && paper) {
      paper.defeated = true;
    }
  }

  getBounds() {
    return this.bounds;
  }

  getGrid() {
    const grid = Array(this.maxY)
      .fill(0)
      .map(row =>
        Array(this.maxX)
          .fill(0)
          .map(cell => "")
      );

    this.players.forEach(player => (grid[player.y][player.x] = player.weapon));

    return grid;
  }

  isActive() {
    return this.players.length > 1;
  }

  movePlayer(player, dir = randInt(4)) {
    const { x, y } = player.applyBounds(this.bounds);
    const minX = 0;
    const minY = 0;
    const maxX = this.maxX;
    const maxY = this.maxY;

    // Player moved Up or Down
    const newY =
      dir === 0
        ? Math.max(minY, y - 1)
        : dir === 2
        ? Math.min(maxY - 1, y + 1)
        : y;

    // Player moved Left or Right
    const newX =
      dir === 1
        ? Math.min(maxX - 1, x + 1)
        : dir === 3
        ? Math.max(minX, x - 1)
        : x;

    // If space is empty, move weapon there
    if (this.cellIsEmpty(newX, newY)) {
      player.x = newX;
      player.y = newY;
    }
  }

  think(dir) {
    const winner = this.evalBoard();

    if (!winner) {
      this.round++;

      if (
        this.round > CONTRACT_START &&
        (this.round - CONTRACT_START - 1) % CONTRACT_EVERY === 0
      ) {
        this.bounds += 1;
      }

      this.players.forEach(player => this.movePlayer(player, dir));
    }

    return {
      grid: this.getGrid(),
      bounds: this.getBounds(),
      winner
    };
  }
}

const board = new Board(COLS, ROWS);

const rowStyle = {
  display: "flex",
  height: "30px"
};

const cellStyle = {
  border: "1px solid #666",
  boxSizing: "border-box",
  flex: "1",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  maxWidth: "30px"
};

const darkCellStyle = {
  ...cellStyle,
  backgroundColor: "#666"
};

const winStyle = {
  alignItems: "center",
  backgroundColor: "white",
  borderRadius: "10px",
  display: "flex",
  fontSize: "30px",
  height: "300px",
  justifyContent: "center",
  position: "absolute",
  top: "0",
  transform: "translate(50%, 50%)",
  width: "300px"
};

const boundsStyle = (x, y, bounds) => {
  const inBounds =
    x < bounds || x > COLS - bounds - 1 || y < bounds || y > ROWS - bounds - 1;
  return inBounds ? darkCellStyle : cellStyle;
};

const BattleRoyaleRPS = () => {
  const [grid, setGrid] = useState(board.getGrid());
  const [bounds, setBounds] = useState(board.getBounds());
  const [winner, setWinner] = useState();

  const stopGame = useInterval(() => {
    if (board.isActive()) {
      const {
        bounds: newBounds,
        grid: newGrid,
        winner: theWinner
      } = board.think();
      setBounds(newBounds);
      setGrid(newGrid);

      if (theWinner) {
        setWinner(theWinner);
        stopGame();
      }
    } else {
      stopGame();
    }
  }, THINK_TIME);

  return (
    <div>
      {grid &&
        grid.map((row, ri) => (
          <div key={ri} style={rowStyle}>
            {row.map((cell, ci) => (
              <div key={`${ci},${ri}`} style={boundsStyle(ci, ri, bounds)}>
                <span>{cell}</span>
              </div>
            ))}
          </div>
        ))}
      <button onClick={stopGame}>Stop</button>
      <button onClick={() => window.location.reload()}>Restart</button>
      {winner && (
        <div style={winStyle}>
          <span>{winner[0].weapon} wins!</span>
        </div>
      )}
    </div>
  );
};

function useInterval(callback, delay) {
  const savedCallback = useRef();
  const cancel = useRef();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      cancel.current = () => clearInterval(id);
      return cancel.current;
    }
  }, [delay]);

  return cancel.current;
}

const rootElement = document.getElementById("root");
ReactDOM.render(<BattleRoyaleRPS />, rootElement);
