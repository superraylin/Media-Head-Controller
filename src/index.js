// Based on python code provided in "Head Pose Estimation using OpenCV and Dlib"
//   https://www.learnopencv.com/head-pose-estimation-using-opencv-and-dlib/#code

import cv from "@mjyc/opencv.js";
import xs from "xstream";
import { makeDOMDriver } from "@cycle/dom";
import { run } from "@cycle/run"; //
import { makePoseDetectionDriver } from "cycle-posenet-driver";

window.cursor_pos = [100,100];
window.nose_x = -1;

let new_rot = [0,0,0]

class Button_Area{
  constructor(pos,width,height){
    this.upper_left = [pos[0]+width/2,pos[1]+height];
    this.lower_right = [pos[0]-width/2,pos[1]-height];
    this.pos = pos;
    this.triggered = false;
  }
  check_in(cursor_pos){
    if(cursor_pos[0]>= this.lower_right[0] && cursor_pos[0]<= this.upper_left[0]){
      if(cursor_pos[1]>= this.lower_right[1] && cursor_pos[1]<= this.upper_left[1]){
        this.triggered = true;
        return true;
      }
    }
    return false;
  }
}

let up_trig = new Button_Area([100,25],25,25);
let right_trig = new Button_Area([195,100],5,100);
let left_trig = new Button_Area([5,100],5,100);
let down_trig = new Button_Area([100,195],90,5);

let region1 = new Button_Area([30,75],20,75);
let region2 = new Button_Area([170,75],20,75);
let region3 = new Button_Area([100,170],90,20);

let buttons_list = [];
buttons_list.push(up_trig,right_trig,left_trig,down_trig,region1,region2,region3);


