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
  await game.ready('MyJavaScriptBot-19');

  logging.info(`My Player ID is ${game.myId}.`);

  while (true) {
    await game.updateFrame();

    const {
      gameMap,
      me
    } = game;
    const homePosition = me.shipyard.position;

    const naiveNavigate2 = function (ship, destination, shipState) {
      let move = [];
      for (const direction of gameMap.getUnsafeMoves(ship.position, destination)) {
        const targetPos = ship.position.directionalOffset(direction);
        if (!gameMap.get(targetPos).isOccupied || (gameMap.get(targetPos).hasStructure && game.turnNumber > 0.95 * hlt.constants.MAX_TURNS)) {
          if (!(game.turnNumber > 0.95 * hlt.constants.MAX_TURNS && dropoffList.includes(targetPos))) {
            move.push(direction);
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
          if (safeOptions.length > 0) {
            let testDestination = [];
            for (i = 0; i < options.length; i++) {
              testDestination.push(ship.position.directionalOffset(options[i]));
            }
            let num = Math.floor(options.length * Math.random());
            let newDest = options[num];
            move.push(newDest);
          }
        } {
          move.push(Direction.Still);
        }
      }

      if (gameMap.get(ship.position).hasStructure && move.length === 0) {
        return Direction.East;
      } else if (move.length > 0) {
        let newMove = Math.floor(move.length * Math.random());
        return move[newMove];
      } {
        return Direction.Still;
      }
    };

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

    for (i = 0; i < brokenCells.length; i++) {
      allCells = allCells.concat(brokenCells[i]);
    }

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
      if (cellGroups.length > 500) {
        cellGroups.pop();
      }
    }

    const findShipState = function (ship) {
      let shipStateString = '';
      for (i = 0; i < shipStatus.length; i++) {
        if (shipStatus[i].shipId === ship.id) {
          shipStateString = shipStatus[i].shipState;
        }
      }
      return shipStateString;
    }

    const shipNumber = function (ship) {
      let shipValue = -1;
      for (i = 0; i < shipStatus.length; i++) {
        if (shipStatus[i].shipId === ship.id) {
          shipValue = [i];
        }
      }
      return shipValue;
    }

    for (i = 0; i < shipStatus.length; i++) {
      shipStatus[i].active = false;
    };
    for (const ship of me.getShips()) {
      gameMap.get(ship.position).markSafe(ship);
    }

    for (const ship of me.getShips()) {
      const currentHalite = gameMap.get(ship.position).haliteAmount;
      const shipHalite = ship.haliteAmount;
      const shipPosition = ship.position;
      const homeDistance = gameMap.calculateDistance(shipPosition, homePosition);
      const shipId = ship.id;
      let shipListOrder = shipNumber(ship);
      let shipState = findShipState(ship);

      if (shipListOrder < 0) {
        let shipDeets = {
          shipId,
          shipPosition,
          shipState: "exploring"
        }
        shipStatus.push(shipDeets);
        shipNumber(ship);
        shipListOrder = shipNumber(ship);
        shipState = findShipState(ship);
      }

      if ((shipHalite <= 100) && (game.turnNumber < (hlt.constants.MAX_TURNS * 0.95))) {
        if (shipState === "returning") {
          let shipDeets = {
            shipId,
            shipPosition,
            shipState: "exploring"
          }
          shipStatus.splice(shipListOrder, 1);
          shipStatus.push(shipDeets);
          shipNumber(ship);
          shipListOrder = shipNumber(ship);
          shipState = findShipState(ship);
        }
      }

      const dropoffShipExists = function () {
        let makingDropoff = true;
        for (i = 0; i < shipStatus.length; i++) {
          if (shipStatus[i].shipState === "creatingDropoff")
            makingDropoff = false;
        }
        return makingDropoff;
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

      if (dropoffShipExists() && me.getShips().length >= 8 && me.getDropoffs().length < 1 && game.turnNumber < hlt.constants.MAX_TURNS * 0.5) {
        shipStatus[shipListOrder].shipState = "creatingDropoff"
      }

      //logging.info(`ship ${ship.id} is currently ${shipState} and is ${homeDistance} from home at ${shipPosition} holding ${shipHalite} Halite`);

      shipStatus[shipListOrder].identity = ship;
      shipStatus[shipListOrder].active = true;

      if (shipStatus[shipListOrder].shipState === "creatingDropoff") {
        if (homeDistance >= 14 &&
          (currentHalite + shipHalite + me.haliteAmount) >= 4000 &&
          makingDropoff === false) {
          makingDropoff = true;
          shipStatus[shipListOrder].direction = "dropoff";
          gameMap.get(ship.position).markUnsafe(ship);
          // commandQueue.push(ship.makeDropoff());
          continue;
        }
        let gravity = {
          position: null,
          score: 0,
        };
        for (i = 0; i < cellGroups.length; i++) {
          let dist = gameMap.calculateDistance(shipPosition, cellGroups[i].position);
          let dropoffDist = gameMap.calculateDistance(me.shipyard.position, cellGroups[i].position);
          let multiplier = Math.pow(1.08, dist);
          let score = Math.floor(cellGroups[i].crossHalite / multiplier);
          if (score > gravity.score && dropoffDist > 16) {
            //logging.info(`The cell with score: ${score}, gravity.score ${gravity.score} and dropoffDist: ${dropoffDist} is at:`);
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
        for (i = 0; i < options.length; i++) {
          let testDestination = ship.position.directionalOffset(options[i]);
          if (gameMap.get(testDestination).haliteAmount >= movementResult.halite) {
            movementResult.position = testDestination;
            movementResult.halite = gameMap.get(testDestination).haliteAmount;
          }
        }
        const destinationHalite = gameMap.get(movementResult.position).haliteAmount;
        let safeMove = naiveNavigate2(ship, movementResult.position, shipState);
        if ((destinationHalite * .25) - (currentHalite * .1) > (currentHalite * .1) ||
          currentHalite < 20 || shipHalite >= 900) {
          shipStatus[shipListOrder].intention = ship.position.directionalOffset(safeMove);
          shipStatus[shipListOrder].direction = safeMove;
        } {
          // commandQueue.push(ship.stayStill());
          shipStatus[shipListOrder].direction = "still";
          gameMap.get(ship.position).markUnsafe(ship);
        }
      } else if (currentHalite + shipHalite + me.haliteAmount >= 4000 &&
        makingDropoff === false &&
        homeDistance >= 16 &&
        game.turnNumber < 0.70 * hlt.constants.MAX_TURNS &&
        !gameMap.get(ship.position).hasStructure &&
        dropoffList.length <= 3 &&
        checkDropoffDistance(shipPosition) &&
        me.getDropoffs().length >= 1) {
        makingDropoff = true;
        shipStatus[shipListOrder].direction = "dropoff";
        gameMap.get(ship.position).markUnsafe(ship);
        //  commandQueue.push(ship.makeDropoff());
      } else if ((ship.haliteAmount > hlt.constants.MAX_HALITE * .8) &&
        shipState != "creatingDropoff" ||
        shipState === "returning" ||
        game.turnNumber > hlt.constants.MAX_TURNS * 0.95) {
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
        let safeMove = naiveNavigate2(ship, destination, shipState);
        if (safeMove.dx === 0 && safeMove.dy === 0 && gameMap.get(shipPosition).hasStructure) {
          safeMove.dx = -1;
        }
        let safePosition = ship.position.directionalOffset(safeMove);
        if (!gameMap.get(safePosition).isOccupied || game.turnNumber > hlt.constants.MAX_TURNS * 0.95) {
          shipStatus[shipListOrder].intention = ship.position.directionalOffset(safeMove);
          shipStatus[shipListOrder].direction = safeMove;
        }
      } else if (gameMap.get(ship.position).haliteAmount < hlt.constants.MAX_HALITE / 15) {
        let gravity = {
          position: null,
          score: 0,
        };
        for (i = 0; i < cellGroups.length; i++) {
          let dist = gameMap.calculateDistance(shipPosition, cellGroups[i].position);
          let multiplier = Math.pow(1.20, dist);
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
        let options = gameMap.getUnsafeMoves(ship.position, gravity.position);
        for (i = 0; i < options.length; i++) {
          let testDestination = ship.position.directionalOffset(options[i]);
          if (gameMap.get(testDestination).haliteAmount >= movementResult.halite) {
            movementResult.position = testDestination;
            movementResult.halite = gameMap.get(testDestination).haliteAmount;
          }
        }
        if (options.length > 0) {
          let destinationHalite = gameMap.get(movementResult.position).haliteAmount;
          let safeMove = naiveNavigate2(ship, movementResult.position, shipState);
          let safePosition = ship.position.directionalOffset(safeMove);
          let reallySafe = gameMap.get(safePosition).isOccupied;
          if ((destinationHalite * .25) - (currentHalite * .1) > (currentHalite * .25) && !reallySafe || currentHalite < 20 && !reallySafe) {
            shipStatus[shipListOrder].intention = safePosition;
            shipStatus[shipListOrder].direction = safeMove;
            // commandQueue.push(ship.move(safeMove));
          } else {
            shipStatus[shipListOrder].direction = "still";
            gameMap.get(ship.position).markUnsafe(ship);
            // commandQueue.push(ship.stayStill());
          }
        } else {
          // commandQueue.push(ship.stayStill());
          shipStatus[shipListOrder].direction = "still";
          gameMap.get(ship.position).markUnsafe(ship);
        }
      } else {
        shipStatus[shipListOrder].direction = "still";
        gameMap.get(ship.position).markUnsafe(ship);
        // commandQueue.push(ship.stayStill());
      }
    }

    for (i = 0; i < shipStatus.length; i++) {
      if (shipStatus[i].active === false) {
        shipStatus.splice(i, 1)
      }
    }

    for (const moves of shipStatus) {
      if (moves.direction === "still" && moves.active) {
        logging.info("still triggered! " + moves.identity.id);
        gameMap.get(moves.shipPosition).markUnsafe(moves.identity);
        commandQueue.push(moves.identity.stayStill());
      } else if (moves.direction === "dropoff" && moves.active) {
        logging.info("dropoff triggered " + moves.identity.id);
        gameMap.get(moves.shipPosition).markUnsafe(moves.identity);
        commandQueue.push(moves.identity.makeDropoff());
      }
    }

    for (const moves of shipStatus) {
      let direction = moves.direction;
      let destPosition = moves.shipPosition.directionalOffset(direction);
      logging.info(destPosition);
      if (moves.active) {
        if (moves.direction != "dropoff" &&
          moves.direction != "still" &&
          !gameMap.get(moves.intention).isOccupied) {
          logging.info("exploring triggered! " + moves.identity.id);
          /* logging.info(moves);
          logging.info("moves: " + moves);
          logging.info(Object.keys(moves));
          logging.info(Object.values(moves));
          logging.info(moves.intention);
          logging.info(moves.direction); */
          gameMap.get(moves.shipPosition).markUnsafe(moves.identity);
          let thisShip = moves.identity;
          commandQueue.push(thisShip.move(moves.direction));
        }
      }
    }

    logging.info(gameMap.get(me.shipyard).isOccupied);

    if (game.turnNumber < 0.60 * hlt.constants.MAX_TURNS &&
      makingDropoff === false && me.haliteAmount >= hlt.constants.SHIP_COST &&
      !gameMap.get(me.shipyard).isOccupied &&
      me.getShips().length <= 14) {
      commandQueue.push(me.shipyard.spawn());
    } else if (game.turnNumber < 0.60 * hlt.constants.MAX_TURNS &&
      me.haliteAmount >= hlt.constants.SHIP_COST &&
      makingDropoff === false &&
      !gameMap.get(me.shipyard).isOccupied && dropoffList.length >= 2
    ) {
      commandQueue.push(me.shipyard.spawn());
    }
    await game.endTurn(commandQueue);
  }
});
