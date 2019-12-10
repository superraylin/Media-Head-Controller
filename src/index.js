// Based on python code provided in "Head Pose Estimation using OpenCV and Dlib"
//   https://www.learnopencv.com/head-pose-estimation-using-opencv-and-dlib/#code

import cv from "@mjyc/opencv.js";
import xs from "xstream";
import { makeDOMDriver } from "@cycle/dom";
import { run } from "@cycle/run"; //
import { makePoseDetectionDriver } from "cycle-posenet-driver";

window.cursor_pos = [100,100];
window.nose_x = -1;
window.y_bound = [-50,112];
window.eye_dis = 80;
window.new_rot = [0,0,0];

// Create a control panel for media head pose control
class Button_Area{
  constructor(x,y,width,height){
    this.upper_left = [x,y];
    this.lower_right = [x+width,y+height];
    this.pos = [x+width/2,y+height/2];
    this.triggered = false;
  }
  check_in(cursor_pos){
    if(cursor_pos[0] <=this.lower_right[0] && cursor_pos[0] >=this.upper_left[0]){
      if(cursor_pos[1] <=this.lower_right[1] && cursor_pos[1]>= this.upper_left[1]){
        this.triggered = true;
        return true;
      }
    }
    return false;
  }
}

// Control panel keys for different functionalities and their operation area
let up_trig = new Button_Area(85,0,30,30);
let right_trig = new Button_Area(180,0,20,200);
let left_trig = new Button_Area(0,0,20,200);
let down_trig = new Button_Area(20,180,180,20);

let region1 = new Button_Area(20,0,50,150);
let region2 = new Button_Area(130,0,50,150);
let region3 = new Button_Area(20,150,160,40);

let buttons_list = [];
buttons_list.push(up_trig,right_trig,left_trig,down_trig,region1,region2,region3);

var move_list = [];

