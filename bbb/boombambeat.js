tdl.provide('bbb.boombambeat');

bbb.boombambeat = bbb.boombambeat || {};

// globals
var gl;                   // the gl context.
var g_logGLCalls = true;  // whether or not to log webgl calls
var g_debug = false;      // whether or not to debug.
var g_drawOnce = false;   // draw just one frame.

// Globals
var g_gameGlobals = {
  numEnemies: 0
};

//g_drawOnce = true;
//g_debug = true;

function ValidateNoneOfTheArgsAreUndefined(functionName, args) {
  for (var ii = 0; ii < args.length; ++ii) {
    if (args[ii] === undefined) {
      tdl.error("undefined passed to gl." + functionName + "(" +
                tdl.webgl.glFunctionArgsToString(functionName, args) + ")");
    }
  }
}

function logMat4(label, mat) {
  tdl.log(
    "----[ " + label + " ]-------------------\n" +
    "    " + mat[0] + "," + mat[1] + "," + mat[2] + "," + mat[3] + ",\n" +
    "    " + mat[4] + "," + mat[5] + "," + mat[6] + "," + mat[7] + ",\n" +
    "    " + mat[8] + "," + mat[9] + "," + mat[10] + "," + mat[11] + ",\n" +
    "    " + mat[12] + "," + mat[13] + "," + mat[14] + "," + mat[15] + "\n" +
    "");
}

function Log(msg) {
  if (g_logGLCalls) {
    tdl.log(msg);
  }
}

function LogGLCall(functionName, args) {
  if (g_logGLCalls) {
    ValidateNoneOfTheArgsAreUndefined(functionName, args)
    tdl.log("gl." + functionName + "(" +
                tdl.webgl.glFunctionArgsToString(functionName, args) + ")");
  }
}

/* ---------------------------------------------------------------------------*/

/**
 * Follows a cirucular path.
 * @constructor
 */
function CirclePathFollower(name, gameObject) {
  ge.GameComponent.call(this, name, gameObject);
  this.clock = 0;
  this.position = new Float32Array(3);
  gameObject.addPublicProperties({
    world: new Float32Array(16)
  });
  ge.game.sys['aiManager'].addComponent(this);
};

tdl.base.inherit(CirclePathFollower, ge.GameComponent);

(function() {
var math = tdl.math;
var fast = tdl.fast;
var mat4 = fast.matrix4;

CirclePathFollower.prototype.process = function(elapsedTime) {
  this.clock += elapsedTime;

  var position = this.position;
  position[0] = Math.sin(this.clock) * 3;
  position[1] = Math.cos(this.clock) * 3;

  var pp = this.gameObject.publicProperties;
  //mat4.scaling(m4t0, [scale, scale, scale]);
  mat4.translation(pp.world, position);
  //mat4.mul(world, m4t0, m4t1);
};
}());

/* ---------------------------------------------------------------------------*/

/**
 * Highlights the object when under the mouse.
 *
 * @author gman (8/24/2011)
 */
function HighlightWhenUnderMouse(name, gameObject) {
  ge.GameComponent.call(this, name, gameObject);
  gameObject.addPublicProperties({
    lightColor: new Float32Array([1, 1, 1, 1]),
    mouseIsOver: false
  });
  this.red = new Float32Array([1, 0, 0, 1]);
  this.white = new Float32Array([1, 1, 1, 1]);
  ge.game.sys['aiManager'].addComponent(this);
};

tdl.base.inherit(HighlightWhenUnderMouse, ge.GameComponent);

HighlightWhenUnderMouse.prototype.process = function(elapsedTime) {
  var pp = this.gameObject.publicProperties;
  pp.lightColor.set(pp.mouseIsOver ? this.red : this.white);
};

/* ---------------------------------------------------------------------------*/

/**
 * Fires at the object when under the mouse.
 *
 * @author gman (8/24/2011)
 */
function FireWhenUnderMouse(name, gameObject) {
  ge.GameComponent.call(this, name, gameObject);
  gameObject.addPublicProperties({
    mouseIsOver: false,
    mouseRayNear: new Float32Array(3),
    mouseRayFar: new Float32Array(3)
  });
  ge.game.sys['aiManager'].addComponent(this);
};

tdl.base.inherit(FireWhenUnderMouse, ge.GameComponent);

FireWhenUnderMouse.prototype.process = function(elapsedTime) {
  var pp = this.gameObject.publicProperties;
  if (pp.mouseIsOver) {
    createMissile(pp.mouseRayNear, this.gameObject, 1.5);
    this.gameObject.removeComponent(this);
  }
};

/* ---------------------------------------------------------------------------*/

/**
 * Increments variable on creation and decrements it on destruction
 *
 * @param {!ge.GameObject} gameObject
 * @param {!Object} obj
 * @param {string} propertyName
 */
function Counter(name, gameObject, obj, propertyName) {
  ge.GameComponent.call(this, name, gameObject);
  this.obj = obj;
  this.propertyName = propertyName;
  ++obj[propertyName];
}

tdl.base.inherit(Counter, ge.GameComponent);

Counter.prototype.destroy = function() {
  --this.obj[this.propertyName];
};


/* ---------------------------------------------------------------------------*/

/**
 * Kills an object when time counts down.
 *
 * @param gameObject
 * @param time
 */
function KillTimer(name, gameObject, time) {
  ge.GameComponent.call(this, name, gameObject);
  this.time = time;
  ge.game.sys['aiManager'].addComponent(this);
}

tdl.base.inherit(KillTimer, ge.GameComponent);

