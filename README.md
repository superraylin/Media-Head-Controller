# Media Head Controller

This project is building on top of this [git repository](https://github.com/mjyc/head-pose-estimation-demo)

## Build and Run this program
### Build
`git clone ` the repository <br />
make sure Node.js is installed <br />
Run `npm start` in the folder

### Run 
After the program is compiled successfully, <br />
Open `host.commnd` if you are using MaxOS, or open `host.bat` if you are using Windows.
(If the access of above files is denied, try `chmod 777 host.command` or `chomod 777 host.bat`) <br />
Open chrome, and type `localhost:8000` in the address bar. <br />  <br />  <br />





## Commands detail
**change youtube videos** <br/>
<img src="https://github.com/superraylin/Media-Head-Controller/blob/master/media/change_video.gif" width="300" height ="200">
<br />
<br />
### Default screen
**Open Control Box:** Move cursor to the upper middle square   <br />
<img src="https://github.com/superraylin/Media-Head-Controller/blob/master/media/open_control.gif" width="300" height ="200">
<br />
<br />
**Reset cursor postion (x-axis):** Move cursor to the reset line and wait for few seconds (all black feedback line is gone)<br />
<br />
<br />
<br />
### Control Screen
**Pause/ Play Video:**
Move cursor to the bottom box<br />
<img src="https://github.com/superraylin/Media-Head-Controller/blob/master/media/play_pause.gif" width="300" height ="200"><br />
<br />
**Forward/ Backward 15 seconds:**
Move cursor to the right/left box<br />
<img src="https://github.com/superraylin/Media-Head-Controller/blob/master/media/forward_backward.gif" width="300" height ="200">
<br />
<br />
**Close Control Screen:**
Slightly shake your head without touching the left/right box. <br />
<img src="https://github.com/superraylin/Media-Head-Controller/blob/master/media/cancel.gif" width="300" height ="200">
<br />
<br />

### Feedforward Color code:
**Green:** When only one command is possible. <br />
**Yellow:** Multiple possible command.<br />
**Red:** Move to that direction to close control screen, triggered only when the cursor are close to left or right side