function main(sources) {
  /***** Begin of written by https://github.com/mjyc/head-pose-estimation-demo******/
  const numRows = 4;
  const modelPoints = cv.matFromArray(numRows, 3, cv.CV_64FC1, [
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0,
    -225.0,
    170.0,
    -135.0,
    225.0,
    170.0,
    -135.0
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


  // Create Matrixes
  // Find the locations of n 3D points on the object and the corresponding 2D projections in the image
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

  /***** End of written by https://github.com/mjyc/head-pose-estimation-demo******/

  let nose_x =0, nose_y = 0
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
        .position; // current position of nose
      const le = person1.keypoints.filter(kpt => kpt.part === "leftEye")[0]
        .position; // current position of left eye
      const re = person1.keypoints.filter(kpt => kpt.part === "rightEye")[0]
        .position; // current position of right eye
      let lea = {
        "y": 0,
        "x": 0
      };
      let rea = {
        "y": 0,
        "x": 0
      };
      if (!person1.keypoints.find(kpt => kpt.part === "leftEar")) {

        if(person1.keypoints.find(kpt => kpt.part === "rightEar")){
          rea = person1.keypoints.filter(kpt => kpt.part === "rightEar")[0]
          .position; // current position of left ear
        }
      } else {

        lea = person1.keypoints.filter(kpt => kpt.part === "leftEar")[0]
        .position; // current position of right ear
      }

      // 2D image points. If you change the image, you need to change vector
      [
        ns.x,
        ns.y, // Nose tip
        ns.x,
        ns.y, // Nose tip (see HACK! above)

        le.x,
        le.y, // Left eye left corner
        re.x,
        re.y, // Right eye right corner

        lea.x,
        lea.y,
        rea.x,
        rea.y
      ].map((v, i) => {
        imagePoints.data64F[i] = v;
      });


      const distToLeftEyeX = Math.abs(le.x - ns.x);
      const distToRightEyeX = Math.abs(re.x - ns.x);


      // Consider nose positions as the movements of cursor
      window.nose_x = (window.nose_x === -1)? ns.x:window.nose_x
      let diff_x = ns.x-window.nose_x;
      window.nose_x  = ns.x;

      // Normalize nose movements on direction of both x and y axis
      let norm_x = ns.x - (re.x);
      let norm_y = ns.y - (lea.y + rea.y);

      if(norm_y < window.y_bound[0]) window.y_bound[0] = norm_y
      if(norm_y > window.y_bound[1]) window.y_bound[1] = norm_y

      if(Math.abs(distToRightEyeX - distToLeftEyeX) <3){
        let temp = Math.floor(Math.abs(re.x-le.x));

        if(Math.abs(window.eye_dis - temp) >5){window.eye_dis = temp;}

      }

      let slope = 200/(window.eye_dis/1+35)
      let offset = 35*slope;

      window.cursor_pos[0] = Math.max(Math.min(window.cursor_pos[0]+diff_x,200),0);
      window.cursor_pos[1] = Math.max(Math.min(norm_y*slope+offset,200),0);


      if(move_list.length <= 20){
        move_list.push([Math.floor(window.cursor_pos[0]),Math.floor(window.cursor_pos[1])]);
      }else{
        move_list.shift();
        move_list.push([Math.floor(window.cursor_pos[0]),Math.floor(window.cursor_pos[1])]);
      }

      //draw line in canvas
      var ctx = document.getElementById("myCanvas").getContext("2d");
      draw(ctx,move_list);
    }
  });

  const params$ = xs.of({
    singlePoseDetection: { minPoseConfidence: 0.2 },
    output: {
      showVideo: false,
      showSkeleton: false,
      showPoints: false,
    },
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

// Show the area of play/pause button
function draw_play(ctx,pos,rgba,linewidth,check_play){

  ctx.strokeStyle = rgba;
  ctx.lineWidth = linewidth;
  if(!check_play){
    ctx.beginPath();
    ctx.moveTo(pos[0],pos[1]);
    ctx.lineTo(pos[0]+10,pos[1]+10);
    ctx.lineTo(pos[0],pos[1]+20);
    ctx.fill();
    ctx.closePath();

  }else{
    ctx.beginPath();
    ctx.moveTo(pos[0],pos[1]);
    ctx.lineTo(pos[0],pos[1]+20);
    ctx.moveTo(pos[0]+10,pos[1]);
    ctx.lineTo(pos[0]+10,pos[1]+20);
    ctx.stroke();
    ctx.closePath();
  }
}

// Show the area of moving forward/backward buttons
function draw_fb(ctx,pos,rgba,linewidth,forward){
  ctx.strokeStyle = rgba;
  ctx.lineWidth = linewidth;
  if(forward){
    ctx.beginPath();
    ctx.moveTo(pos[0],pos[1]);
    ctx.lineTo(pos[0]+5,pos[1]+5);
    ctx.lineTo(pos[0],pos[1]+10);

    ctx.moveTo(pos[0]+5,pos[1]);
    ctx.lineTo(pos[0]+10,pos[1]+5);
    ctx.lineTo(pos[0]+5,pos[1]+10);
    ctx.stroke();
    ctx.closePath();
  }else{
    ctx.beginPath();
    ctx.moveTo(pos[0],pos[1]);
    ctx.lineTo(pos[0]-5,pos[1]+5);
    ctx.lineTo(pos[0],pos[1]+10);

    ctx.moveTo(pos[0]+5,pos[1]);
    ctx.lineTo(pos[0],pos[1]+5);
    ctx.lineTo(pos[0]+5,pos[1]+10);
    ctx.stroke();
    ctx.closePath();
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

// Main draw function
function draw(ctx,move_list) {
    ctx.clearRect(0, 0, 200, 200);
    let player = window.player;

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

    for(let i=0;i<move_list.length-4;i++){
      draw_line(ctx,move_list[i],move_list[i+1],'rgba(0, 0, 0, 1)',2);
    }

    let cur_cursor = [0,0]
    if(move_list.length>=3){
      for (let i =1; i <= 3; i++){
        //move_list[move_list.length-1][1]];
        cur_cursor[0] += move_list[move_list.length-i][0];
        cur_cursor[1] += move_list[move_list.length-i][1];
      }
      cur_cursor[0] /= 3;
      cur_cursor[1] /= 3;
    }else{
      cur_cursor = [move_list[move_list.length-1][0],move_list[move_list.length-1][1]];
    }

    ctx.fillStyle = 'rgba(0, 0, 200, 1)';
    ctx.fillRect(cur_cursor[0]-5,cur_cursor[1]-5,10,10);

    window.new_rot[0] = Math.PI/200.0 * cur_cursor[1] - Math.PI/2;
    window.new_rot[1] = Math.PI/200.0 * cur_cursor[0] - Math.PI/2

    up_trig.check_in(cur_cursor)
    if(up_trig.triggered === false ){
      let reset_flag = true;
      for(let i=0;i<move_list.length-1;i++){
        if(move_list[i][1] !== 0){
          reset_flag = false;
          break;
        }
      }
      if(reset_flag){
        window.cursor_pos[0] = 100;
      }
    }

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
      if(player.getPlayerState()!=1){
          player.playVideo();
      }else{
          player.pauseVideo();
      }
      reset_buttons();
    }

    if(up_trig.triggered && right_trig.check_in(cur_cursor)) {
      player.seekTo(player.getCurrentTime()+15);
      reset_buttons();
    }


    if(up_trig.triggered && left_trig.check_in(cur_cursor)) {
      player.seekTo(player.getCurrentTime()-15);
      reset_buttons();
    }

    //draw feedforward trace to trigger buttons in dofferent regions

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


    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    if(up_trig.triggered === false){
      //ctx.fillStyle
      ctx.strokeRect(85,0,30,30);
      draw_line(ctx,cur_cursor,up_trig.pos, 'rgba(0, 255, 0, 0.5)',10);
    }else{
      draw_play(ctx,[100,180],'rgba(0, 0, 0, 1)',4,(player.getPlayerState()==1));
      draw_fb(ctx,[185,100],'rgba(0, 0, 0, 1)',2,true);
      draw_fb(ctx,[10,100],'rgba(0, 0, 0, 1)',2,false);
      ctx.strokeRect(180,0,20,200);
      ctx.strokeRect(0,0,20,200);
      ctx.strokeRect(20,180,160,20);

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
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
