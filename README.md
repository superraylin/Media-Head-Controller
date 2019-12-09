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
change youtube videos
[video-change](media/change_video.gif)

### Default screen
**Open Control Box:** Move cursor to the upper middle square   <br />
[open-control](media/open_control.gif)
**Reset cursor postion (x-axis):** Move cursor to the reset line and wait for few seconds (all black feedback line is gone)<br />

### Control Screen
**Pause/ Play Video:**
Move cursor to the bottom box<br />
[pause-play](media/play_pause.gif)
**Forward/ Backward 15 seconds:**
Move cursor to the right/left box<br />
[f-b](media/forward_backward.gif)
**Close Control Screen:**
Slightly shake your head without touching the left/right box. <br />
[close-box](media/cancel.gif)


### Feedforward Color code:
**Green:** When only one command is possible. <br />
**Yellow:** Multiple possible command.<br />
**Red:** Move to that direction to close control screen, triggered only when the cursor are close to left or right side






