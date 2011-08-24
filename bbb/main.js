tdl.require('tdl.buffers');
tdl.require('tdl.fast');
tdl.require('tdl.fps');
tdl.require('tdl.log');
tdl.require('tdl.math');
tdl.require('tdl.models');
tdl.require('tdl.primitives');
tdl.require('tdl.programs');
tdl.require('tdl.textures');
tdl.require('tdl.webgl');

tdl.require('ge.gamecomponent');
tdl.require('ge.game');
tdl.require('ge.gamesystem');
tdl.require('ge.gameobject');
tdl.require('ge.modelmanager');
tdl.require('ge.renderer');
tdl.require('ge.modelrenderer');
tdl.require('ge.enemylauncher');
tdl.require('ge.fpscounter');
tdl.require('ge.aimanager');
tdl.require('ge.inputmanager');

tdl.require('bbb.boombambeat');

window.onload = main;

function main() {
  return initialize();
}