function main(sources) {
  // 3D model points
  const numRows = 4;
  const modelPoints = cv.matFromArray(numRows, 3, cv.CV_64FC1, [
    0.0,
    0.0,
    0.0, // Nose tip
    0.0,
    0.0,
    0.0, // HACK! solvePnP doesn't work with 3 points, so copied the
    //   first point to make the input 4 points
    // 0.0, -330.0, -65.0,  // Chin
    -225.0,
    170.0,
    -135.0, // Left eye left corner
    225.0,
    170.0,
    -135.0 // Right eye right corne
    // -150.0, -150.0, -125.0,  // Left Mouth corner
    // 150.0, -150.0, -125.0,  // Right mouth corner
  ]);

  // Camera internals
  const size = { width: 640, height: 480 };
  const focalLength = size.width;
  const center = [size.width / 2, size.height / 2];
  const cameraMatrix = cv.matFromArray(3, 3, cv.CV_64FC1, [
    focalLength,
    0,
    center[0],
    0,
    focalLength,
    center[1],
    0,
    0,
    1
  ]);
  //console.log("Camera Matrix:", cameraMatrix.data64F);

  // Create Matrixes
  const imagePoints = cv.Mat.zeros(numRows, 2, cv.CV_64FC1);
  const distCoeffs = cv.Mat.zeros(4, 1, cv.CV_64FC1); // Assuming no lens distortion
  const rvec = new cv.Mat({ width: 1, height: 3 }, cv.CV_64FC1);
  const tvec = new cv.Mat({ width: 1, height: 3 }, cv.CV_64FC1);
  const pointZ = cv.matFromArray(1, 3, cv.CV_64FC1, [0.0, 0.0, 500.0]);
  const pointY = cv.matFromArray(1, 3, cv.CV_64FC1, [0.0, 500.0, 0.0]);
  const pointX = cv.matFromArray(1, 3, cv.CV_64FC1, [500.0, 0.0, 0.0]);
  const noseEndPoint2DZ = new cv.Mat();
  const nose_end_point2DY = new cv.Mat();
  const nose_end_point2DX = new cv.Mat();
  const jaco = new cv.Mat();
  window.beforeunload = () => {
    im.delete();
    imagePoints.delete();
    distCoeffs.delete();
    rvec.delete();
    tvec.delete();
    pointZ.delete();
    pointY.delete();
    pointX.delete();
    noseEndPoint2DZ.delete();
    nose_end_point2DY.delete();
    nose_end_point2DX.delete();
    jaco.delete();
  };

  let nose_x =0, nose_y = 0
  var move_list = [];
  var prevX = 0, currX = 0, prevY = 0, currY = 0;

  // main event loop
  sources.PoseDetection.poses.addListener({
    next: poses => {
      // skip if no person or more than one person is found
      if (poses.length !== 1) {
        return;
      }

      const person1 = poses[0];
      if (
        !person1.keypoints.find(kpt => kpt.part === "nose") ||
        !person1.keypoints.find(kpt => kpt.part === "leftEye") ||
        !person1.keypoints.find(kpt => kpt.part === "rightEye")
      ) {
        return;
      }
      const ns = person1.keypoints.filter(kpt => kpt.part === "nose")[0]
        .position;
      const le = person1.keypoints.filter(kpt => kpt.part === "leftEye")[0]
        .position;
      const re = person1.keypoints.filter(kpt => kpt.part === "rightEye")[0]
        .position;
      let lea = {
        "y": 0,
        "x": 0
      };
      let rea = {
        "y": 0,
        "x": 0
      };
      if (!person1.keypoints.find(kpt => kpt.part === "leftEar")) {
        rea = person1.keypoints.filter(kpt => kpt.part === "rightEar")[0]
        .position;
      } else {
        lea = person1.keypoints.filter(kpt => kpt.part === "leftEar")[0]
        .position;
      }

      // 2D image points. If you change the image, you need to change vector
      [
        ns.x,
        ns.y, // Nose tip
        ns.x,
        ns.y, // Nose tip (see HACK! above)
        // 399, 561, // Chin
        le.x,
        le.y, // Left eye left corner
        re.x,
        re.y, // Right eye right corner
        // 345, 465, // Left Mouth corner
        // 453, 469 // Right mouth corner
        lea.x,
        lea.y,
        rea.x,
        rea.y
      ].map((v, i) => {
        imagePoints.data64F[i] = v;
      });

      // Hack! initialize transition and rotation matrixes to improve estimation
      tvec.data64F[0] = -100;
      tvec.data64F[1] = 100;
      tvec.data64F[2] = 1000;
      const distToLeftEyeX = Math.abs(le.x - ns.x);
      const distToRightEyeX = Math.abs(re.x - ns.x);

      //const norm_x = distToLeftEyeX;
      //const norm_y = Math.abs((lea.y + lea.x) / 2 - ns.x);

      if (distToLeftEyeX < distToRightEyeX) {
        // looking at left
        rvec.data64F[0] = -1.0;
        rvec.data64F[1] = -0.75;
        rvec.data64F[2] = -3.0;
      } else {
        // looking at right
        rvec.data64F[0] = 1.0;
        rvec.data64F[1] = -0.75;
        rvec.data64F[2] = -3.0;
      }

      const success = cv.solvePnP(
        modelPoints,
        imagePoints,
        cameraMatrix,
        distCoeffs,
        rvec,
        tvec,
        true
      );
      if (!success) {
        return;
      }
      // console.log("Rotation Vector:", rvec.data64F);
      // console.log(
      //   "Rotation Vector (in degree):",
      //   rvec.data64F.map(d => (d / Math.PI) * 180)
      // );
      // console.log("Translation Vector:", tvec.data64F);

      // Project a 3D points [0.0, 0.0, 500.0],  [0.0, 500.0, 0.0],
      //   [500.0, 0.0, 0.0] as z, y, x axis in red, green, blue color
      cv.projectPoints(
        pointZ,
        rvec,
        tvec,
        cameraMatrix,
        distCoeffs,
        noseEndPoint2DZ,
        jaco
      );
      cv.projectPoints(
        pointY,
        rvec,
        tvec,
        cameraMatrix,
        distCoeffs,
        nose_end_point2DY,
        jaco
      );
      cv.projectPoints(
        pointX,
        rvec,
        tvec,
        cameraMatrix,
        distCoeffs,
        nose_end_point2DX,
        jaco
      );

      // let im = cv.imread(document.getElementById("canvasOutput"));
      // // color the detected eyes and nose to purple
      // for (var i = 0; i < numRows; i++) {
      //   cv.circle(
      //     im,
      //     {
      //       x: imagePoints.doublePtr(i, 0)[0],
      //       y: imagePoints.doublePtr(i, 1)[0]
      //     },
      //     3,
      //     [255, 0, 255, 255],
      //     -1
      //   );
      // }
      // draw axis
      //const pNose = { x: imagePoints.data64F[0], y: imagePoints.data64F[1] };
      // const pZ = {
      //   x: noseEndPoint2DZ.data64F[0],
      //   y: noseEndPoint2DZ.data64F[1]
      // };
      // const p3 = {
      //   x: nose_end_point2DY.data64F[0],
      //   y: nose_end_point2DY.data64F[1]
      // };
      // const p4 = {
      //   x: nose_end_point2DX.data64F[0],
      //   y: nose_end_point2DX.data64F[1]
      // };
      // cv.line(im, pNose, pZ, [255, 0, 0, 255], 2);
      // cv.line(im, pNose, p3, [0, 255, 0, 255], 2);
      // cv.line(im, pNose, p4, [0, 0, 255, 255], 2);

      //const lea = person1.keypoints.filter(kpt => kpt.part === "leftEar")[0]
      //  .position;
      //const rea = person1.keypoints.filter(kpt => kpt.part === "rightEar")[0]
      //  .position;

      // Display image
      //change dot position



      window.nose_x = (window.nose_x === -1)? ns.x:window.nose_x

      let diff_x = ns.x-window.nose_x;
      window.nose_x  = ns.x;


      let norm_x = ns.x - (re.x);
      let norm_y = ns.y - (lea.y + rea.y);

      console.log(window.cursor_pos[0],diff_x)

      window.cursor_pos[0] = Math.max(Math.min(window.cursor_pos[0]+diff_x,200),0);
      window.cursor_pos[1] = Math.max(Math.min(norm_y+50,200),0);

      console.log(window.cursor_pos[0],window.cursor_pos[1])

      if(move_list.length <= 20){
        move_list.push([Math.floor(window.cursor_pos[0]),Math.floor(window.cursor_pos[1])]);
      }else{
        move_list.shift();
        move_list.push([Math.floor(window.cursor_pos[0]),Math.floor(window.cursor_pos[1])]);
      }

      //draw line in canvas
      var ctx = document.getElementById("myCanvas").getContext("2d");
      draw(ctx,move_list);

      // cv.imshow(document.getElementById("canvasOutput"), im);
      // im.delete();
    }
  });

  const params$ = xs.of({
    singlePoseDetection: { minPoseConfidence: 0.2 }
  });
  const vdom$ = sources.PoseDetection.DOM;

  return {
    DOM: vdom$,
    PoseDetection: params$
  };
}

