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
Open chrome, and type `localhost:8000` in the address bar. 

## Commands detail
### Default screen
Open Control Box:
Move cursor to the upper middle square 

Reset cursor postion (x-axis):
Move cursor to the reset line and wait for few seconds (all black feedback line is gone)

### Control Screen
Pause/ Play Video:
Move cursor to the bottom box

Forward/ Backward 15 seconds:
Move cursor to the right/left box

Close Control Screen:
Slightly shake your head without touching the left/right box. <br />


### Feedforward Color code:
Green: When only one command is possible. <br />
Yellow: Multiple possible command.<br />
Red: Move to that direction to close control screen






