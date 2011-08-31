/*
 * Copyright 2011, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
(function(){

"strict";

var kGeoScale = 100;

var repeatedCubeModel;

var setupCubeGeo = function() {
  var kNumModels = 1000;
  var kPerCircle = 20;
  var kCircleRadius = 3;
  var kCircleSpacing = 1.2;

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
    var circle = Math.floor(ii / kPerCircle);
    instances.push({
      color: new Float32Array(
          [(circle % 6) / 5,
           (circle % 8) / 9,
           (circle % 3) / 4,
          ]),
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

  var kCircleOff = 0.2;
  for (var ii = 0; ii < instances.length; ++ii) {
    var instance = instances[ii];
    var circle = Math.floor(ii / kPerCircle);
    var unit = (ii % kPerCircle) / kPerCircle;
    var position = [
      Math.sin(unit * Math.PI * 2 + circle * kCircleOff) * kCircleRadius,
      Math.cos(unit * Math.PI * 2 + circle * kCircleOff) * kCircleRadius,
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


createRepeatedGeometryRenderer = function(model) {
  if (!repeatedCubeModel) {
    repeatedCubeModel = setupCubeGeo();
  }

  var gobj = new ge.GameObject();
  gobj.addComponent(
      new RepeatedGeometryRenderer(
          "repeatedGeoRenderer", gobj, repeatedCubeModel));
  return gobj;
}

}());
