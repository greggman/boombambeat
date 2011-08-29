"strict";

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

/* ---------------------------------------------------------------------------*/

var kGeoScale = 100;

function setupCubeGeo() {
  var kNumModels = 1000;
  var kOffsetTextureHeight = 4;
  var cubeArrays = tdl.primitives.createCube(0.5);

  // Create Shader Program
  var program = tdl.programs.loadProgramFromScriptTags(
      'repeatVertexShader',
      'repeatFragmentShader');

  var arrays = [
    cubeArrays
  ];

  var instances = [];
  for (var ii = 0; ii < kNumModels; ++ii) {
    instances.push({
      color: new Float32Array([Math.random(), Math.random(), Math.random()]),
      arrayIndex: Math.floor(Math.random() * arrays.length)
    });
  }

  var offsetTexture = new tdl.textures.ExternalTexture(gl.TEXTURE_2D);
  offsetTexture.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  offsetTexture.setParameter(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  offsetTexture.setParameter(gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  offsetTexture.setParameter(gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  offsetTexture.setParameter(gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // TODO(gman): use floating point textures.
  var offsetData = new Uint8Array(kNumModels * kOffsetTextureHeight * 4);
  var offsetStride = kNumModels * 4;

  function PlusMinusOneTo8Bit(value) {
    if (value < -1 || value > 1) {
      throw 'value out of range';
    }
    var v = Math.max(0, Math.min(255, Math.floor((value * 0.5 + 0.5) * 256)));
    //tdl.log(value, v);
    return v;
  }

  function scaleToWorld(v) {
    if (v < -kGeoScale || v > kGeoScale) {
      throw 'scaleToWorld: value out of range (' + kGeoScale + '): ' + v;
    }
    v = v / kGeoScale;
    return Math.max(0,
                    Math.min(65535,
                             Math.floor((v * 0.5 + 0.5) * 65536)));
  }

  function setOffset(ii, position, color, rotationMatrix) {
    var off = ii * 4;
    var x = scaleToWorld(position[0]);
    var y = scaleToWorld(position[1]);
    var z = scaleToWorld(position[2]);

    var q = tdl.quaternions.rotationToQuaternion(rotationMatrix);
    //tdl.log(q);

    offsetData[offsetStride * 0 + off + 0] = x & 255;
    offsetData[offsetStride * 0 + off + 1] = y & 255;
    offsetData[offsetStride * 0 + off + 2] = z & 255;
    offsetData[offsetStride * 1 + off + 0] = Math.floor(x / 256);
    offsetData[offsetStride * 1 + off + 1] = Math.floor(y / 256);
    offsetData[offsetStride * 1 + off + 2] = Math.floor(z / 256);
    offsetData[offsetStride * 2 + off + 0] = color[0] * 255;
    offsetData[offsetStride * 2 + off + 1] = color[1] * 255;
    offsetData[offsetStride * 2 + off + 2] = color[2] * 255;
    offsetData[offsetStride * 3 + off + 0] = PlusMinusOneTo8Bit(q[0]);
    offsetData[offsetStride * 3 + off + 1] = PlusMinusOneTo8Bit(q[1]);
    offsetData[offsetStride * 3 + off + 2] = PlusMinusOneTo8Bit(q[2]);
    offsetData[offsetStride * 3 + off + 3] = PlusMinusOneTo8Bit(q[3]);
  }

  var kPerCircle = 20;
  var kCircleRadius = 3;
  var kCircleSpacing = 1.2;

  for (var ii = 0; ii < instances.length; ++ii) {
    var instance = instances[ii];
    var circle = Math.floor(ii / kPerCircle);
    var unit = (ii % kPerCircle) / kPerCircle;
    var position = [
      Math.sin(unit * Math.PI * 2) * kCircleRadius,
      Math.cos(unit * Math.PI * 2) * kCircleRadius,
      kCircleSpacing * circle
    ];
    var matrix = tdl.math.matrix4.rotationZ(unit * Math.PI * 2);
    //logMat4("mat", matrix);
    //tdl.math.matrix4.rotateX(matrix, Math.random() * Math.PI);
    setOffset(ii,
       position,
       instance.color,
       matrix);
  }

  offsetTexture.bindToUnit(0);
  gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, kNumModels, kOffsetTextureHeight,
      0, gl.RGBA, gl.UNSIGNED_BYTE, offsetData);

  var textures = {
      diffuseSampler: tdl.textures.loadTexture('assets/google.png'),
      offsetTexture: offsetTexture
  };


  // Expand arrays from instances to geometry.

  // Step 1: Add an extra colorMult, clockOffset, clockSpeed,
  //     and radius fields to each geometry
  for (var ii = 0; ii < arrays.length; ++ii) {
    var numElements = arrays[ii].position.numElements;
    arrays[ii].extra = new tdl.primitives.AttribBuffer(4, numElements);
  }

  // Step 2: convert instances to expanded geometry
  var arrayInstances = [];
  for (var ii = 0; ii < instances.length; ++ii) {
    arrayInstances.push(arrays[instances[ii].arrayIndex]);
  }
  var expanded = tdl.primitives.concatLarge(arrayInstances);
  if (expanded.arrays.length > 1) {
    throw('too many models or too much geometry');
  }

  // Step 3: Make models from our expanded geometry.
  var models = [];
  for (var ii = 0; ii < expanded.arrays.length; ++ii) {
    models.push(new tdl.models.Model(program, expanded.arrays[ii], textures));
  }

  // Step 4: Copy in Colors and other per instance data.
  for (var ii = 0; ii < instances.length; ++ii) {
    var instance = instances[ii];
    var info = expanded.instances[ii];
    var index = info.arrayIndex;
    instance.firstVertex = info.firstVertex;
    instance.numVertices = info.numVertices;
    instance.expandedArrayIndex = index;
    var arrays = expanded.arrays[index];
    var modelNdxOffset = ii / kNumModels + 0.5 / kNumModels;
    arrays.extra.fillRange(
        instance.firstVertex, instance.numVertices,
        [modelNdxOffset, modelNdxOffset, modelNdxOffset, modelNdxOffset]);
  }
  for (var ii = 0; ii < models.length; ++ii) {
    var arrays = expanded.arrays[ii];
    models[ii].setBuffer('extra', arrays.extra);
  }

  return models[0];
}

RepeatedGeometryRenderer = function(name, gameObject, model) {
  ge.GameComponent.call(this, name, gameObject);
  this.model = model;
  gameObject.addPublicProperties({
    world: new Float32Array(16),
    lightColor: new Float32Array([1, 1, 1, 1])
  });

  var pp = gameObject.publicProperties;
  var world = new Float32Array(16);
  tdl.fast.matrix4.identity(world);
  this.per = {
    world: world,
    lightColor: new Float32Array([1, 1, 1, 1]),
    offsetScale: new Float32Array(
        [kGeoScale * 2, kGeoScale * 2, kGeoScale * 2, 1])
  };

  ge.game.sys['renderer'].addComponent(this);
}

tdl.base.inherit(RepeatedGeometryRenderer, ge.GameComponent);

RepeatedGeometryRenderer.prototype.draw = function(renderer) {
  renderer.drawPrep(this.model);
  renderer.draw(this.model, this.per);
};

function createRepeatedGeometryRenderer(model) {
  var gobj = new ge.GameObject();
  gobj.addComponent(
      new RepeatedGeometryRenderer("repeatedGeoRenderer", gobj, model));
  return gobj;
}

/* ---------------------------------------------------------------------------*/

function initialize() {
  var canvas = document.getElementById("canvas");
  var game = new ge.Game();

  game.addSystem("inputManager", new ge.InputManager(canvas));
  game.addSystem("aiManager", new ge.AIManager());
  game.addSystem("renderer", new ge.Renderer(canvas));
  game.addSystem("modelManager", new ge.ModelManager());
  game.addSystem(
      "fpsCounter", new ge.FPSCounter(document.getElementById("fps")));

  var model = setupCubeGeo();
  createRepeatedGeometryRenderer(model);

  return true;

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

