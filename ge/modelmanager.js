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


/**
 * @fileoverview This file contains the 'ModelManager' implemenation.
 */

tdl.provide('ge.modelmanager');

tdl.require('tdl.models');
tdl.require('tdl.primitives');
tdl.require('tdl.programs');
tdl.require('tdl.textures');
tdl.require('ge.gamesystem');

/**
 * A module for ModelManager.
 * @namespace
 */
ge.modelmanager = ge.modelmanager || {};

function ModelManager() {
  this.models = {};

  /**
   * Sets up sphere.
   */
  function setupSphere() {
    var textures = {
      diffuseSampler: tdl.textures.loadTexture('assets/sometexture.png')};
    var program = tdl.programs.loadProgramFromScriptTags(
        'sphereVertexShader',
        'sphereFragmentShader');
    var arrays = tdl.primitives.createSphere(0.4, 10, 12);

    return new tdl.models.Model(program, arrays, textures);
  }

  function setupCube() {
    var textures = {
      diffuseSampler: tdl.textures.loadTexture('assets/sometexture.png')};
    var program = tdl.programs.loadProgramFromScriptTags(
        'sphereVertexShader',
        'sphereFragmentShader');
    var arrays = tdl.primitives.createCube(1);
    return new tdl.models.Model(program, arrays, textures);
  }

  this.models.sphere = setupSphere();
  this.models.cube = setupCube();
};

ModelManager.prototype.process = function() {
};

ModelManager.prototype.getModel = function(name) {
  return this.models[name];
};