function reset_buttons(){
  for(const button of buttons_list){
      button.triggered = false;
  }
}
function draw_line(ctx,start,end,rgba,linewidth){
  ctx.beginPath();
  ctx.moveTo(start[0],start[1]);
  ctx.lineTo(end[0],end[1]);
  ctx.strokeStyle = rgba;
  ctx.lineWidth = linewidth;
  ctx.stroke();
  ctx.closePath();

}
function draw(ctx,move_list) {
    ctx.clearRect(0, 0, 200, 200);

    //define color

    let yellow = 'rgba(255, 255, 0, 0.5)';
    let red = 'rgba(255, 0, 0, 0.3)';
    let green = 'rgba(0, 255, 0, 0.5)';
    let noColor = 'rgba(0, 0, 0, 0)';

    let col_right = yellow;
    let col_left = yellow;
    let col_down = yellow;
    let col_up = green;

    //draw feedback trace
    for(let i=0;i<move_list.length-1;i++){
      draw_line(ctx,move_list[i],move_list[i+1],'rgba(0, 0, 0, 1)',2);
    }


    let cur_cursor = [move_list[move_list.length-1][0],move_list[move_list.length-1][1]];

    ctx.fillStyle = 'rgba(0, 0, 200, 1)';
    ctx.fillRect(cur_cursor[0]-5,cur_cursor[1]-5,10,10);

    new_rot[0] = Math.PI/200.0 * cur_cursor[1] - Math.PI/2;
    new_rot[1] = Math.PI/200.0 * cur_cursor[0] - Math.PI/2


    up_trig.check_in(cur_cursor);

    if(up_trig.triggered === true){
      region1.check_in(cur_cursor);
      region2.check_in(cur_cursor);
      region3.check_in(cur_cursor);
    }

    //if cursor in region1 after region2 or region3, reset all triggered flag
    if((up_trig.triggered && region1.triggered && (region2.triggered))||
        (up_trig.triggered && region2.triggered && (region1.triggered))){
      reset_buttons();
    }


    if(up_trig.triggered && down_trig.check_in(cur_cursor)) {
      // if(player.getPlayerState()!=1){
      //     player.playVideo();
      // }else{
      //     player.pauseVideo();
      // }
      reset_buttons();
    }

    if(up_trig.triggered && right_trig.check_in(cur_cursor)) {
      player.playVideo();
      //player.seekTo(player.getCurrentTime()+15);
      reset_buttons();
    }


    if(up_trig.triggered && left_trig.check_in(cur_cursor)) {
      //player.seekTo(player.getCurrentTime()-15);
      reset_buttons();
    }

    //draw feedforward trace to trigger

    if (region3.triggered === true){
      col_left = yellow;
      col_right = yellow;
      col_down = green;
    }

    if(region1.triggered === true){
      col_left = green;
      col_right = red;
      col_down = noColor;
    }
    if (region2.triggered === true){
      col_left = red;
      col_right = green;
      col_down = noColor;
    }



    if(up_trig.triggered === false){
      draw_line(ctx,cur_cursor,up_trig.pos, 'rgba(0, 255, 0, 0.5)',10);
    }else{
      draw_line(ctx, cur_cursor,right_trig.pos, col_right,10);
      draw_line(ctx, cur_cursor,left_trig.pos, col_left,10);
      draw_line(ctx, cur_cursor,down_trig.pos, col_down,10);
    }
}


// Check out https://cycle.js.org/ for using Cycle.js
run(main, {
  DOM: makeDOMDriver("#app"),
  PoseDetection: makePoseDetectionDriver()
});
