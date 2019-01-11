const hlt = require('./hlt');
const {
  Direction
} = require('./hlt/positionals');
const logging = require('./hlt/logging');

const game = new hlt.Game();
game.initialize().then(async () => {

  let shipStatus = [];

  // At this point "game" variable is populated with initial map data.
  // This is a good place to do computationally expensive start-up pre-processing.
  // As soon as you call "ready" function below, the 2 second per turn timer will start.
  await game.ready('MyJavaScriptBot-jan7');

  logging.info(`My Player ID is ${game.myId}.`);

  while (true) {
    await game.updateFrame();

    const {
      gameMap,
      me
    } = game;
    const homePosition = me.shipyard.position;

    const naiveNavigate2 = function (ship, destination) {
      let move = [];
      for (const direction of gameMap.getUnsafeMoves(ship.position, destination)) {
        const targetPos = ship.position.directionalOffset(direction);
        if (!gameMap.get(targetPos).isOccupied || (gameMap.get(targetPos).hasStructure && game.turnNumber > 0.95 * hlt.constants.MAX_TURNS)) {
          if (!(game.turnNumber > 0.95 * hlt.constants.MAX_TURNS && dropoffList.includes(targetPos))) {
            logging.info("primary target " + ship.id);
            move.push(direction);
            break;
          }
        } else if (gameMap.get(targetPos).isOccupied) {
          let newOptions = [];
          let options = [];
          let safeOptions = [];
          newOptions = ship.position.getSurroundingCardinals();
          safeOptions = newOptions.reduce(function (result, element) {
            if (!gameMap.get(element).isOccupied && !gameMap.get(element).hasStructure) {
              result.push(element);
            }
            return result;
          }, []);
          options = safeOptions.map(position => gameMap.getUnsafeMoves(ship.position, position)[0]);
          logging.info(`(${options.length}, ${safeOptions.length})`);
          logging.info(options);
          logging.info(safeOptions);
          if (safeOptions.length > 0) {
            let testDestination = [];
            for (i = 0; i < options.length; i++) {
              testDestination.push(ship.position.directionalOffset(options[i]));
            }
            let num = Math.floor(options.length * Math.random());
            let newDest = options[num];
            move.push(newDest);
            logging.info("random move " + ship.id);
            break;
          }
        }

        /* {
          for (const possibleMoves of ship.position.getSurroundingCardinals()) {
            const newMove = gameMap.getUnsafeMoves(ship.position, possibleMoves);
            logging.info(newMove);
            const differentTarget = ship.position.directionalOffset(newMove[Math.floor(newMove.length * Math.random())]);
            if (!gameMap.get(differentTarget).isOccupied) {
              gameMap.get(differentTarget).markUnsafe(ship);
              return newMove[Math.floor(newMove.length * Math.random())];
            }
          }
        }  */
      }
      // logging.info(Direction.toString(move));
      if (gameMap.get(ship.position).hasStructure && move.length === 0) {
        return Direction.East;
      } else if (move.length > 0) {
        return move[0];
      } {
        logging.info("No good moves! " + ship.id);
        return Direction.Still;
      }
    };

    /*     logging.info(me.shipyard);
        logging.info(gameMap.get(me.shipyard.position)); */

    const commandQueue = [];
    let makingDropoff = false;
    let dropoffList = [];

    dropoffList.push(me.shipyard.position);
    const drops = me.getDropoffs();
    drops.forEach(function (dropoff) {
      dropoffList.push(dropoff.position);
    });

    let brokenCells = gameMap._cells;
    let allCells = [];

    /*     for (j = 0; j < brokenCells.length; j += 2) {
          brokenCells[j].push(brokenCells[j][0]);
        }
        for (j = 0; j < brokenCells.length; j += 2) {
          brokenCells[j].shift();
        } */

    for (i = 0; i < brokenCells.length; i++) {
      allCells = allCells.concat(brokenCells[i]);
    }

    /*     let halfCells = allCells.filter((element, index) => {
          return index % 2 === 0;
        }) */
    let halfCells = allCells;
    let cellGroups = [];

    for (i = 0; i < halfCells.length; i++) {
      cellGroups.push(halfCells[i]);
      let options = halfCells[i].position.getSurroundingCardinals();
      let haliteSum = 0;
      cellGroups[i].crossHalite = haliteSum;
      options.forEach(options => haliteSum = haliteSum + gameMap.get(options).haliteAmount);
      cellGroups[i].crossHalite = haliteSum
    }
    cellGroups.sort(function (a, b) {
      return b.crossHalite - a.crossHalite;
    });
    for (i = 0; i < cellGroups.length; i++) {
      if (cellGroups.length > 350) {
        cellGroups.pop();
      }
    }

    const shipNumber = function (ship) {
      let shipvalue = -1;
      for (i = 0; i < shipStatus.length; i++) {
        if (shipStatus[i].shipId === ship.id) {
          shipvalue = [i];
        }
      }
      return shipvalue;
    }

    for (const ship of me.getShips()) {
      const currentHalite = gameMap.get(ship.position).haliteAmount;
      const shipHalite = ship.haliteAmount;
      const shipPosition = ship.position;
      const homeDistance = gameMap.calculateDistance(shipPosition, homePosition);
      const shipId = ship.id;
      let shipListOrder = shipNumber(ship);

      if (shipListOrder <= 0) {
        shipDeets = {
          shipId,
          shipState: "exploring"
        }
        shipStatus.push(shipDeets);
        shipNumber(ship);
        shipListOrder = shipNumber(ship);
      }

      if ((shipHalite <= 100) && (game.turnNumber < (hlt.constants.MAX_TURNS * 0.95))) {
        for (i = 0; i < shipStatus.length; i++) {
          if (shipStatus[i].shipId) {
            shipStatus[i].shipState = "exploring"
          }
        }
      }

      const checkDropoffDistance = function (shipPosition) {
        if (dropoffList.length >= 1) {
          let canCreate = true;
          for (i = 0; i < dropoffList.length; i++) {
            if (!(gameMap.calculateDistance(shipPosition, dropoffList[i]) >= 16)) {
              canCreate = false;
            }
          }
          return canCreate;
        } {
          return true;
        }
      }

      if (currentHalite + shipHalite + me.haliteAmount >= 4000 &&
        makingDropoff === false &&
        homeDistance >= 16 &&
        game.turnNumber < 0.70 * hlt.constants.MAX_TURNS &&
        !gameMap.get(ship.position).hasStructure &&
        dropoffList.length <= 4 &&
        checkDropoffDistance(shipPosition)) {
        makingDropoff = true;
        commandQueue.push(ship.makeDropoff());
      } else if ((ship.haliteAmount > hlt.constants.MAX_HALITE * .8) ||
        shipStatus[shipListOrder].shipState === "returning" || game.turnNumber > hlt.constants.MAX_TURNS * 0.95) {
        if (game.turnNumber > (0.95 * hlt.constants.MAX_TURNS)) {
          shipStatus[shipListOrder].shipState = "ending";
        } {
          shipStatus[shipListOrder].shipState = "returning";
        }
        let dropPoint = {
          pos: me.shipyard.position,
          distance: homeDistance
        };
        for (i = 0; i < dropoffList.length; i++) {
          const distanceCheck = gameMap.calculateDistance(shipPosition, dropoffList[i]);
          if (distanceCheck <= dropPoint.distance) {
            dropPoint.distance = distanceCheck;
            dropPoint.pos = dropoffList[i];
          }
        }
        const destination = dropPoint.pos;
        let safeMove = naiveNavigate2(ship, destination);
        if (safeMove.dx === 0 && safeMove.dy === 0) {
          safeMove.dx = -1;
        }
        commandQueue.push(ship.move(safeMove));
        gameMap.get(ship.position.directionalOffset(safeMove)).markUnsafe(ship);
      } else if (gameMap.get(ship.position).haliteAmount < hlt.constants.MAX_HALITE / 10) {
        let gravity = {
          position: null,
          score: 0,
        };
        for (i = 0; i < cellGroups.length; i++) {
          let dist = gameMap.calculateDistance(shipPosition, cellGroups[i].position);
          let multiplier = Math.pow(dist, 2);
          let score = Math.floor(cellGroups[i].crossHalite / multiplier);
          if (score > gravity.score) {
            gravity.position = cellGroups[i].position;
            gravity.score = score;
          }
        }
        let movementResult = {
          position: '',
          halite: 0
        };
        let options;
        options = gameMap.getUnsafeMoves(ship.position, gravity.position);
        if (options.length === 0) {
          newOptions = ship.position.getSurroundingCardinals();
          newOptions.reduce(function (result, element) {
            if (!gameMap.get(element).isOccupied) {
              result.push(element);
            }
            return result;
          }, []);
          options = newOptions.map(position => gameMap.getUnsafeMoves(ship.position, position)[0]);
        }
        for (i = 0; i < options.length; i++) {
          let testDestination = ship.position.directionalOffset(options[i]);
          if (gameMap.get(testDestination).haliteAmount >= movementResult.halite) {
            movementResult.position = testDestination;
            movementResult.halite = gameMap.get(testDestination).haliteAmount;
          }
        }
        const destinationHalite = gameMap.get(movementResult.position).haliteAmount;
        let safeMove = naiveNavigate2(ship, movementResult.position);
        if ((destinationHalite * .25) - (currentHalite * .1) > (currentHalite * .25)) {
          commandQueue.push(ship.move(safeMove));
          gameMap.get(ship.position.directionalOffset(safeMove)).markUnsafe(ship);
        } else {
          commandQueue.push(ship.stayStill());
          gameMap.get(ship.position).markUnsafe(ship);
        }

      } else {
        gameMap.get(ship.position).markUnsafe(ship);
        commandQueue.push(ship.stayStill());
      }
    }

    if (game.turnNumber < 0.65 * hlt.constants.MAX_TURNS &&
      makingDropoff === false && me.haliteAmount >= hlt.constants.SHIP_COST &&
      !gameMap.get(me.shipyard).isOccupied &&
      me.getShips().length <= 12) {
      commandQueue.push(me.shipyard.spawn());
    } else if (game.turnNumber < 0.65 * hlt.constants.MAX_TURNS &&
      me.haliteAmount >= hlt.constants.SHIP_COST &&
      makingDropoff === false &&
      !gameMap.get(me.shipyard).isOccupied && dropoffList.length >= 2
    ) {
      commandQueue.push(me.shipyard.spawn());
    }

    await game.endTurn(commandQueue);
  }
});