KillTimer.prototype.process = function(elapsedTime) {
  this.time -= elapsedTime;
  if (this.time <= 0) {
    this.gameObject.destroy();
  }
};

/* ---------------------------------------------------------------------------*/

/**
 * Flys an object form startPosition to target over time.
 * @param name
 * @param gameObject
 * @param startPosition
 * @param target
 * @param time
 */
function FlyToTarget(name, gameObject, startPosition, target, time) {
  ge.GameComponent.call(this, name, gameObject);
  this.time = time;
  this.clock = 0;
  this.startPosition = new Float32Array(startPosition);
  // TODO(gman): There probably needs to be a better way to link objects
  // because the target could be removed and this would then be invalid.
  this.target = target;
  this.position = new Float32Array(3);
  this.targetPosition = new Float32Array(3);
  gameObject.addPublicProperties({
    world: new Float32Array(16)
  });
  ge.game.sys['aiManager'].addComponent(this);
}

tdl.base.inherit(FlyToTarget, ge.GameComponent);

(function() {
var math = tdl.math;
var fast = tdl.fast;
var mat4 = fast.matrix4;

FlyToTarget.prototype.process = function(elapsedTime) {
  this.clock += elapsedTime;
//console.log("clock: " + this.clock + " time: " + this.time);
  var lerp = this.clock / this.time;
  lerp = Math.min(1, lerp);
  if (lerp == 1) {
    this.target.destroy();
    this.gameObject.destroy();
    return;
  }

  var position = this.position;
  var targetPosition = this.targetPosition;
  var pp = this.gameObject.publicProperties;
  var targetPP = this.target.publicProperties;
  mat4.getTranslation(targetPosition, targetPP.world);
  fast.lerpVector(position, this.startPosition, this.targetPosition, lerp);
  mat4.translation(pp.world, position);
};
}());

/* ---------------------------------------------------------------------------*/

/**
 * Launches a new wave when all enemies are dead.
 * @param gameObject
 * @param time
 */
function LaunchWave(name, gameObject, enemyList) {
  ge.GameComponent.call(this, name, gameObject);
  ge.game.sys['aiManager'].addComponent(this);

  this.enemyList = enemyList;
  this.clock = 0;
  this.index = 0;
  this.wait = 0;
}

tdl.base.inherit(LaunchWave, ge.GameComponent);

LaunchWave.prototype.process = function(elapsedTime) {
  this.clock += elapsedTime;
  while (this.index < this.enemyList.length &&
         this.clock >= this.enemyList[this.index].time) {
    var enemyInfo = this.enemyList[this.index++];
    ge.game.addObject(enemyInfo.type());
  }

  if (this.wait > 0) {
    this.wait -= elapsedTime;
    if (this.wait <= 0) {
      this.clock = 0;
      this.index = 0;
    }
  } else {
    // restart if there are no enemies and we've added all of these ones.
    if (this.index >= this.enemyList.length &&
        g_gameGlobals.numEnemies == 0) {
      this.wait = 2;
    }
  }
};

/* ---------------------------------------------------------------------------*/

function createMissile(startPosition, target, time) {
  var gobj = new ge.GameObject();
  var model = ge.game.sys['modelManager'].getModel("sphere");
  gobj.addComponent(
      new FlyToTarget("flyToTarget", gobj, startPosition, target, time));
  gobj.addComponent(new ge.ModelRenderer("modelRender", gobj, model));
  return gobj;
}

function createCirclePathEnemy() {
  var gobj = new ge.GameObject();
  var model = ge.game.sys['modelManager'].getModel("cube");
  gobj.addComponent(new CirclePathFollower("ai", gobj));
  gobj.addComponent(new ge.MouseTarget("mouseTarget", gobj, 1.0));
  gobj.addComponent(
      new HighlightWhenUnderMouse("highlightWhenUnderMouse", gobj));
  gobj.addComponent(new FireWhenUnderMouse("fireWhenUnderMouse", gobj));
  gobj.addComponent(new ge.ModelRenderer("modelRender", gobj, model));
  gobj.addComponent(new KillTimer("killTimer", gobj, 10));
  gobj.addComponent(
      new Counter("enemyCounter", gobj, g_gameGlobals, 'numEnemies'));
  return gobj;
}

function createLaunchWave(enemyList) {
  var gobj = new ge.GameObject();
  gobj.addComponent(new LaunchWave("launchWave", gobj, enemyList));
  return gobj;
}

function initialize() {
  var canvas = document.getElementById("canvas");
  var game = new ge.Game();

  game.addSystem("inputManager", new ge.InputManager(canvas));
  game.addSystem("aiManager", new ge.AIManager());
  game.addSystem("renderer", new ge.Renderer(canvas));
  game.addSystem("modelManager", new ge.ModelManager());
  game.addSystem(
      "fpsCounter", new ge.FPSCounter(document.getElementById("fps")));

  var enemyList = [
    { time:  0, type: createCirclePathEnemy },
    { time:  2, type: createCirclePathEnemy },
    { time:  3, type: createCirclePathEnemy },
    { time:  5, type: createCirclePathEnemy },
    { time:  6, type: createCirclePathEnemy },
    { time:  7, type: createCirclePathEnemy },

    { time:  8, type: createCirclePathEnemy },
    { time:  9, type: createCirclePathEnemy },
    { time: 10, type: createCirclePathEnemy },
    { time: 11, type: createCirclePathEnemy },
    { time: 12, type: createCirclePathEnemy },
    { time: 13, type: createCirclePathEnemy },
    { time: 14, type: createCirclePathEnemy },
    { time: 15, type: createCirclePathEnemy },
  ];
  createLaunchWave(enemyList);

  return true;
}

